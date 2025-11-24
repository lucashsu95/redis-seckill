"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Package } from "lucide-react"
import { toast } from "sonner"

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/orders/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("訂單已刪除", {
          description: "訂單已刪除並恢復庫存。",
        })
        setOpen(false)
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "刪除訂單失敗",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "刪除訂單失敗",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>刪除訂單</DialogTitle>
          <DialogDescription>確定要刪除訂單嗎？此操作將刪除訂單並恢復1個庫存。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CreateProductDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    price: "",
    image: "",
    stock: "",
  })
  const router = useRouter()

  const handleCreate = async () => {
    if (!formData.id || !formData.name || !formData.price || !formData.stock) {
      toast.error("Error", {
        description: "請填寫所有必填欄位",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("商品已新增", {
          description: `${formData.name} 已加入庫存。`,
        })
        setOpen(false)
        setFormData({ id: "", name: "", price: "", image: "", stock: "" })
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "新增商品失敗",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "新增商品失敗",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4 cursor-pointer" />
          新增商品
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增商品</DialogTitle>
          <DialogDescription>新增商品到庫存。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="id">商品 ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="p5"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">商品名稱 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Product Name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">價格 *</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="99"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stock">初始庫存 *</Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">圖片 URL (可選)</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="/product-image.png"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "新增中..." : "新增商品"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RestockButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const router = useRouter()

  const handleRestock = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Error", {
        description: "請輸入有效的數量",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/products/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, amount: Number(amount) }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("庫存已更新", {
          description: `已新增 ${amount} 個。新庫存: ${data.newStock}`,
        })
        setOpen(false)
        setAmount("")
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "補貨失敗",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "補貨失敗",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent cursor-pointer">
          <Package className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>補貨</DialogTitle>
          <DialogDescription>為商品 {productId} 補充庫存。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">補充數量</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              min="1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleRestock} disabled={loading}>
            {loading ? "補貨中..." : "補貨"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/products/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("商品已刪除", {
          description: `${productName} 已從庫存中刪除。`,
        })
        setOpen(false)
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "刪除商品失敗",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "刪除商品失敗",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>刪除商品</DialogTitle>
          <DialogDescription>
            您確定要刪除 "{productName}"？此操作無法撤銷。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "刪除中..." : "刪除商品"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
