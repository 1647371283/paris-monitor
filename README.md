# 巴黎安全监控

聚合过去 48 小时巴黎游行 / 冲突相关新闻（来源：Google 新闻 RSS，法语 + 英语），并附巴黎警察局、RATP 等官方渠道链接。

## 本地运行

```bash
npm install
AUTH_PASSWORD=你的密码 npm start
```

## 部署（Vercel）

导入仓库时在 Environment Variables 中设置 `ADMIN_PASSWORD`。密码只放在环境变量里，不要写进代码。
