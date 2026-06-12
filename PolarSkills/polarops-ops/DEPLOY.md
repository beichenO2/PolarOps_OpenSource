# PolarOps — 部署指南

> ⚠️ **项目状态：archived** — 本 Skill 作为历史参考保留。
>
> 运维监控服务部署。当前无 launchd 托管（按需手动启动或由 PolarProcess Watchdog 管理）。

## 环境要求

| 依赖 | 版本 | 安装方式 |
|---|---|---|
| Node.js | v22+ | nvm install 22 |
| npm | 附带 Node | — |
| tsx | package.json | npm ci |

## 安装步骤

```bash
cd ~/Polarisor/PolarOps
npm ci
```

## 启动方式

当前无 launchd plist，两种启动方式：

### 方式 1：手动前台启动
```bash
cd ~/Polarisor/PolarOps
npm start
```

### 方式 2：通过 PolarProcess 托管
```bash
# 如果 PolarProcess 已接入
curl -X POST http://127.0.0.1:<process-port>/api/tasks \
  -d '{"command": "npm start", "cwd": "~/Polarisor/PolarOps", "name": "polarops"}'
```

## 端口分配

PolarOps 端口通过 PolarPort SDK 动态分配，或通过环境变量指定：
- 环境变量：`POLAROPS_PORT`（如未指定则动态分配）

## 配置

- 监控目标列表来自 SOTAgent 服务发现 API
- 扫描间隔默认 60s
- 无独立配置文件（读取 polaris.json 中各项目的 health_endpoint）

## 健康检查确认

```bash
curl -s http://127.0.0.1:<PORT>/api/health
```

## 未来计划

- 添加 launchd plist 实现常驻
- 告警通知集成（通过 PolarClaw 飞书通道）

## 回滚方式

```bash
cd ~/Polarisor/PolarOps
git log --oneline -5
git checkout <previous-commit>
npm ci
npm start
```
