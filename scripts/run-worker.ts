import { config } from "dotenv"
config({ path: ".env.local" })
import { getRedisClient, keys } from "../lib/redis"

import { processOrders } from "../lib/worker"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function runWorkerLoop() {
  while (true) {
    try {
      const result = await processOrders(100)

      if (result.processed <= 0) {
        await delay(500)
      }
    } catch (error) {
      await delay(2000)
    }
  }
}

async function init() {
  const redis = getRedisClient()
  try {
    await redis.call(
      "XGROUP",
      "CREATE",
      keys.ordersStream,
      "order-workers",
      "0",
      "MKSTREAM"
    )
  } catch (err: any) {
    if (!String(err?.message).includes("BUSYGROUP")) {
      console.error("Failed to create group", err)
    }
  }
}


async function run() {
  await init()

  while (true) {
    await runWorkerLoop()
  }
}
run()