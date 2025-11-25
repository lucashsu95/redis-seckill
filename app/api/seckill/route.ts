export const runtime = 'edge';

import { attemptSeckill } from "@/lib/seckill"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { userId, productId, price } = await req.json()

    if (!userId || !productId || !price) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 })
    }

    const result = await attemptSeckill(userId, productId, price)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json({ success: false, error: "Product sold out or duplicate purchase" }, { status: 409 })
    }
    
  } catch (error) {
    console.error("Seckill error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}