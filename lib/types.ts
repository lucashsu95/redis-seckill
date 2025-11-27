export type RedisJsonMgetResponse<T> = (string | null)[]

export function extractJsonValue<T>(response: string | null): T | null {
  if (!response) return null
  try {
    const parsed = JSON.parse(response)
    return Array.isArray(parsed) ? parsed[0] : parsed
  } catch {
    return null
  }
}

export function extractJsonValues<T>(responses: (string | null)[]): T[] {
  return responses
    .map((r) => extractJsonValue<T>(r))
    .filter((r): r is T => r !== null)
}

export interface Order {
  id: string
  userId: string
  productId: string
  price: number
  status: "pending" | "completed" | "failed"
  createdAt: number
  processedAt?: number
  [key: string]: string | number | undefined
}

export interface CreateProductInput {
  id: string
  name: string
  price: number
  image?: string
  stock: number
}