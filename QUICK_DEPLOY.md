# 快速部署指南 - Vercel

## 准备工作（5分钟）

### 1. 注册GitHub账号（如果没有）
访问 https://github.com 注册一个账号

### 2. 上传代码到GitHub

在 E:\工具\paris-monitor 目录下运行：

```bash
# 如果还没有GitHub仓库，先在GitHub网站创建一个新仓库
# 然后运行以下命令：

git remote add origin https://github.com/你的用户名/paris-monitor.git
git branch -M main
git push -u origin main
```

## 部署到Vercel（3分钟）

### 方案A：通过网页部署（最简单）

1. 访问 https://vercel.com
2. 点击 "Sign Up" 使用GitHub账号登录
3. 点击 "Add New..." → "Project"
4. 选择 `paris-monitor` 仓库
5. 点击 "Deploy"
6. 等待1-2分钟，完成！

你会得到一个网址，比如：`https://paris-monitor-xxx.vercel.app`

### 方案B：使用命令行部署

```bash
# 1. 安装Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
cd E:\工具\paris-monitor
vercel

# 4. 按照提示操作，全部按回车使用默认值
```

## 配置环境变量（可选）

如果想修改密码，在Vercel项目设置中：

1. 进入项目 → Settings → Environment Variables
2. 添加变量：
   - Name: `AUTH_PASSWORD`
   - Value: `你的新密码`
3. 重新部署

## 部署成功后

1. 访问你的网址（比如 https://paris-monitor-xxx.vercel.app）
2. 输入密码：`991108`
3. 点击查询按钮测试功能
4. 把网址保存到手机收藏夹

## 常见问题

### Q: 密码存储安全吗？
A: 密码存储在浏览器本地，不会发送到其他地方。只有通过验证才能使用查询功能。

### Q: 可以修改密码吗？
A: 可以。在Vercel项目设置中修改 `AUTH_PASSWORD` 环境变量，然后重新部署。

### Q: 网站会过期吗？
A: Vercel免费版永久有效，但如果超过100GB流量/月会暂停（个人使用完全够用）。

### Q: 可以绑定自己的域名吗？
A: 可以。在Vercel项目设置 → Domains 中添加。

### Q: 忘记密码怎么办？
A: 清除浏览器缓存，或在开发者工具中运行：
```javascript
localStorage.removeItem('paris_monitor_password');
```
然后刷新页面重新输入。

## 紧急联系

如果部署遇到问题：
- Vercel文档：https://vercel.com/docs
- 联系我（告诉我具体错误信息）
