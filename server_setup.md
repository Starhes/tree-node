# 服务器部署指南 (Node.js 本地存储版)

此版本使用 Node.js + Express 后端，将图片保存在 `uploads/` 目录，并使用 SQLite 数据库。

## 特性

- ✅ 图片自动压缩 (WebP 格式, 80% 质量, 最大 1920px)
- ✅ 最多上传 20 张图片
- ✅ Rate Limiting 防止滥用
- ✅ 安全的文件验证

## 目录结构

```
tree/
├── app.js           # 服务器入口 (根目录)
├── package.json     # 统一依赖管理
├── dist/            # 前端构建产物
├── uploads/         # 用户上传的图片 (需要持久化)
├── database.sqlite  # SQLite 数据库 (自动创建)
└── src/             # 前端源码
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器 (Vite)
npm run dev

# 启动后端服务器 (生产模式)
npm run serve
```

## 部署步骤

### 1. 准备服务器
确保服务器安装了 Node.js (v16+)。

### 2. 上传文件
将以下文件/目录上传到服务器：
- `app.js` (服务器入口)
- `package.json` & `package-lock.json`
- `dist/` (前端构建产物，先运行 `npm run build`)
- `uploads/` (空目录，用于存储上传的图片)

### 3. 安装依赖并启动
```bash
npm install --production

# 使用 pm2 保持后台运行 (推荐)
npm install -g pm2
pm2 start app.js --name "tree-server"

# 或一键部署 (构建并启动)
npm run deploy

# 或直接运行 (测试用)
npm run serve
```

服务将在 `3000` 端口运行。

### 4. 配置反向代理 (可选但推荐)

使用 Nginx 进行反向代理并启用 HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M; # 支持大图片上传

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 环境变量 (可选)

- `PORT`: 服务器端口，默认 `3000`

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/upload` | 上传图片 (最多20张，5MB/张) |
| GET | `/api/tree/:id` | 获取圣诞树数据 |
| GET | `/api/image/:filename` | 获取上传的图片 |

## 安全特性

1. **Rate Limiting**: 15分钟内最多50次上传请求
2. **文件类型验证**: 只允许 JPEG, PNG, GIF, WebP 图片
3. **文件大小限制**: 单个文件最大 5MB
4. **路径遍历防护**: 阻止恶意文件名访问
5. **UUID 格式验证**: 防止 SQL 注入

## 安全建议

1. **CORS**: 生产环境建议限制只允许您的前端域名访问 API。
2. **HTTPS**: 强烈建议使用 Nginx 配置 SSL 证书。
3. **备份**: 定期备份 `uploads/` 目录和 `database.sqlite` 文件。

## 快速命令参考

```bash
# 开发
npm run dev          # 启动前端开发服务器

# 生产
npm run build        # 构建前端
npm run serve        # 启动后端服务器
npm run deploy       # 构建 + 启动

# PM2 管理
pm2 start app.js --name tree-server
pm2 logs tree-server
pm2 restart tree-server
pm2 stop tree-server
```
