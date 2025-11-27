import { redis, keys } from "./redis"

const SECKILL_SCRIPT = `
local stockKey = KEYS[1]
local streamKey = KEYS[2]
local userId = ARGV[1]
local productId = ARGV[2]
local orderId = ARGV[3]
local price = ARGV[4]
local timestamp = ARGV[5]

local stock = tonumber(redis.call("GET", stockKey))
if not stock or stock <= 0 then
    return 0
end

redis.call("DECR", stockKey)

redis.call("XADD", streamKey, "*", 
    "userId", userId, 
    "productId", productId, 
    "orderId", orderId,
    "price", price,
    "timestamp", timestamp
)

return 1
`

const soldOutCooldownMap = new Map<string, number>();
const COOLDOWN_DURATION = 5000;

export async function attemptSeckill(
  userId: string,
  productId: string,
  price: number,
): Promise<{ success: boolean; orderId?: string }> {

  const cooldownUntil = soldOutCooldownMap.get(productId);
  const now = Date.now();
  if (cooldownUntil && now < cooldownUntil) {
    return { success: false };
  }

  const orderId = crypto.randomUUID()
  const timestamp = Date.now().toString()

  const result = await redis.eval(
    SECKILL_SCRIPT,
    [keys.productStock(productId), keys.ordersStream],
    [userId, productId, orderId, price.toString(), timestamp],
  )

  if (result === 1) {
    if (soldOutCooldownMap.has(productId)) {
        soldOutCooldownMap.delete(productId);
    }
    return { success: true, orderId }
  }

  if (result === 0) {
    soldOutCooldownMap.set(productId, Date.now() + COOLDOWN_DURATION);
  }
  return { success: false };
}

export async function getProductStock(productId: string): Promise<number> {
  const stock = await redis.get<string>(keys.productStock(productId))
  return stock ? Number.parseInt(stock) : 0
}
