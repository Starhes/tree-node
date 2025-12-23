# 服务器部署指南 (Node.js 本地存储版)

此版本使用 Node.js + Express 后端，将图片保存在 `uploads/` 目录，并使用 SQLite 数据库。

## 目录结构

```
tree/
├── dist/            # 前端构建产物
├── uploads/         # 用户上传的图片 (需要持久化)
├── server/
│   ├── app.js       # 服务器入口
│   ├── package.json # 后端依赖
│   └── database.sqlite # SQLite 数据库 (自动创建)
└── src/             # 前端源码
```

## 部署步骤

### 1. 准备服务器
确保服务器安装了 Node.js (v16+)。

### 2. 上传文件
将以下文件/目录上传到服务器：
- `dist/` (前端构建产物)
- `server/` (后端代码)
- `uploads/` (空目录，用于存储上传的图片)

### 3. 安装依赖并启动
```bash
cd server
npm install

# 使用 pm2 保持后台运行 (推荐)
npm install -g pm2
pm2 start app.js --name "tree-server"

# 或直接运行 (测试用)
node app.js
```

服务将在 `3000` 端口运行。

### 4. 配置反向代理 (可选但推荐)

使用 Nginx 进行反向代理并启用 HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 环境变量 (可选)

- `PORT`: 服务器端口，默认 `3000`

## 安全建议

1. **CORS**: 生产环境建议限制只允许您的前端域名访问 API。
2. **HTTPS**: 强烈建议使用 Nginx 配置 SSL 证书。
3. **备份**: 定期备份 `uploads/` 目录和 `server/database.sqlite` 文件。
