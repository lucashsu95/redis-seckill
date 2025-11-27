"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function SeedButton() {
  const router = useRouter()

  const seedProducts = async () => {
    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
      });
      if (response.ok) {
        toast.success("成功新增商品", {
          description: "商品已成功新增到庫存。",
        })
        router.refresh()
      } else {
        console.error('Failed to seed data:', response.statusText);
        toast.error("新增商品失敗", {
          description: response.statusText,
        })
      }
    } catch (error: any) {
      toast.error("新增商品失敗", {
        description: error.message,
      })
    }
  }

  return (
    <Button onClick={seedProducts}>種子腳本</Button>
  )
}
