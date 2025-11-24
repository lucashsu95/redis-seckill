import { getProducts } from "@/lib/data"
import { ProductCard } from "@/components/product-card"
import { Leaderboard } from "@/components/leaderboard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShoppingBag, ShieldCheck } from "lucide-react"

// Force dynamic to see stock updates on refresh
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
            <span className="font-bold text-xl">RedisSeckill</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                My Orders
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
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Flash Sale Live</h1>
              <p className="text-muted-foreground text-lg">
                High performance seckill system powered by Redis. Grab the deals before they're gone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {products.length === 0 && (
              <div className="p-12 border rounded-lg bg-muted/50 text-center">
                <h3 className="text-lg font-medium mb-2">No active sales</h3>
                <p className="text-muted-foreground mb-4">The system needs to be seeded with products.</p>
                <form action="/api/seed" method="POST">
                  <Button>Seed Demo Products</Button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Leaderboard />

            <div className="bg-slate-900 text-slate-50 p-6 rounded-xl">
              <h3 className="font-bold mb-2">System Architecture</h3>
              <ul className="text-sm space-y-2 text-slate-300 list-disc pl-4">
                <li>Redis Strings for Inventory</li>
                <li>Lua Scripts for Atomicity</li>
                <li>Redis Streams for Queuing</li>
                <li>Pipelines for Batch Writes</li>
                <li>ZSets for Indexing & Ranking</li>
                <li>AOF Persistence Enabled</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Built with Next.js + Upstash Redis
        </div>
      </footer>
    </div>
  )
}
