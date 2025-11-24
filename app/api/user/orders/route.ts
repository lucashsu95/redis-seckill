import { getUserOrders } from "@/lib/data"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ orders: [] })
  }

  try {
    const orders = await getUserOrders(userId)
    return NextResponse.json({ orders })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
