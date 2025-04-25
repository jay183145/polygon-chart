# Polygon Chart

這是一個使用 Next.js 開發的圖表應用程式，使用 Docker 進行環境封裝和部署。

## 系統需求

- Docker Desktop
- Git

## 專案設置

1. 克隆專案

```bash
git clone https://github.com/jay183145/polygon-chart.git
cd polygon-chart
```

2. 使用 Docker 構建映像

```bash
docker build -t polygon-chart .
```

3. 運行容器

```bash
docker run -p 3000:3000 polygon-chart
```

## 開發環境設置

如果你想要在本地開發環境中運行專案：

1. 確保已安裝 Node.js (v20.16.0 或更高版本) 和 pnpm

2. 安裝依賴

```bash
pnpm install
```

3. 啟動開發伺服器

```bash
pnpm dev
```

4. 在瀏覽器中訪問 http://localhost:3000

## 專案結構

```
polygon-chart/
├── .next/              # Next.js 構建輸出
├── public/             # 靜態文件
├── app/                # Next.js 應用路由
├── components/         # React 組件
├── types/              # 型別
├── utils/              # 一些簡易的 functions
├── package.json        # 專案依賴
├── pnpm-lock.yaml      # 依賴鎖定文件
├── Dockerfile          # Docker 配置
└── README.md           # 專案文檔
```

## Docker 說明

專案使用多階段構建來優化 Docker 映像大小：

1. `base` 階段：設置基礎 Node.js 環境
2. `deps` 階段：安裝依賴
3. `builder` 階段：構建應用
4. 最終階段：運行應用

## 常見問題

1. 如果遇到端口衝突，可以修改 Docker 運行命令中的端口映射：

```bash
docker run -p [your-port]:3000 polygon-chart
```

2. 如果需要清理 Docker 資源：

```bash
docker system prune -a --volumes
```

## 授權

[MIT License](LICENSE)
