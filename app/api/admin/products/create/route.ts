import { redis, keys } from "@/lib/redis"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { id, name, price, image, stock } = await req.json()

    if (!id || !name || price === undefined || stock === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Check if product already exists
    const existing = await redis.exists(keys.product(id))
    if (existing) {
      return NextResponse.json({ success: false, error: "Product ID already exists" }, { status: 400 })
    }

    const product = {
      id,
      name,
      price: Number(price),
      image: image || "/placeholder.svg?height=400&width=400",
      stock: Number(stock),
    }

    const pipeline = redis.pipeline()

    // Store product details
    pipeline.json.set(keys.product(id), "$", product)

    // Initialize stock
    pipeline.set(keys.productStock(id), stock)

    await pipeline.exec()

    return NextResponse.json({ success: true, message: "Product created successfully", product })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 })
  }
}
