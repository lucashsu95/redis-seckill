import { config } from "dotenv"
config()
import { redis, keys } from "../lib/redis"

import { processOrders } from "../lib/worker"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function runWorkerLoop() {
  while (true) {
    try {
      const result = await processOrders(75)

      if (result.processed <= 0) {
        await delay(500)
      }
    } catch (error) {
      await delay(2000)
    }
  }
}

async function init() {
  try {
    await redis.xgroup(
      keys.ordersStream,
      {
        type: "CREATE",
        group: "order-workers",
        id: "0",
        options: { MKSTREAM: true }
      }
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