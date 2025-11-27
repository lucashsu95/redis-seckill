import { getRedisClient, keys } from "./redis"
import { Order } from "./types"

type StreamEntry = [string, string[]]
type StreamResult = [string, StreamEntry[]]
type XReadResult = StreamResult[] | null

const GROUP = "order-workers"

export async function processOrders(batchSize = 200) {
  const consumerName = `worker-${process.pid}`

  const redis = getRedisClient()
  const streamData = (await redis.xreadgroup(
    "GROUP",
    GROUP,
    consumerName,
    "COUNT",
    batchSize,
    "STREAMS",
    keys.ordersStream,
    ">"
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
  const productSalesMap = new Map<string, number>();

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

    pipeline.call("JSON.SET", keys.order(orderId), "$", JSON.stringify(order))

    pipeline.zadd(keys.ordersIndex, order.createdAt, orderId)

    pipeline.zadd(keys.userOrders(userId), order.createdAt, orderId)

    const currentSales = productSalesMap.get(productId) || 0;
    productSalesMap.set(productId, currentSales + order.price);

    pipeline.xack(keys.ordersStream, GROUP, messageId)

    processedIds.push(orderId)
  }

  for (const [productId, totalSales] of productSalesMap.entries()) {
    pipeline.zincrby(keys.leaderboard, totalSales, productId)
  }

  await pipeline.exec()

  return { processed: processedIds.length, orderIds: processedIds }
}
