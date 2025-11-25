import { getProducts } from "@/lib/data"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: "Failed to get products" }, { status: 500 })
  }
}
