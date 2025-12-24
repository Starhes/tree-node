# 🎄 Christmas Memories Tree

一个基于 React Three Fiber 的 3D 交互式圣诞树记忆展示项目，通过 AI 手势识别技术，让您的珍贵回忆在魔法般的 3D 空间中呈现。

## ✨ 项目特色

- **3D 交互体验**：使用 Three.js 和 React Three Fiber 构建的沉浸式 3D 场景
- **AI 手势控制**：集成 MediaPipe 手势识别，支持多种手势交互
- **图片自动压缩**：上传自动转换为 WebP 格式，节省 70%+ 存储空间
- **Docker 一键部署**：支持 GHCR 自动构建，一条命令即可部署

## 🚀 快速部署

### 方式一：Docker 部署（推荐）

```bash
# 拉取镜像
docker pull ghcr.io/starhes/tree-node:latest

# 运行容器
docker run -d \
  --name christmas-tree \
  -p 3000:3000 \
  -v tree-uploads:/app/uploads \
  -v tree-data:/app/database.sqlite \
  ghcr.io/starhes/tree-node:latest
```

访问 `http://localhost:3000` 即可使用。

#### Docker Compose 部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  tree:
    image: ghcr.io/starhes/tree-node:latest
    container_name: christmas-tree
    ports:
      - "3000:3000"
    volumes:
      - tree-uploads:/app/uploads
      - tree-data:/app
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped

volumes:
  tree-uploads:
  tree-data:
```

然后运行：

```bash
docker-compose up -d
```

### 方式二：手动部署

```bash
# 克隆仓库
git clone https://github.com/Starhes/tree-node.git
cd tree-node

# 安装依赖
npm install

# 构建并启动
npm run deploy
```

服务将在 `http://localhost:3000` 运行。

## 🎮 手势控制

### 单手操作
- **张开手掌**：指针控制，可以点击查看照片
  - 停留 1 秒触发点击
  - 进度环会显示悬停进度
- **握拳**：旋转场景（改变旋转速度）
- **单指伸出（食指）**：单手缩放控制
  - 手掌靠近摄像头：放大
  - 手掌远离摄像头：缩小

### 双手操作
- **双手张开**：平移视角
  - 移动双手来移动整个场景
- **捏合手势（拇指和食指）**：双手缩放
  - 双手距离变大：放大
  - 双手距离变小：缩小
- **双手握拳**：在 CHAOS 和 TREE 模式之间切换

## 📊 技术规格

| 特性 | 规格 |
|------|------|
| 最大上传图片数 | 20 张/次 |
| 单张图片大小限制 | 10 MB |
| 图片压缩格式 | WebP (80% 质量) |
| 最大图片尺寸 | 1920 x 1920 px |
| 服务端口 | 3000 |

## 📁 项目结构

```
tree-node/
├── app.js               # 服务器入口 (ES模块)
├── Dockerfile           # Docker 配置
├── package.json         # 依赖配置
├── src/                 # 前端源码
│   ├── App.tsx
│   └── components/
├── dist/                # 构建产物
├── uploads/             # 用户上传图片
└── database.sqlite      # SQLite 数据库
```

## 🎨 技术栈

### 后端
- **Node.js + Express** - 服务器框架
- **SQLite** - 轻量级数据库
- **Sharp** - 图片压缩处理
- **Multer** - 文件上传处理

### 前端
- **React 18 + TypeScript** - UI 框架
- **Three.js + React Three Fiber** - 3D 渲染
- **MediaPipe** - AI 手势识别
- **Vite** - 构建工具

### DevOps
- **Docker** - 容器化
- **GitHub Actions** - CI/CD
- **GHCR** - 容器镜像仓库

## 🔒 安全特性

- ✅ Rate Limiting (15分钟/50次)
- ✅ 文件类型白名单 (JPEG, PNG, GIF, WebP)
- ✅ 路径遍历防护
- ✅ UUID 格式验证
- ✅ 非 root 用户运行容器

## 🛠️ 开发

```bash
# 前端开发模式
npm run dev

# 后端开发
npm run serve

# 构建生产版本
npm run build

# 本地构建 Docker 镜像
docker build -t tree-node .
```

## 📝 API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/upload` | 上传图片 |
| GET | `/api/tree/:id` | 获取圣诞树数据 |
| GET | `/api/image/:filename` | 获取图片 |

## 📄 许可证

MIT License

## 🙏 致谢

感谢以下开源项目：
- React Three Fiber
- Three.js
- MediaPipe
- Sharp
- Express
