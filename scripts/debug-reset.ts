import { config } from "dotenv"
config({ path: ".env.local" })
import { redis, keys } from "../lib/redis"

async function scanDelete(pattern: string) {
  let cursor: number | string = 0;
  const keys: string[] = [];

  do {
    const [nextCursor, foundKeys]: [number | string, string[]] = await redis.scan(cursor, {
      match: pattern,
      count: 1000
    });

    cursor = nextCursor;
    keys.push(...foundKeys);

  } while (Number(cursor) !== 0);

  return keys;
}

async function run() {
  try {
    console.log("Starting reset debug...")
    await redis.ping()
    console.log("Redis connection successful")

    const pipeline = redis.pipeline()

    pipeline.del(keys.ordersStream)
    pipeline.del(keys.ordersIndex)
    pipeline.del(keys.leaderboard)

    const orderKeys = await scanDelete("order:*")
    if (orderKeys.length > 0) {
      pipeline.del(...orderKeys)
    }

    const userOrderKeys = await scanDelete("user:*:orders")
    if (userOrderKeys.length > 0) {
      pipeline.del(...userOrderKeys)
    }

    console.log("Executing pipeline...")
    const results = await pipeline.exec()
    console.log("Pipeline executed successfully", results)

  } catch (error) {
    console.error("Debug script error:", error)
  }
}

run()
