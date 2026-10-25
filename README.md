# Paris Protest Monitor 巴黎游行监控

[![Auto Update](https://github.com/1647371283/paris-monitor/actions/workflows/update-data.yml/badge.svg)](https://github.com/1647371283/paris-monitor/actions/workflows/update-data.yml)

实时监控巴黎游行和示威活动，帮助你安全规划行程。

## 🌐 在线访问

访问地址：**https://1647371283.github.io/paris-monitor/**

每6小时自动更新一次数据。

## 📱 功能特性

- 📅 按时间线显示游行事件
- 📍 标注受影响的区域（1-20区）
- 🏛️ 标记涉及的地标和景点
- ⚠️ 严重程度评估（信息/示威/冲突）
- 🗺️ 巴黎20区详细说明

## ⚙️ 自动更新

系统每6小时自动从以下来源抓取最新数据：
- Google News: "manifestation Paris" / "grève Paris"
- 法国主流媒体报道
- 官方公告

更新时间（北京时间）：
- 02:37
- 08:37
- 14:37
- 20:37

## 🔧 本地运行

```bash
# 安装依赖
npm install

# 手动更新数据
node scripts/fetch-news.js

# 打开 docs/index.html 查看
```

## 📊 数据说明

- **upcoming**: 未来计划的游行
- **recent**: 最近的游行报道
- **severity**: 
  - `info`: 一般信息
  - `medium`: 示威活动
  - `high`: 有冲突报道

## 📝 License

MIT
