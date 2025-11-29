import { getProducts } from "@/lib/data"
import { ProductCard } from "@/components/product-card"
import { Leaderboard } from "@/components/leaderboard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShoppingBag, ShieldCheck } from "lucide-react"
import { SeedButton } from "@/components/seed-button"

export const dynamic = "force-dynamic"

export default async function Home() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">R</span>
            </div>
            <span className="font-bold text-xl">Redis秒殺系統</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="cursor-pointer">
                <ShieldCheck className="h-4 w-4 mr-2" />
                管理員專區
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline" size="sm" className="cursor-pointer">
                <ShoppingBag className="h-4 w-4 mr-2" />
                我的訂單
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">秒殺系統</h1>
              <p className="text-muted-foreground text-lg">
                高性能秒殺系統，由 Redis 驅動。在它們消失之前搶購優惠。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {products.length === 0 && (
              <div className="p-12 border rounded-lg bg-muted/50 text-center">
                <h3 className="text-lg font-medium mb-2">沒有活動中的銷售</h3>
                <p className="text-muted-foreground mb-4">系統需要被種子腳本填充。</p>
                <SeedButton />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Leaderboard />
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          建立於 Next.js
        </div>
      </footer>
    </div>
  )
}
