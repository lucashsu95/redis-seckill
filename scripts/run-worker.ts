// Load environment variables from .env.local before any other imports
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(__dirname, "../.env.local") })

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

runWorkerLoop()