import http from "k6/http"
import { check, sleep } from "k6"
import { Rate } from "k6/metrics"

// Custom metrics
const errorRate = new Rate("errors")
const successRate = new Rate("success")

export const options = {
  stages: [
    { duration: "10s", target: 50 }, // Ramp up to 50 users
    { duration: "30s", target: 100 }, // Stay at 100 users
    { duration: "20s", target: 200 }, // Spike to 200 users
    { duration: "10s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.99"], // 容許 409
    errors: ["rate<0.1"], // Error rate should be below 10%
  },
}

// Replace with your actual deployment URL or localhost
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

export function setup() {
  const seedRes = http.post(`${BASE_URL}/api/seed`)
  check(seedRes, {
    "seed successful": (r) => r.status === 200,
  })

  sleep(2)

  const productsRes = http.get(`${BASE_URL}/api/products`)
  const products = JSON.parse(productsRes.body)

  return { products: products }
}

export default function (data) {
  const userId = `user-${Math.floor(Math.random() * 1000)}`

  if (data.products.length === 0) {
    return
  }

  const product = data.products[Math.floor(Math.random() * data.products.length)]

  const payload = JSON.stringify({
    productId: product.id,
    userId: userId,
    price: product.price,
  })

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    throw: false
  }

  const res = http.post(`${BASE_URL}/api/seckill`, payload, params)

  // Check response
  const success = check(res, {
    "status is 200 or 409": (r) => r.status === 200 || r.status === 409,
    "response has success field": (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.hasOwnProperty("success")
      } catch (e) {
        return false
      }
    },
  })

  if (res.status === 200) {
    successRate.add(1)
    errorRate.add(0)
  } else if (res.status === 409) {
    errorRate.add(0)
  } else {
    errorRate.add(1)
  }

  // Small delay between requests
  sleep(Math.random() * 0.5 + 0.1)
}
