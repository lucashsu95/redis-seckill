import { getLeaderboard, getProducts } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export async function Leaderboard() {
  const [rankings, products] = await Promise.all([
    getLeaderboard(),
    getProducts(), // Need this to map ID to Name
  ])

  // Create lookup map
  const productMap = new Map(products.map((p) => [p.id, p]))

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-orange-900">熱銷榜</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {rankings.map((rank, i) => {
            const product = productMap.get(rank.productId)
            if (!product) return null
            return (
              <li key={rank.productId} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-200 text-orange-800 text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-orange-950">{product.name}</p>
                  <p className="text-xs text-orange-700">${rank.revenue.toLocaleString()} 收入</p>
                </div>
              </li>
            )
          })}
          {rankings.length === 0 && <p className="text-sm text-muted-foreground italic">還沒有銷售紀錄。</p>}
        </ul>
      </CardContent>
    </Card>
  )
}
