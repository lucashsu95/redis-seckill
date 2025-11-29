import { redis, keys } from "./redis"
import { Order } from "./types"

type StreamEntry = [string, string[]]
type StreamResult = [string, StreamEntry[]]
type XReadResult = StreamResult[] | null

const GROUP = "order-workers"

export async function processOrders(batchSize = 200) {
  const consumerName = 'vercel-cron-worker';

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

    // Transaction per message for atomicity
    // @ts-ignore
    pipeline.call("MULTI")
    pipeline.set(keys.order(orderId), JSON.stringify(order))
    pipeline.lpush(keys.userOrders(userId), orderId)
    pipeline.zadd(keys.ordersIndex, { score: order.createdAt, member: orderId })
    pipeline.zincrby(keys.leaderboard, 1, productId)
    // @ts-ignore
    pipeline.call("EXEC")

    pipeline.xack(keys.ordersStream, GROUP, messageId)

    processedIds.push(orderId)
  }

  await pipeline.exec()

  return { processed: processedIds.length, orderIds: processedIds }
}
