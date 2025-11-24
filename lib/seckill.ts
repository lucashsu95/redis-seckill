import { redis, keys } from "./redis"

// Lua script to atomically check stock, decrement, and push to stream
const SECKILL_SCRIPT = `
local stockKey = KEYS[1]
local streamKey = KEYS[2]
local userId = ARGV[1]
local productId = ARGV[2]
local orderId = ARGV[3]
local price = ARGV[4]
local timestamp = ARGV[5]

-- Check stock
local stock = tonumber(redis.call("GET", stockKey))
if not stock or stock <= 0 then
    return 0
end

-- Decrement stock
redis.call("DECR", stockKey)

-- Add to stream for async processing
-- We pass all details needed for the worker to create the full order
redis.call("XADD", streamKey, "*", 
    "userId", userId, 
    "productId", productId, 
    "orderId", orderId,
    "price", price,
    "timestamp", timestamp
)

return 1
`

export async function attemptSeckill(
  userId: string,
  productId: string,
  price: number,
): Promise<{ success: boolean; orderId?: string }> {
  const orderId = crypto.randomUUID()
  const timestamp = Date.now().toString()

  const result = await redis.eval(
    SECKILL_SCRIPT,
    [keys.productStock(productId), keys.ordersStream],
    [userId, productId, orderId, price.toString(), timestamp],
  )

  if (result === 1) {
    return { success: true, orderId }
  }

  return { success: false }
}

export async function getProductStock(productId: string): Promise<number> {
  const stock = await redis.get<string>(keys.productStock(productId))
  return stock ? Number.parseInt(stock) : 0
}
