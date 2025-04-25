# 創建一個基礎映像，包含 pnpm
FROM node:20.16.0 AS base
RUN npm install -g pnpm

# 使用基礎映像
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
RUN pnpm install --prod

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["pnpm", "start"] 