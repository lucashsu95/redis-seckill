// Load environment variables from .env.local before any other imports
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(__dirname, "../.env.local") })

import { processOrders } from "../lib/worker"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function runWorkerLoop() {
  console.log("🚀 Worker process started. Monitoring Redis Stream...")

  while (true) {
    try {
      const result = await processOrders(10)

      if (result.processed > 0) {
        console.log(`✅ Successfully processed ${result.processed} orders.`)
      } else {
        await delay(500)
      }
    } catch (error) {
      console.error("❌ Worker encountered a critical error:", error)
      // 發生錯誤時，等待久一點再嘗試重連
      await delay(2000)
    }
  }
}

runWorkerLoop()