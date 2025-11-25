import { redis, keys } from "./redis"

type StreamEntry = [string, string[]]
type StreamResult = [string, StreamEntry[]]
type XReadResult = StreamResult[] | null

export interface Order {
  id: string
  userId: string
  productId: string
  price: number
  status: "pending" | "completed" | "failed"
  createdAt: number
  processedAt?: number
  [key: string]: string | number | undefined
}

const GROUP = "order-workers"

export async function processOrders(batchSize = 10) {
  const consumerName = `worker-${process.pid}`

  // XREADGROUP: 搶任務
  const streamData = (await redis.xreadgroup(
    GROUP,
    consumerName,
    [keys.ordersStream],
    [">"],
    { count: batchSize }
  )) as XReadResult

  if (!streamData || streamData.length === 0) {
    return { processed: 0, message: "No orders to process" }
  }

  const messages = streamData[0][1]
  if (messages.length === 0) {
    return { processed: 0, message: "No orders to process" }
  }

  const pipeline = redis.pipeline()
  const processedIds: string[] = []

  for (const message of messages) {
    const messageId = message[0]
    const fields = message[1]

    const data: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1]
    }

    const { userId, productId, orderId, price, timestamp } = data

    if (!orderId || !userId || !productId) {
      pipeline.xack(keys.ordersStream, GROUP, messageId)
      continue
    }

    const order: Order = {
      id: orderId,
      userId,
      productId,
      price: Number(price),
      status: "completed",
      createdAt: Number(timestamp),
      processedAt: Date.now(),
    }

    // 寫入實體資料
    pipeline.json.set(keys.order(orderId), "$", order)

    // 全域索引
    pipeline.zadd(keys.ordersIndex, { score: order.createdAt, member: orderId })

    // 用戶索引
    pipeline.zadd(keys.userOrders(userId), { score: order.createdAt, member: orderId })

    // 排行榜
    pipeline.zincrby(keys.leaderboard, order.price, productId)

    // 標記該訊息完成（**不能 XDEL，否則 group 會壞掉**）
    pipeline.xack(keys.ordersStream, GROUP, messageId)

    processedIds.push(orderId)
  }

  await pipeline.exec()

  return { processed: processedIds.length, orderIds: processedIds }
}
