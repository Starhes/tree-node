# 阶段1: 构建前端
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 阶段2: 生产环境
FROM node:20-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制服务器代码
COPY app.js ./

# 创建上传目录
RUN mkdir -p uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 创建非 root 用户运行应用
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 启动服务器
CMD ["node", "app.js"]
