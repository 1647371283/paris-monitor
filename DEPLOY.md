# 部署指南

## 方案一：Vercel (推荐，最简单)

### 步骤
1. 访问 https://vercel.com
2. 使用GitHub/GitLab/Bitbucket登录
3. 点击 "Add New Project"
4. 导入这个项目
5. 点击 "Deploy"

**优点**：
- 完全免费
- 自动HTTPS
- 全球CDN加速
- 部署只需1分钟

**结果**：
你会得到一个类似 `https://paris-monitor-xxx.vercel.app` 的网址

---

## 方案二：Render

### 步骤
1. 访问 https://render.com
2. 注册并登录
3. 点击 "New +" → "Web Service"
4. 连接GitHub仓库或选择 "Public Git repository"
5. 填写：
   - Name: `paris-monitor`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. 点击 "Create Web Service"

**优点**：
- 免费套餐
- 自动HTTPS
- 简单易用

**结果**：
你会得到一个类似 `https://paris-monitor.onrender.com` 的网址

---

## 方案三：Railway

### 步骤
1. 访问 https://railway.app
2. 使用GitHub登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择这个项目
6. Railway会自动检测并部署

**优点**：
- 每月$5免费额度
- 配置简单
- 性能好

---

## 无服务器？本地运行

如果你有一台一直开着的电脑或树莓派：

```bash
cd E:\工具\paris-monitor
npm start
```

然后在同一网络下的手机浏览器访问：
```
http://你的电脑IP:3000
```

查看IP地址：
- Windows: 在cmd运行 `ipconfig` 看IPv4地址
- Mac/Linux: 运行 `ifconfig` 或 `ip addr`

---

## 推荐流程

1. **现在就试试**：本地运行测试功能
2. **部署到Vercel**：获得永久网址（5分钟搞定）
3. **保存到手机**：添加到主屏幕，像App一样使用

---

## 需要帮助？

- Vercel部署遇到问题：查看 https://vercel.com/docs
- 想要自定义域名：在部署平台的设置中添加
- 需要更多功能：告诉我你的需求
