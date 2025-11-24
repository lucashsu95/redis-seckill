import { redis, keys } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Clear existing data (optional, be careful in prod)
    // await redis.flushdb()

    const products = [
      {
        id: "p1",
        name: "Gaming Laptop 2025",
        price: 1299,
        image: "/modern-laptop-workspace.png",
        stock: 50,
      },
      {
        id: "p2",
        name: "Wireless Noise Canceling Headphones",
        price: 299,
        image: "/diverse-people-listening-headphones.png",
        stock: 100,
      },
      {
        id: "p3",
        name: "Smart Watch Series X",
        price: 399,
        image: "/modern-smartwatch.png",
        stock: 20,
      },
      {
        id: "p4",
        name: "4K Ultra HD Monitor",
        price: 450,
        image: "/computer-monitor.png",
        stock: 5, // Low stock for testing
      },
    ]

    const pipeline = redis.pipeline()

    for (const p of products) {
      // Store product details as JSON or Hash.
      // Using JSON for flexibility as requested.
      pipeline.json.set(keys.product(p.id), "$", p)

      // Initialize stock separately for atomic operations
      pipeline.set(keys.productStock(p.id), p.stock)
    }

    await pipeline.exec()

    return NextResponse.json({ success: true, message: "Seeded products" })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ success: false, error: "Failed to seed" }, { status: 500 })
  }
}
