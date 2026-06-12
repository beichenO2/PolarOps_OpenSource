# PolarOps — 使用指南

> ⚠️ **项目状态：archived** — 模块功能已部分回归 SOTAgent，本 Skill 作为历史参考保留。
>
> Ops 监控、健康检查聚合、项目扫描 — 从 SOTAgent 迁出的运维监控模块。

## 核心功能

| 模块 | 职责 |
|---|---|
| checkup-aggregator | 聚合各项目健康检查结果 |
| digist-monitor | 监控 DiGist 爬虫状态 |
| knowlever-monitor | 监控 KnowLever 知识服务状态 |
| web-scanner | Web 可用性扫描 |
| server | HTTP API 统一入口 |

## 快速启动

```bash
cd ~/Polarisor/PolarOps
npm ci
npm start
```

## 常用 API

```bash
# 全局健康检查聚合
curl http://127.0.0.1:<PORT>/api/checkup

# DiGist 状态
curl http://127.0.0.1:<PORT>/api/monitor/digist

# KnowLever 状态
curl http://127.0.0.1:<PORT>/api/monitor/knowlever

# Web 可用性扫描结果
curl http://127.0.0.1:<PORT>/api/scanner/results
```

## 依赖

- Node.js v22+
- tsx（TypeScript 运行时）
- 上游监控对象：SOTAgent、DiGist、KnowLever、各 Web 服务

## 与 SOTAgent 的关系

PolarOps 是从 SOTAgent 中拆出的监控层：
- SOTAgent 负责服务发现 + 进程管理（控制面）
- PolarOps 负责健康聚合 + 告警（观测面）
