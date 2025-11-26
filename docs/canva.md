# 簡報

### 第一部分：大綱

1.  **封面 (Title Slide)**
      * 專案名稱：Next.js 高併發秒殺系統
      * 副標題：基於 Redis 實現原子性庫存扣減、持久化儲存與即時排行榜
2.  **動機與發想 (Motivation)**
      * 傳統電商痛點：SQL 在高併發下的鎖競爭與效能瓶頸。
      * 預期目標：極致效能 ($O(1)$ 讀取)、資料強一致性（不超賣）、即時回饋。
3.  **系統架構 (Architecture)**
      * 技術堆疊：Next.js + Redis (Primary DB) + Worker。
      * 資料流動：同步熱點 (Lua) vs 異步寫入 (Stream)。
4.  **Redis 資料模型設計 (Data Modeling)**
      * **核心策略**：JSON String + Manual Indexing (手動索引)。
      * **取代 SQL**：利用 `ZSet` 實現後台分頁查詢。
5.  **核心技術 I：高併發控制 (Concurrency Control)**
      * **Lua Script**：原子性庫存扣減 (Atomic Check-and-Set)。
      * **Redis Streams**：削峰填谷 (Traffic Shaping) 與異步處理。
6.  **核心技術 II：後台管理與業務功能 (CMS & Business Logic)**
      * **Admin Dashboard**：基於 `ZSet` 時間戳的 `MGET` 批次查詢。
      * **資料一致性**：`MULTI`/`EXEC` 事務處理級聯刪除 (Cascading Delete)。
      * **即時排行榜**：`ZSet` 的天然排序優勢。
7.  **參考文獻與雲端資源 (Resources)**
      * 使用的 IT 工具與雲端部署連結。
8.  **成果與心得 (Conclusion & Future Work)**
      * 壓力測試驗證。
      * 尚待解決問題：DLQ (Dead Letter Queue) 與補償機制。

### 第二部分：簡報內文草稿

#### 頁面 1: 專案動機與目標 (Motivation)

  * **傳統 SQL 的困境**：
      * 在秒殺瞬間（Flash Sale），傳統關聯式資料庫 (RDBMS) 面臨 Row-Lock 競爭激烈、I/O 瓶頸嚴重等問題。
      * 查詢熱門商品排行榜時，SQL 的 `ORDER BY` 操作在大數據量下效能低落。
  * **本專案目標**：
      * **極速響應**：將熱點資料全存於記憶體，追求 \< 50ms 的 API 回應。
      * **絕對不超賣**：確保庫存扣減的原子性 (Atomicity)。
      * **完整業務閉環**：不僅是前端搶購，更包含完整的後台管理 (CMS)、補貨、分頁瀏覽與報表。

#### 頁面 2: 系統架構概覽 (Architecture)

  * **前端/API 層 (Next.js)**：處理用戶請求，直接與 Redis 互動。
  * **資料儲存層 (Redis)**：
      * **Persistence Strategy**: 採用 **Upstash Redis** 託管服務，利用其內建的 Multi-tier Storage 機制確保資料持久性（Persistence by Default），無需手動維護 AOF 設定。
      * **JSON Store**：訂單實體以 JSON String 儲存。
      * **Indexing**：手動維護 ZSet 和 List 作為索引。
  * **異步處理層 (Worker)**：
      * 監聽 Redis Stream，負責將瞬時流量轉化為持久化的索引數據，保護主執行緒不阻塞。

#### 頁面 3: Redis 核心技術 I - 資料模型與取代 SQL (Data Modeling)

  * **Redis 取代 SQL 的策略**：
      * **實體儲存**：使用 `String` 結構儲存 `JSON` 字串 (`order:{id}`)。
      * **查詢優化**：不使用 `KEYS *` (全表掃描)，而是模擬 SQL 索引：
          * **分頁查詢 (Pagination)**：建立 `ZSet` (`orders:index`)，Score = Timestamp。
          * **操作**：使用 `ZREVRANGE` 取出 ID 列表，再用 `MGET` 一次拉取所有訂單內容。
      * **優勢**：即使訂單量達到百萬級，分頁查詢依然維持 $O(\log N)$ 的高效能，遠勝 SQL 的 `OFFSET` 語法。

#### 頁面 4: Redis 核心技術 II - 原子性與 Lua (Atomicity)

  * **解決的問題**：並發環境下的 Race Condition (超賣)。
  * **解決方案**：**Lua Scripting**。
      * 將「檢查庫存」、「扣減庫存」、「寫入名單」四個動作封裝在一個腳本中。
      * Redis 保證腳本執行期間不會插入其他命令，實現嚴格的**序列化執行**。
  * **程式碼邏輯**：
    ```lua
    if stock <= 0 then return 0 end -- 檢查庫存
    redis.call("DECR", stockKey) -- 扣庫存
    redis.call("XADD", streamKey, ...) -- 推入異步隊列
    ```

#### 頁面 5: Redis 核心技術 III - Stream 與 削峰填谷 (Traffic Shaping)

  * **為什麼需要 Stream？**
      * 秒殺瞬間寫入量巨大，直接同步寫入所有索引 (Index) 會拖慢 API 回應。
  * **實作流程**：
    1.  **API 層**：僅利用 Lua 快速扣庫存並 `XADD` 推入訊息，立刻回傳成功給用戶 (低延遲)。
    2.  **Worker 層**：使用 `XREADGROUP` 消費訊息。
    3.  **Pipeline 事務**：Worker 在背景利用 `MULTI/EXEC` 批量建立全域索引、用戶歷史記錄與排行榜數據。
  * **優勢**：將「寫入壓力」在時間軸上攤平，系統更穩定。

#### 頁面 6: 後台管理與資料一致性 (Admin & Consistency)

  * **CMS 功能亮點**：
      * 支援 JSON 內容直接編輯 (Override)。
  * **複雜資料處理**：
      * **級聯刪除 (Cascading Delete)**：當管理員刪除一張訂單時，Redis 事務會同時清理：
        1.  `DEL order:{id}` (實體)
        2.  `LREM user:{uid}:orders` (用戶索引)
      * 這確保了系統不會出現「有索引但找不到資料」的 Dangling Pointer 問題。

#### 頁面 7: 參考文獻與雲端資源 (References)

  * **技術堆疊**：
      * Next.js (App Router), ioredis (Redis Client), TailwindCSS.
  * **雲端服務**：
      * **GitHub Repo**: [你的 GitHub 連結]
      * **Redis Cloud**: Upstash / Redis Labs (展示雲端連線能力)
      * **Deployment**: Vercel / Railway
  * **協作工具**：
      * Notion (專案管理), Excalidraw (架構圖繪製).

#### 頁面 8: 成果與尚待解決之問題 (Conclusion)

  * **專案成果**：
      * 成功實現高併發下的庫存準確性（經 k6 壓測驗證）。
      * 利用 `ZSet` 實現了無需 SQL 的即時熱銷排行榜 (`leaderboard:sales`)。
  * **未來展望 (Future Work)**：
      * **補償機制 (Compensation)**：目前若 Worker 處理 Stream 失敗，需實作 DLQ (Dead Letter Queue) 與自動回補庫存 (Rollback Stock) 的邏輯，以達到最終一致性。