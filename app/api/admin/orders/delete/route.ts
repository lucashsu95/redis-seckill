import { redis, keys } from "@/lib/redis"
import { type NextRequest, NextResponse } from "next/server"
import type { Order } from "@/lib/worker"

export async function DELETE(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
    }

    // Fetch the order details first
    const orderData = await redis.json.get(keys.order(orderId))

    if (!orderData) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const order = orderData as Order

    // Use pipeline to delete order atomically
    const pipeline = redis.pipeline()

    // Remove from global orders index
    pipeline.zrem(keys.ordersIndex, orderId)

    // Remove from user's orders
    pipeline.zrem(keys.userOrders(order.userId), orderId)

    // Remove from leaderboard (decrease revenue)
    pipeline.zincrby(keys.leaderboard, -order.price, order.productId)

    // Delete the order JSON
    pipeline.json.del(keys.order(orderId))

    // Restore stock (add back 1)
    pipeline.incr(keys.productStock(order.productId))

    await pipeline.exec()

    return NextResponse.json({ success: true, message: "Order deleted successfully" })
  } catch (error) {
    console.error("Delete order error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete order" }, { status: 500 })
  }
}
