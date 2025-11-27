## 1\. 專案概述 (Project Overview)

### 1.1 核心目標

構建一個具備高併發處理能力的電商秒殺系統，實現完整的業務功能（包含後台管理與報表）。

### 1.2 技術架構原則

  - **Persistence Strategy**: 採用 **Upstash Redis** 託管服務，利用其內建的 Multi-tier Storage 機制確保資料持久性（Persistence by Default），無需手動維護 AOF 設定。
  - **Data Modeling**: 採用 **JSON String Store** 搭配 **Manual Indexing** (手動維護索引) 策略。
  - **Concurrency Control**: 核心庫存扣減依賴 **Lua Script**，寫入壓力透過 **Redis Streams** 異步緩衝。

-----

## 2\. 資料結構設計 (Data Schema)

### 2.1 實體資料 (Entities) - 儲存實際內容

| Key Pattern | Type | 用途 | 內容範例 (JSON / Value) |
| :--- | :--- | :--- | :--- |
| `order:{orderId}` | **String** | **訂單主體** (不可變) | `{"id":"o101", "uid":"u1", "pid":"p1", "price":999, "ts":17100000}` |
| `product:{id}:stock` | String | 庫存計數器 | `50` (整數) |
| `product:{id}` | Hash | 商品靜態資訊 | `{"name": "iPhone 15", "img": "url..."}` |

### 2.2 索引資料 (Indexes) - 支援查詢與關聯

為了支援後台分頁 (Pagination) 與特定查詢，需在寫入時同步維護以下集合：

| Key Pattern | Type | 用途 | 結構邏輯 |
| :--- | :--- | :--- | :--- |
| `orders:index` | **ZSet** | **全域訂單索引** (Admin 分頁用) | **Member**: `orderId`<br>**Score**: `Timestamp` (下單時間戳) |
| `user:{uid}:orders` | List | 用戶歷史訂單 | 存放 `orderId` 的列表 (LPUSH/LRANGE) |
| `leaderboard:sales` | **ZSet** | **熱銷排行榜** | **Member**: `productId`<br>**Score**: `SalesCount` (銷量) |

-----

## 3\. 業務邏輯詳解 (Detailed Logic)

### 3.1 核心秒殺流程 (Seckill Flow) - Hot Path

  * **觸發點**: `POST /api/seckill`
  * **同步處理 (Redis Lua)**:
    1.  檢查 `product:{id}:stock` 是否 \> 0。
    2.  執行 `DECR` 扣庫存。
    3.  執行 `XADD` 將請求推入 Stream `orders:stream`。
  * **回傳**: 若成功，回傳 HTTP 200 與臨時 OrderID；失敗回傳 HTTP 409 (Sold Out)。

### 3.2 異步寫入與索引維護 (Worker Flow) - Persistence

Worker 消費 Stream 訊息，將資料「實體化」並建立索引。此步驟必須具備**原子性**。

  * **觸發點**: Worker `XREADGROUP`
  * **處理邏輯 (Pipeline Transaction)**:
    1.  準備訂單物件並 `JSON.stringify`。
    2.  開啟 `MULTI` (Transaction)。
    3.  **寫入實體**: `SET order:{id} {json}`。
    4.  **寫入用戶索引**: `LPUSH user:{uid}:orders {id}`。
    5.  **寫入全域索引**: `ZADD orders:index {timestamp} {id}` (關鍵：供 Admin 分頁)。
    6.  **更新排行榜**: `ZINCRBY leaderboard:sales 1 {pid}`。
    7.  執行 `EXEC`。
    8.  `XACK` 確認訊息處理完畢。

### 3.3 後台管理功能 (Admin Dashboard)

  * **訂單列表 (Pagination)**:
      * 利用 `ZSet` 的排序特性實現分頁。
      * **Step 1**: `ZREVRANGE orders:index {start} {end}` 取得當前頁面的 10 個 `orderId`。
      * **Step 2**: `MGET order:{id1} order:{id2} ...` 一次性拉取所有 JSON 資料。
      * **優勢**: 避免了 `KEYS *` 的全表掃描效能問題。
  * **編輯訂單 (Edit)**:
      * 讀取 JSON -\> 解析 -\> 修改 -\> `JSON.stringify` -\> `SET` 覆蓋原 Key。
  * **刪除訂單 (Delete)**:
      * **挑戰**: 需避免索引殘留 (Dangling References)。
      * **邏輯**: 使用 `MULTI` 同時刪除：
        1.  `DEL order:{id}` (實體)
        2.  `ZREM orders:index {id}` (全域索引)
        3.  `LREM user:{uid}:orders 0 {id}` (用戶索引)
    
    * **商品管理 (Product Management)**:
        * **新增商品 (Create)**: 
            * `JSON.SET product:{id} $ {json}` (商品資訊)
            * `SET product:{id}:stock {stock}` (初始庫存)
        * **補貨 (Restock)**:
            * `INCRBY product:{id}:stock {amount}` (原子增加庫存)
        * **刪除商品 (Delete)**:
            * `DEL product:{id}`
            * `DEL product:{id}:stock`

### 3.4 排行榜 (Leaderboard)

  * **邏輯**: 直接讀取 `leaderboard:sales`。
  * **查詢**: `ZREVRANGE leaderboard:sales 0 9 WITHSCORES` (取前 10 名含銷量)。

-----

## 4\. 系統循序圖 (Sequence Diagram)

### Worker 寫入事務圖

展示 Worker 如何同時處理資料儲存與索引建立。

```mermaid
sequenceDiagram
    participant Worker
    participant Redis

    Note over Worker: 1. 解析 Stream 訊息<br>並組成 order JSON 物件
    Worker->>Worker: 構建 order 資料

    Note over Worker: 2. 建立 Pipeline (MULTI)
    Worker->>Redis: MULTI

    rect rgb(45, 45, 45)
        Note right of Redis: 寫入訂單 JSON
        Redis->>Redis: JSON.SET order:{orderId} "$" {order}

        Note right of Redis: 建立全域排序索引
        Redis->>Redis: ZADD orders:index {createdAt} {orderId}

        Note right of Redis: 建立使用者訂單索引
        Redis->>Redis: ZADD user:{userId}:orders {createdAt} {orderId}

        Note right of Redis: 對每個 productId 累加銷售額（整批 loop 最後執行）
        Redis->>Redis: ZINCRBY leaderboard {totalSales} {productId}

        Note right of Redis: Stream Ack（在 pipeline 裡）
        Redis->>Redis: XACK orders:stream {group} {msgId}
    end

    Worker->>Redis: EXEC
    Redis-->>Worker: OK (Transaction Committed)

    Note over Worker: 回傳 processed 訂單數與 IDs
```

-----

## 5\. API 介面規範 (Internal API Specification)

| 方法 | 路徑 | 描述 | Redis 關鍵指令 |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/seckill` | 用戶搶購 | `EVALSHA` |
| **GET** | `/api/products` | 商品列表 | `JSON.GET` / `SCAN` |
| **POST** | `/api/seed` | 初始化數據 | `JSON.SET`, `SET` (Pipeline) |
| **POST** | `/api/worker/process` | Worker 處理 Stream 訊息 | `JSON.SET`, `SET`, `LPUSH`, `ZINCRBY` (Pipeline) |
