import { NextResponse } from "next/server"
import { redis, keys } from "@/lib/redis"

export const dynamic = "force-dynamic"

interface VerificationResult {
  success: boolean
  timestamp: string
  checks: {
    name: string
    passed: boolean
    details: string
    expected?: number
    actual?: number
  }[]
  summary: {
    totalOrders: number
    totalLeaderboardSales: number
    productsChecked: number
  }
}

export async function GET() {
  try {
    const checks = []

    // Check 1: Total orders count
    const totalOrders = await redis.zcard(keys.ordersIndex)

    // Check 2: Total leaderboard sales (sum of all scores)
    const leaderboardData = await redis.zrange(keys.leaderboard, 0, -1, { withScores: true })
    let totalLeaderboardSales = 0
    for (let i = 1; i < leaderboardData.length; i += 2) {
      totalLeaderboardSales += leaderboardData[i] as number
    }

    // Check 3: Orders total should equal leaderboard total
    const ordersMatchLeaderboard = totalOrders === totalLeaderboardSales
    checks.push({
      name: "Orders vs Leaderboard Consistency",
      passed: ordersMatchLeaderboard,
      details: ordersMatchLeaderboard
        ? "Total orders matches leaderboard sales count"
        : "MISMATCH: orders count does not match leaderboard sales",
      expected: totalOrders,
      actual: totalLeaderboardSales,
    })

    // Check 4: Verify each product's stock integrity
    const productKeys: string[] = []
    let cursor: number | string = 0

    do {
      const [nextCursor, foundKeys]: [number | string, string[]] = await redis.scan(cursor, {
        match: "product:*",
        count: 100,
      })
      cursor = nextCursor

      for (const key of foundKeys) {
        if (!key.endsWith(":stock")) {
          productKeys.push(key)
        }
      }
    } while (Number(cursor) !== 0)

    // Verify each product's stock is >= 0
    for (const productKey of productKeys) {
      const stockKey = `${productKey}:stock`
      const stock = await redis.get<string>(stockKey)
      const stockNum = stock ? Number.parseInt(stock) : 0

      const productId = productKey.replace("product:", "")

      checks.push({
        name: `Stock Integrity - ${productId}`,
        passed: stockNum >= 0,
        details: stockNum >= 0 ? `Stock is valid: ${stockNum}` : `NEGATIVE STOCK DETECTED: ${stockNum}`,
        actual: stockNum,
      })
    }

    // Check 5: Verify no duplicate order IDs
    const allOrderIds = await redis.zrange(keys.ordersIndex, 0, -1)
    const uniqueOrderIds = new Set(allOrderIds)
    const noDuplicates = allOrderIds.length === uniqueOrderIds.size

    checks.push({
      name: "No Duplicate Orders",
      passed: noDuplicates,
      details: noDuplicates
        ? "All order IDs are unique"
        : `DUPLICATE ORDERS FOUND: ${allOrderIds.length - uniqueOrderIds.size} duplicates`,
      expected: allOrderIds.length,
      actual: uniqueOrderIds.size,
    })

    const allPassed = checks.every((check) => check.passed)

    const result: VerificationResult = {
      success: allPassed,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        totalOrders,
        totalLeaderboardSales,
        productsChecked: productKeys.length,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify data consistency",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
