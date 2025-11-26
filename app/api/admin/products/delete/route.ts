import { redis, keys } from "@/lib/redis"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(req: NextRequest) {
  try {
    const { productId } = await req.json()

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 })
    }

    const productKey = keys.product(productId)
    const exists = await redis.exists(productKey)

    if (!exists) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const pipeline = redis.pipeline()
    pipeline.del(productKey)
    pipeline.del(keys.productStock(productId))

    pipeline.zrem(keys.leaderboard, productId)

    await pipeline.exec()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete product error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 })
  }
}
