import { redis, keys } from "@/lib/redis"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { productId, amount } = await req.json()

    if (!productId || amount === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const addAmount = Number(amount)

    if (addAmount <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be positive" }, { status: 400 })
    }

    // Check if product exists
    const exists = await redis.exists(keys.product(productId))
    if (!exists) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    // Increment stock atomically
    const newStock = await redis.incrby(keys.productStock(productId), addAmount)

    return NextResponse.json({
      success: true,
      message: `Added ${addAmount} units to inventory`,
      newStock,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to restock product" }, { status: 500 })
  }
}
