import { getRedisClient, keys } from "@/lib/redis"
import { NextResponse } from "next/server"

export async function POST() {
  try {

    const products = [
      {
        id: "p1",
        name: "2025 年遊戲筆記型電腦",
        price: 1299,
        image: "/modern-laptop-workspace.png",
        stock: 4000,
      },
      {
        id: "p2",
        name: "無線降噪耳機",
        price: 299,
        image: "/diverse-people-listening-headphones.png",
        stock: 3000,
      },
      {
        id: "p3",
        name: "2025 年智能手錶",
        price: 399,
        image: "/modern-smartwatch.png",
        stock: 2000,
      },
      {
        id: "p4",
        name: "4K 超級高清監視器",
        price: 450,
        image: "/computer-monitor.png",
        stock: 600,
      },
    ]

    const redis = getRedisClient()
    const pipeline = redis.pipeline()

    for (const p of products) {
      pipeline.call("JSON.SET", keys.product(p.id), "$", JSON.stringify(p))
      pipeline.set(keys.productStock(p.id), p.stock)
    }

    await pipeline.exec()

    return NextResponse.json({ success: true, message: "Seeded products" })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json({ success: false, error: "Failed to seed" }, { status: 500 })
  }
}
