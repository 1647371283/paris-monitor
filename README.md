# 巴黎安全监控 | Paris Safety Monitor

实时监控巴黎游行暴乱信息的Web应用

## 功能特性

- 🔍 实时搜索法国主流媒体和官方渠道
- 📱 移动端友好的响应式设计
- ⚠️ 自动分类游行风险等级（高危/警告/安全）
- 🕐 按需查询，随时获取最新信息

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

服务器将运行在 `http://localhost:3000`

### 部署到云服务器

推荐使用以下平台（都有免费额度）：

#### 1. Vercel (最简单)
```bash
npm install -g vercel
vercel
```

#### 2. Railway
- 访问 https://railway.app
- 连接GitHub仓库
- 自动部署

#### 3. Render
- 访问 https://render.com
- 创建新的Web Service
- 连接仓库并部署

## 使用说明

1. 打开网页（部署后会得到一个URL）
2. 点击"查询最新信息"按钮
3. 系统会自动搜索并整理信息
4. 将网址保存到手机浏览器收藏夹

## 监控范围

- **时间**：2026年11月3日 - 11月9日
- **信息源**：
  - 法国主流媒体（Le Monde, Le Figaro, France24）
  - 社交平台实时消息
  - 官方通告

## 技术栈

- 后端：Node.js + Express
- 前端：原生HTML/CSS/JavaScript
- 搜索：DuckDuckGo（无需API密钥）

## 注意事项

- 搜索需要10-20秒，请耐心等待
- 建议每4-6小时查询一次
- 信息仅供参考，以官方通告为准

## License

MIT
