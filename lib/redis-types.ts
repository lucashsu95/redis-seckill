// Type definitions for Redis JSON responses

/**
 * Redis JSON.MGET returns an array where each element is wrapped in an array
 * when using JSONPath selectors like '$'
 */
export type RedisJsonMgetResponse<T> = Array<[T]>

/**
 * Helper to extract the actual value from Redis JSON response
 */
export function extractJsonValue<T>(response: [T]): T {
  return response[0]
}

/**
 * Helper to extract multiple values from Redis JSON MGET response
 */
export function extractJsonValues<T>(responses: Array<[T]>): T[] {
  return responses.map((r) => r[0])
}
