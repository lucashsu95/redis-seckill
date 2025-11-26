"use client"

import { useEffect, useState } from "react"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { getUserOrdersAction } from "@/lib/actions/order.actions"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem("seckill_user_id")
    if (!userId) {
      setLoading(false)
      return
    }

    getUserOrdersAction(userId)
      .then((data) => {
        if (data.success && data.orders) {
          setOrders(data.orders)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-orange-950 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">我的訂單</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base font-medium">訂單 #{order.id.slice(0, 8)}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">產品編號: {order.productId}</p>
                    <p className="font-bold">${order.price}</p>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {order.status}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">還沒有訂單。</p>
          <Link href="/">
            <Button variant="link">開始購物</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
