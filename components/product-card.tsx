"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner" // Assuming sonner is available or use simple alert
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
    // simple user persistence
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
        // Trigger worker processing in background (simulation)
        fetch("/api/worker/process", { method: "POST" })

        toast.success("Order Placed!", {
          description: `Order ID: ${data.orderId}`,
        })
        router.refresh()
      } else {
        // Revert optimistic update on failure
        setOptimisticStock((prev) => prev + 1)
        toast.error("Purchase Failed", {
          description: "Out of stock or system busy.",
        })
      }
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticStock((prev) => prev + 1)
      toast.error("Error", { description: "Something went wrong" })
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
              Sold Out
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
        <p className="text-sm text-muted-foreground mb-4">Limited quantity available. Grab yours before it's gone!</p>
        <div className="flex items-center gap-2 text-sm font-medium">
          <div
            className={`h-2 w-2 rounded-full ${optimisticStock > 10 ? "bg-green-500" : optimisticStock > 0 ? "bg-orange-500" : "bg-red-500"}`}
          />
          {optimisticStock > 0 ? `${optimisticStock} items left` : "Out of stock"}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleBuy} disabled={optimisticStock <= 0 || loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Processing..." : "Buy Now"}
        </Button>
      </CardFooter>
    </Card>
  )
}
