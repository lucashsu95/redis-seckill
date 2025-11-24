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
  // Index signature to allow Redis JSON storage
  [key: string]: string | number | undefined
}

export async function processOrders(batchSize = 10) {
  // Read from the stream
  // Using '0' to read from the beginning, or '$' for new.
  // For a worker that processes backlog, we want to read everything.
  // In a real app, we'd track the last ID processed.
  // Here, we'll read and then delete processed messages to keep it simple.

  const streamData = (await redis.xread(keys.ordersStream, "0", {
    count: batchSize,
  })) as XReadResult

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

    // Parse fields array ["key", "value", ...]
    const data: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1]
    }

    const { userId, productId, orderId, price, timestamp } = data

    if (!orderId || !userId || !productId) {
      // Invalid message, just delete it
      pipeline.xdel(keys.ordersStream, messageId)
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

    // 1. Store Order Details (JSON)
    pipeline.json.set(keys.order(orderId), "$", order)

    // 2. Add to Global Index (ZSet)
    pipeline.zadd(keys.ordersIndex, { score: order.createdAt, member: orderId })

    // 3. Add to User Index (ZSet)
    pipeline.zadd(keys.userOrders(userId), { score: order.createdAt, member: orderId })

    // 4. Update Leaderboard (ZSet) - Revenue based ranking
    pipeline.zincrby(keys.leaderboard, order.price, productId)

    // 5. Delete from stream to prevent reprocessing (simple queue pattern)
    pipeline.xdel(keys.ordersStream, messageId)

    processedIds.push(orderId)
  }

  // Execute all writes atomically
  await pipeline.exec()

  return { processed: processedIds.length, orderIds: processedIds }
}
