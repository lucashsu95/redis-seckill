import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Counter } from "k6/metrics"

const errorRate = new Rate("errors")
const successRate = new Rate("success")
const status200 = new Counter("status_200_ok");
const status409 = new Counter("status_409_sold_out");
const status429 = new Counter("status_429_rate_limit");
const status5xx = new Counter("status_5xx_server_error");

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 300 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 重點在於延遲，而非吞吐量
    http_req_duration: ['p(95)<800'], // HTTP 延遲較高，容忍度需放寬
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

export function setup() {
  const seedRes = http.post(`${BASE_URL}/api/seed`)
  check(seedRes, {
    "seed successful": (r) => r.status === 200,
  })

  sleep(2)

  const productsRes = http.get(`${BASE_URL}/api/products`)
  const products = JSON.parse(productsRes.body)

  return { products }
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
    throw: false,
    responseCallback: http.expectedStatuses(200, 409)
  }

  const res = http.post(`${BASE_URL}/api/seckill`, payload, params)

  if (res.status === 200) status200.add(1);
  else if (res.status === 409) status409.add(1);
  else if (res.status === 429) status429.add(1);
  else if (res.status >= 500) status5xx.add(1);

  check(res, {
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

  sleep(Math.random() * 0.5 + 0.1)
  console.log(res.body)
  console.log('200:', status200)
  console.log('409:', status409)
  console.log('429:', status429)
  console.log('5xx:', status5xx)
}
