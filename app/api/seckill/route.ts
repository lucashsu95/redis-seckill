import { attemptSeckill } from "@/lib/seckill"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { userId, productId, price } = await req.json()

    if (!userId || !productId || !price) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 })
    }

    const result = await attemptSeckill(userId, productId, price)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Seckill error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
