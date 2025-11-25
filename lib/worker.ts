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

export async function processOrders(batchSize = 50) {
  const groupName = "order-group"
  const consumerName = `worker-${process.pid}`

  const streamData = (await redis.xreadgroup(
    groupName,
    consumerName,
    [keys.ordersStream],
    [">"],
    {
      count: batchSize
    }
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
    const fields = message[1]

    const data: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1]
    }

    const { userId, productId, orderId, price, timestamp } = data

    if (!orderId || !userId || !productId) {
      continue
    }

    const order: Order = {
      id: orderId,
      userId,
      productId,
      price: Number.parseFloat(price),
      status: "completed",
      createdAt: Number.parseInt(timestamp),
      processedAt: Date.now(),
    }

    const orderJson = JSON.stringify(order)
    pipeline.set(keys.order(orderId), orderJson)

    pipeline.zadd(keys.ordersIndex, { score: order.createdAt, member: orderId })
    pipeline.zadd(keys.userOrders(userId), { score: order.createdAt, member: orderId })
    pipeline.zincrby(keys.leaderboard, order.price, productId)

    processedIds.push(orderId)
  }

  await pipeline.exec()

  const messageIdsToAck = messages.map(([messageId]) => messageId);

  if (messageIdsToAck.length > 0) {
    await redis.xack(keys.ordersStream, groupName, ...(messageIdsToAck as string[]));
  }

  return { processed: processedIds.length, orderIds: processedIds }
}
