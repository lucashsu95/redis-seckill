import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const POOL_SIZE = 5; 

const redisPool: Redis[] = [];

for (let i = 0; i < POOL_SIZE; i++) {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on("error", (err: Error) => {
    console.error(`Redis client ${i} error:`, err);
  });
  
  redisPool.push(client);
}

let poolIndex = 0;

export const getRedisClient = (): Redis => {
  const client = redisPool[poolIndex];
  poolIndex = (poolIndex + 1) % POOL_SIZE;
  return client;
};

export const keys = {
  product: (id: string) => `product:${id}`,
  productStock: (id: string) => `product:${id}:stock`,
  ordersStream: "orders:stream",
  order: (id: string) => `order:${id}`,
  ordersIndex: "orders:index",
  userOrders: (userId: string) => `user:${userId}:orders`,
  leaderboard: "leaderboard:sales",
};