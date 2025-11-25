import { processOrders } from "@/lib/worker"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const result = await processOrders(75)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Worker error:", error)
    return NextResponse.json({ success: false, error: "Worker failed" }, { status: 500 })
  }
}
