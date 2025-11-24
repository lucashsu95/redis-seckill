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
        toast.success("Order deleted", {
          description: "Order has been removed and stock restored.",
        })
        setOpen(false)
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "Failed to delete order",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to delete order",
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
          <DialogTitle>Delete Order</DialogTitle>
          <DialogDescription>Are you sure? This will delete the order and restore 1 unit of stock.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
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
        description: "Please fill in all required fields",
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
        toast.success("Product created", {
          description: `${formData.name} has been added to inventory.`,
        })
        setOpen(false)
        setFormData({ id: "", name: "", price: "", image: "", stock: "" })
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "Failed to create product",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to create product",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>Add a new product to your inventory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="id">Product ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="p5"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Product Name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="99"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stock">Initial Stock *</Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">Image URL (optional)</Label>
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
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Product"}
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
        description: "Please enter a valid amount",
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
        toast.success("Stock updated", {
          description: `Added ${amount} units. New stock: ${data.newStock}`,
        })
        setOpen(false)
        setAmount("")
        router.refresh()
      } else {
        toast.error("Error", {
          description: data.error || "Failed to restock",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to restock product",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
          <Package className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replenish Stock</DialogTitle>
          <DialogDescription>Add units to inventory for product {productId}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount to Add</Label>
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
            Cancel
          </Button>
          <Button onClick={handleRestock} disabled={loading}>
            {loading ? "Restocking..." : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
