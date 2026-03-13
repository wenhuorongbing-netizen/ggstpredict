# GGST 预测局 - Ubuntu VPS 部署指南

本指南将指导您如何在 Ubuntu VPS 上部署“GGST 预测局”全栈应用，包含 Next.js 前端和 Python FastAPI 后端。

## 1. 环境准备

首先，确保系统已更新并安装了 Node.js、Python 和 PM2。

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git python3 python3-pip python3-venv nginx

# 安装 Node.js (推荐 v20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2 (进程管理)
sudo npm install -g pm2
```

## 2. 克隆项目 & 配置环境变量

```bash
git clone <your-repo-url> ggst-predict
cd ggst-predict

# 创建 Next.js 环境变量
cat <<EOT > .env
DATABASE_URL="file:../dev.db"
EOT

# 创建 Python 后端环境变量 (Gemini API 密钥)
cat <<EOT > .env.local
GEMINI_API_KEY="your_google_gemini_api_key_here"
EOT
```

## 3. 部署 Python 后端 (AI Oracle)

我们将使用 Python 虚拟环境来隔离依赖。

```bash
# 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
playwright install
playwright install-deps

# 使用 PM2 启动 FastAPI 后端 (运行在 5000 端口)
pm2 start "source venv/bin/activate && uvicorn bot:app --host 0.0.0.0 --port 5000" --name "ggst-ai-bot"
```

## 4. 部署 Next.js 前端

```bash
# 安装 Node 依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 构建生产版本
npm run build

# 使用 PM2 启动 Next.js 前端 (运行在 3000 端口)
pm2 start npm --name "ggst-frontend" -- start
```

## 5. 配置 Nginx 反向代理

为了通过域名访问并处理端口转发（虽然 Next.js 已经在内部代理了 `/api/bot` 到 `5000` 端口，但我们需要 Nginx 代理外网请求到 `3000` 端口）。

```bash
sudo nano /etc/nginx/sites-available/ggst
```

输入以下配置（替换 `your_domain.com`）：

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/ggst /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. 保存 PM2 进程

确保服务器重启后自动恢复服务：

```bash
pm2 save
pm2 startup
```

**部署完成！** 现在可以通过您的域名访问 GGST 预测局了。
