以下是從零開始安裝 **WSL2**、**Node.js (含 PM2)** 與 **Docker** 的完整步驟。

-----

### 第一階段：安裝 WSL2 (Ubuntu)

這是你的基礎環境。

1.  **開啟 PowerShell (以系統管理員身分執行)**。
2.  輸入以下指令並按 Enter：
    ```powershell
    wsl --install
    ```
    *(這會自動啟用所需功能並下載預設的 Ubuntu Linux。)*
3.  **重啟電腦**。
4.  重啟後，一個 Ubuntu 的終端機視窗會自動彈出。它會花一點時間安裝。
5.  **設定帳號密碼**：依提示輸入一個 UNIX Username (使用者名稱) 和 Password (密碼)。
    *(注意：輸入密碼時螢幕不會顯示星號，這是正常的，輸入完按 Enter 即可。)*

恭喜，你現在已經在 Linux 環境中了！接下來的指令都在這個 **Ubuntu 視窗** 中執行。

-----

### 第二階段：安裝 Node.js、pnpm 與 PM2

在 Linux 中，**強烈建議**使用 `nvm` (Node Version Manager) 來安裝 Node.js，不要用 `apt install nodejs` (版本通常太舊)。

在 Ubuntu 終端機中依序執行：

1.  **安裝 NVM (Node Version Manager)**：
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
2.  **讓設定生效** (或者關掉視窗重開)：
    ```bash
    source ~/.bashrc
    ```
3.  **安裝 Node.js LTS 版本**：
    ```bash
    nvm install --lts
    ```
4.  **驗證安裝**：
    ```bash
    node -v
    # 應該會看到 v20.x.x 或 v22.x.x
    ```
5.  **安裝全域工具 (PM2 和 pnpm)**：
    ```bash
    npm install -g pm2 pnpm
    ```

-----

### 第三階段：安裝 Docker (最簡單的方法)

既然你原本就在用 Windows，最推薦的方式是使用 **Docker Desktop for Windows** 並開啟 **WSL2 整合**。這樣你不用在 Linux 裡搞複雜的 Docker daemon 設定。

1.  **在 Windows 上**，確認你已經安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。
2.  開啟 Docker Desktop 設定 (齒輪圖示)。
3.  前往 **Resources** \> **WSL integration**。
4.  **勾選** 你剛剛安裝的 Ubuntu (例如 `Ubuntu-22.04`)。
5.  點擊 **Apply & Restart**。

**驗證**：
回到你的 **Ubuntu 終端機**，輸入：

```bash
docker ps
```

如果沒有報錯（顯示表頭），代表你的 WSL 已經可以完美呼叫 Docker 了。

-----

### 第四階段：安裝 k6 (在 WSL 內)

#### 1\. 安裝金鑰與軟體源

我們使用 `curl` 搭配 `gpg --dearmor` 來正確下載並安裝金鑰。

```bash
# 1. 下載 k6 GPG 金鑰並存入系統
curl -s https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg

# 2. 重新寫入 k6 軟體源設定
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
```

#### 2\. 更新與安裝 k6

現在系統已經信任這個來源，可以安全地安裝了。

```bash
sudo apt-get update
sudo apt-get install k6
```

執行完畢後，輸入 `k6 version` 應該能看到版本號，代表安裝成功。

-----

### 第五階段：遷移專案 (關鍵效能點 ⚠️)

這是最重要的一步。**不要**在 WSL 裡直接跑 Windows 資料夾 (如 `/mnt/c/Users/...`) 的專案，那樣 I/O 會非常慢。

**請將專案 `git clone` 到 Linux 的檔案系統中：**

1.  在 Ubuntu 終端機回到家目錄：
    ```bash
    cd ~
    ```
2.  下載你的專案 (假設你有用 Git，沒有的話可以用 Windows 檔案總管複製進去，路徑是 `\\wsl$\Ubuntu\home\你的帳號\` )：
    ```bash
    git clone <你的 GitHub Repo 網址>
    # 或者建立資料夾
    mkdir seckill-project
    cd seckill-project
    ```
3.  **安裝依賴**：
    ```bash
    pnpm install
    ```

**(小技巧)**：如果你想用 VS Code 編輯這裡的檔案，在資料夾內輸入 `code .`，Windows 的 VS Code 就會開啟並連線到 WSL。

-----

### 最終測試：執行 5000 VUs

現在你的環境是全 Linux 鏈路：

1.  **啟動 Redis (在 WSL 內)**：
    ```bash
    # 確保你有 docker-compose.yml
    docker compose up -d redis
    ```
2.  **啟動 Next.js (PM2 Cluster)**：
    ```bash
    pnpm build
    pnpm start:pm2
    # 使用 pm2 list 確認有 12 個 process
    ```
3.  **執行 k6 測試**：
    ```bash
    k6 run load-test.js
    ```

現在你應該看不到 `connectex` 錯誤了。如果 Redis 撐不住，你會看到 Timeout，那時候就是優化 Redis (連接池/Lua) 的時候了。