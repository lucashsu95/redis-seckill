import { redis, keys } from "@/lib/redis"
import { type NextRequest, NextResponse } from "next/server"
import type { Order } from "@/lib/worker"

export async function DELETE(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
    }

    const orderData = await redis.json.get(keys.order(orderId))

    if (!orderData) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const order = orderData as Order

    const pipeline = redis.pipeline()

    pipeline.zrem(keys.ordersIndex, orderId)

    pipeline.zrem(keys.userOrders(order.userId), orderId)

    pipeline.zincrby(keys.leaderboard, -order.price, order.productId)

    pipeline.json.del(keys.order(orderId))

    pipeline.incr(keys.productStock(order.productId))

    await pipeline.exec()

    return NextResponse.json({ success: true, message: "Order deleted successfully" })
  } catch (error) {
    console.error("Delete order error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 })
  }
}
