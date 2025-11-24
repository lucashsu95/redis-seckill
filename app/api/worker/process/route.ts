import { processOrders } from "@/lib/worker"
import { NextResponse } from "next/server"

// This endpoint triggers the worker to process a batch of orders
// In a real deployment, this would be called by a cron job or external trigger
export async function POST() {
  try {
    const result = await processOrders(50) // Process up to 50 orders per run
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Worker error:", error)
    return NextResponse.json({ success: false, error: "Worker failed" }, { status: 500 })
  }
}
