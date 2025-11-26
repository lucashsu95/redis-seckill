import { redis, keys } from "./redis"
import type { Order } from "./types"
import type { RedisJsonMgetResponse } from "./types"
import { extractJsonValues } from "./types"

export interface Product {
  id: string
  name: string
  price: number
  image: string
  stock: number
}

export async function getProducts(): Promise<Product[]> {
  const productKeys: string[] = []
  let cursor: number | string = 0

  do {
    const [nextCursor, foundKeys]: [number | string, string[]] = await redis.scan(cursor, { match: "product:*", count: 100 })
    cursor = nextCursor

    for (const key of foundKeys) {
      if (!key.endsWith(":stock")) {
        productKeys.push(key)
      }
    }
  } while (Number(cursor) !== 0)

  if (productKeys.length === 0) return []

  const productsJSON = (await redis.json.mget(productKeys, "$")) as RedisJsonMgetResponse<Omit<Product, 'stock'>>

  const stockKeys = productKeys.map((k) => `${k}:stock`)
  const stocks = await redis.mget<string[]>(...stockKeys)

  const productDetails = extractJsonValues(productsJSON)
  return productKeys.map((key, index) => {
    return {
      ...productDetails[index],
      stock: stocks[index] ? Number.parseInt(stocks[index]) : 0,
    }
  })
}

export async function getGlobalOrders(page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> {
  const start = (page - 1) * limit
  const end = start + limit - 1

  const total = await redis.zcard(keys.ordersIndex)

  const orderIds = await redis.zrange(keys.ordersIndex, start, end, { rev: true })

  if (orderIds.length === 0) {
    return { orders: [], total }
  }

  const orderKeys = orderIds.map((id) => keys.order(id as string))
  const ordersJSON = (await redis.json.mget(orderKeys, "$")) as RedisJsonMgetResponse<Order>

  const orders = extractJsonValues(ordersJSON)

  return { orders, total }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const orderIds = await redis.zrange(keys.userOrders(userId), 0, -1, { rev: true })

  if (orderIds.length === 0) return []

  const orderKeys = orderIds.map((id) => keys.order(id as string))
  const ordersJSON = (await redis.json.mget(orderKeys, "$")) as RedisJsonMgetResponse<Order>

  return extractJsonValues(ordersJSON)
}

export async function getLeaderboard(): Promise<{ productId: string; revenue: number }[]> {
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

export async function deleteOrder(orderId: string) {
  const orderData = await redis.json.get(keys.order(orderId))

  if (!orderData) {
    throw new Error("Order not found")
  }

  const order = orderData as Order
  const pipeline = redis.pipeline()

  pipeline.zrem(keys.ordersIndex, orderId)
  pipeline.zrem(keys.userOrders(order.userId), orderId)
  pipeline.zincrby(keys.leaderboard, -order.price, order.productId)
  pipeline.json.del(keys.order(orderId))
  pipeline.incr(keys.productStock(order.productId))

  await pipeline.exec()
  
  return true
}

export async function deleteProduct(productId: string) {
  const productKey = keys.product(productId)
  const exists = await redis.exists(productKey)

  if (!exists) {
    throw new Error("Product not found")
  }

  const pipeline = redis.pipeline()
  pipeline.del(productKey)
  pipeline.del(keys.productStock(productId))
  pipeline.zrem(keys.leaderboard, productId)

  await pipeline.exec()

  return true
}