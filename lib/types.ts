export type RedisJsonMgetResponse<T> = Array<[T]>

export function extractJsonValue<T>(response: [T]): T {
  return response[0]
}

export function extractJsonValues<T>(responses: Array<[T]>): T[] {
  return responses.map((r) => r[0])
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