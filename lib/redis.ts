import { Redis } from "@upstash/redis"

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error("KV_REST_API_URL and KV_REST_API_TOKEN must be defined")
}

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

// Keys helper
export const keys = {
  product: (id: string) => `product:${id}`,
  productStock: (id: string) => `product:${id}:stock`,
  ordersStream: "orders:stream",
  order: (id: string) => `order:${id}`, // JSON key
  ordersIndex: "orders:index", // ZSet
  userOrders: (userId: string) => `user:${userId}:orders`, // ZSet
  leaderboard: "leaderboard:sales", // ZSet
}
