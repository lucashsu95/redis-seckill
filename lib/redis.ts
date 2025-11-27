import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
})

// Error handling
redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err)
})

redis.on("connect", () => {
  console.log("Redis connected successfully")
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
