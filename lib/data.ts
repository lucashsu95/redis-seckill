import { redis, keys } from "./redis"
import type { Order } from "./worker"

export interface Product {
  id: string
  name: string
  price: number
  image: string
  stock: number
}

export async function getProducts(): Promise<Product[]> {
  // In a real app, we'd use a Set to track product IDs.
  // For this demo, we'll scan for product keys.
  // Pattern: product:*
  // We need to exclude product:*:stock

  const productKeys: string[] = []
  let cursor = 0

  do {
    const [nextCursor, foundKeys] = await redis.scan(cursor, { match: "product:*", count: 100 })
    cursor = nextCursor

    for (const key of foundKeys) {
      if (!key.endsWith(":stock")) {
        productKeys.push(key)
      }
    }
  } while (cursor !== 0)

  if (productKeys.length === 0) return []

  // Fetch product details
  const productsJSON = await redis.json.mget(productKeys, "$")

  // Fetch current stock for each product
  const stockKeys = productKeys.map((k) => `${k}:stock`)
  const stocks = await redis.mget<string[]>(...stockKeys)

  // Combine data
  return productKeys.map((key, index) => {
    // redis.json.mget returns array of arrays if multiple paths, or just array of results.
    // Here we asked for '$' so it wraps in array.
    const details = (productsJSON[index] as any)[0]
    return {
      ...details,
      stock: stocks[index] ? Number.parseInt(stocks[index]) : 0,
    }
  })
}

export async function getGlobalOrders(page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> {
  const start = (page - 1) * limit
  const end = start + limit - 1

  // Get total count
  const total = await redis.zcard(keys.ordersIndex)

  // Get IDs from ZSet (Reverse to show newest first)
  const orderIds = await redis.zrange(keys.ordersIndex, start, end, { rev: true })

  if (orderIds.length === 0) {
    return { orders: [], total }
  }

  // Fetch Order details
  // Note: JSON.MGET takes keys
  const orderKeys = orderIds.map((id) => keys.order(id as string))
  const ordersJSON = await redis.json.mget(orderKeys, "$")

  const orders = ordersJSON.map((o: any) => o[0] as Order)

  return { orders, total }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const orderIds = await redis.zrange(keys.userOrders(userId), 0, -1, { rev: true })

  if (orderIds.length === 0) return []

  const orderKeys = orderIds.map((id) => keys.order(id as string))
  const ordersJSON = await redis.json.mget(orderKeys, "$")

  return ordersJSON.map((o: any) => o[0] as Order)
}

export async function getLeaderboard(): Promise<{ productId: string; revenue: number }[]> {
  // Get top products by revenue
  // ZRANGE returns ["member", "score", "member", "score"...] if withScores is true
  const result = await redis.zrange(keys.leaderboard, 0, 9, { rev: true, withScores: true })

  const leaderboard = []
  for (let i = 0; i < result.length; i += 2) {
    leaderboard.push({
      productId: result[i] as string,
      revenue: result[i + 1] as number,
    })
  }

  return leaderboard
}
