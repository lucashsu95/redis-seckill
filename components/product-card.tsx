"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    image: string
    stock: number
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState("")
  const [optimisticStock, setOptimisticStock] = useState(product.stock)

  useEffect(() => {
    setOptimisticStock(product.stock)
  }, [product.stock])

  useEffect(() => {
    let stored = localStorage.getItem("seckill_user_id")
    if (!stored) {
      stored = `user_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem("seckill_user_id", stored)
    }
    setUserId(stored)
  }, [])

  const router = useRouter()

  const handleBuy = async () => {
    if (!userId) return
    setLoading(true)
    
    setOptimisticStock((prev) => Math.max(0, prev - 1))

    try {
      const res = await fetch("/api/seckill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId: product.id,
          price: product.price,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("訂單已下單!", {
          description: `訂單 ID: ${data.orderId}`,
        })
        router.refresh()
      } else {
        setOptimisticStock((prev) => prev + 1)
        toast.error("訂單下單失敗", {
          description: "庫存不足或系統忙碌。",
        })
      }
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticStock((prev) => prev + 1)
      toast.error("訂單下單失敗", { description: "某些地方出了問題" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
        {optimisticStock <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-xl uppercase tracking-widest border-2 border-white px-4 py-2">
              售罄
            </span>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            ${product.price}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <p className="text-sm text-muted-foreground mb-4">有限數量供應中。趕緊搶購，售罄即止！</p>
        <div className="flex items-center gap-2 text-sm font-medium">
          <div
            className={`h-2 w-2 rounded-full ${optimisticStock > 10 ? "bg-green-500" : optimisticStock > 0 ? "bg-orange-500" : "bg-red-500"}`}
          />
          {optimisticStock > 0 ? `${optimisticStock} 個` : "售罄"}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleBuy} disabled={optimisticStock <= 0 || loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "處理中..." : "購買"}
        </Button>
      </CardFooter>
    </Card>
  )
}
