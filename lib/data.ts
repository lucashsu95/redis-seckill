import { redis, keys } from "./redis"
import type { CreateProductInput, Order } from "./types"
import type { RedisJsonMgetResponse } from "./types"
import { extractJsonValues, extractJsonValue } from "./types"

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
    const [nextCursor, foundKeys] = (await redis.scan(cursor, "MATCH", "product:*", "COUNT", 100)) as [string, string[]]
    cursor = nextCursor

    for (const key of foundKeys) {
      if (!key.endsWith(":stock")) {
        productKeys.push(key)
      }
    }
  } while (Number(cursor) !== 0)

  if (productKeys.length === 0) return []

  const productsJSON = (await redis.call("JSON.MGET", ...productKeys, "$")) as RedisJsonMgetResponse<Omit<Product, 'stock'>>

  const stockKeys = productKeys.map((k) => `${k}:stock`)
  const stocks = await redis.mget(...stockKeys)

  const productDetails = extractJsonValues<Omit<Product, 'stock'>>(productsJSON)
  return productKeys.map((key, index) => {
    return {
      ...(productDetails[index] || {}),
      stock: stocks[index] ? Number.parseInt(stocks[index]) : 0,
    }
  })
}

export async function getGlobalOrders(page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> {
  const start = (page - 1) * limit
  const end = start + limit - 1

  const total = await redis.zcard(keys.ordersIndex)

  const orderIds = await redis.zrevrange(keys.ordersIndex, start, end)

  if (orderIds.length === 0) {
    return { orders: [], total }
  }

  const orderKeys = orderIds.map((id) => keys.order(id as string))
  const ordersJSON = (await redis.call("JSON.MGET", ...orderKeys, "$")) as RedisJsonMgetResponse<Order>

  const orders = extractJsonValues<Order>(ordersJSON)

  return { orders, total }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const orderIds = await redis.zrevrange(keys.userOrders(userId), 0, -1)

  if (orderIds.length === 0) return []

  const orderKeys = orderIds.map((id) => keys.order(id as string))
  const ordersJSON = (await redis.call("JSON.MGET", ...orderKeys, "$")) as RedisJsonMgetResponse<Order>

  return extractJsonValues<Order>(ordersJSON)
}

export async function getLeaderboard(): Promise<{ productId: string; revenue: number }[]> {
  const result = await redis.zrevrange(keys.leaderboard, 0, 9, "WITHSCORES")

  const leaderboard = []
  for (let i = 0; i < result.length; i += 2) {
    leaderboard.push({
      productId: result[i] as string,
      revenue: Number(result[i + 1]),
    })
  }

  return leaderboard
}

export async function deleteOrder(orderId: string) {
  const orderDataRaw = (await redis.call("JSON.GET", keys.order(orderId))) as string
  const orderData = extractJsonValue<Order>(orderDataRaw)

  if (!orderData) {
    throw new Error("Order not found")
  }

  const order = orderData as Order
  const pipeline = redis.pipeline()

  pipeline.zrem(keys.ordersIndex, orderId)
  pipeline.zrem(keys.userOrders(order.userId), orderId)
  pipeline.zincrby(keys.leaderboard, -order.price, order.productId)
  pipeline.call("JSON.DEL", keys.order(orderId))
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

export async function createProduct(input: CreateProductInput) {
  const { id, name, price, image, stock } = input

  if (!id || !name || price === undefined || stock === undefined) {
    throw new Error("Missing required fields")
  }

  // Check if product already exists
  const existing = await redis.exists(keys.product(id))
  if (existing) {
    throw new Error("Product ID already exists")
  }

  const product = {
    id,
    name,
    price: Number(price),
    image: image || "/placeholder.svg?height=400&width=400",
    stock: Number(stock),
  }

  const pipeline = redis.pipeline()

  pipeline.call("JSON.SET", keys.product(id), "$", JSON.stringify(product))

  pipeline.set(keys.productStock(id), stock)

  await pipeline.exec()

  return product
}

export async function restockProduct(productId: string, amount: number) {
  if (!productId || amount === undefined) {
    throw new Error("Missing required fields")
  }

  const addAmount = Number(amount)

  if (addAmount <= 0) {
    throw new Error("Amount must be positive")
  }

  const exists = await redis.exists(keys.product(productId))
  if (!exists) {
    throw new Error("Product not found")
  }

  const newStock = await redis.incrby(keys.productStock(productId), addAmount)

  return newStock
}