# PolarOps

> **Polarisor 生态的运维监控聚合器** — 在多项目、多 Agent 并行开发时，统一回答「各项目健康吗、检修事件去哪查、Git 仓库有没有漂移」。

监控与进程守护是不同职责：PolarProcess 负责「让进程活着」，PolarOps 负责「观测状态并持久化异常」。从 SOTAgent 迁移 checkup-aggregator、digist-monitor、knowlever-monitor、web-scanner 四个模块，接收 PolarCopilot Hub 转发的跨项目检修事件，为 Dashboard Checkup Widget 提供数据后端。

**GitHub:** [beichenO2/PolarOps](https://github.com/beichenO2/PolarOps)

---

## 安装

### Polarisor 生态（推荐）

```bash
git clone https://github.com/beichenO2/Polarisor.git
cd Polarisor
./install.sh infra    # 安装 PolarOps 及基础设施依赖
```

### 独立安装

```bash
git clone https://github.com/beichenO2/PolarOps.git
cd PolarOps
npm install
```

**环境要求：** Node.js ≥ 22 · 端口由 PolarPort 分配（默认 **11065**）

---

## 设计思考

### 为什么从 SOTAgent 分拆，而不是继续内嵌监控？

SOTAgent 同时承担进程管理和监控聚合时，改动监控逻辑有影响守护稳定性的风险。拆出 PolarOps 后：**守护**（PolarProcess）与**观测**（PolarOps）职责分离，监控服务重启不丢历史数据。

### 为什么用 append-only jsonl，而不是实时内存队列？

检修事件需要跨 Hub 会话追溯。CheckupAggregator 以 append-only 写入 `checkup-events.jsonl`，服务重启后历史可查；PolarCopilot Checkup Widget 按需拉取 recent N 条，无需 Redis 或消息中间件。

### 为什么监控与自动重启分离，而不是检测失败就 kill？

DiGist / KnowLever 的「编译失败」「队列积压」是**业务级异常**，不等于进程崩溃。PolarOps 聚合事件供 Agent 决策；真正 restart 由 PolarProcess Watchdog 在 HTTP 探针连续失败时触发——避免误杀正在排队的长任务。

---

## 核心亮点

| 维度 | 数据 |
|------|------|
| **REST API** | **8** 个端点（checkup · digist · knowlever · scan · health） |
| **能力注册** | **5** 个 HTTP capability |
| **监控模块** | **4** 个（CheckupAggregator · DiGistMonitor · KnowLeverMonitor · WebScanner） |
| **检修事件** | append-only **jsonl** 持久化；契约对齐 `Agent_core/contracts/checkup-event.schema.json` |
| **仓库扫描** | 按需扫描 Polarisor 根目录全部 Git 仓库（分支/sync/dirty 状态） |
| **自动化测试** | **11** 个测试（7 集成 + 4 契约，Vitest + AJV） |
| **默认端口** | **11065**（`polar-ops` / PolarOps） |

---

## 架构

```
PolarOps/
├── src/
│   ├── checkup-aggregator.ts    # 跨项目检修事件 append-only 聚合
│   ├── digist-monitor.ts        # DiGist 爬取/队列状态监控
│   ├── knowlever-monitor.ts     # KnowLever 编译/Wiki 管道监控
│   ├── web-scanner.ts           # Git 仓库健康扫描（分支/sync/dirty）
│   └── server.ts                # Hono HTTP 服务（默认 :11065）
├── contracts/
│   ├── checkup-api.schema.json  # 检修事件契约
│   ├── monitor-api.schema.json  # 监控状态契约
│   └── examples/
├── tests/
│   ├── integration/             # HTTP 集成测试
│   └── contracts/               # JSON Schema 校验
├── data/                        # checkup-events.jsonl（gitignored）
├── capabilities.json            # 5 个 HTTP capability
├── polaris.json                 # SSoT 需求定义（R1–R2）
├── PolarSoul.md                 # 设计灵魂与决策记录
```

**数据流：**

```
PolarCopilot Hub ──POST /api/checkup-events──▶ PolarOps (:11065)
        │                                           │
   Checkup Widget                            checkup-events.jsonl
        │                                           │
        └──────── GET /api/checkup-events ◀─────────┘

DiGist / KnowLever ──status probe──▶ /api/digist/* · /api/knowlever/*
Polarisor repos    ──git scan───▶ /api/scan
```

---

## 快速开始

```bash
npm install
npm run dev           # 开发模式（tsx --watch）
npm run start         # 生产启动（端口由 PolarPort 分配）
npm test              # 11 个契约 + 集成测试
```

常用 API：

```bash
# 健康检查
curl http://127.0.0.1:11065/api/health

# 接收检修事件（PolarCopilot Hub 转发）
curl -X POST http://127.0.0.1:11065/api/checkup-events \
  -H 'Content-Type: application/json' \
  -d '{"event_id":"evt-001","project":"PolarClaw","agent_target":"hub-agent-1","page_url":"http://127.0.0.1:8040/pc/","user_text":"按钮无响应","timestamp":"2026-06-11T12:00:00+08:00"}'

# 查询最近检修事件
curl 'http://127.0.0.1:11065/api/checkup-events?limit=20'

# DiGist / KnowLever 监控状态
curl http://127.0.0.1:11065/api/digist/status
curl http://127.0.0.1:11065/api/knowlever/status

# 扫描 Polarisor 全部 Git 仓库
curl http://127.0.0.1:11065/api/scan
```

---

## 生态依赖

| 项目 | 角色 | 是否必须 |
|------|------|----------|
| [PolarPort](https://github.com/beichenO2/PolarPort) | 启动时端口分配 | 推荐 |
| [PolarCopilot](https://github.com/beichenO2/PolarCopilot) | Hub 检修事件转发来源 + Checkup Widget 消费方 | 推荐 |
| [Agent_core](https://github.com/beichenO2/Agent_core) | `checkup-event` 契约与共享脚本 | 推荐 |
| [SOTAgent](https://github.com/beichenO2/SOTAgent) | capability 注册与生态服务发现 | 可选 |
| [PolarProcess](https://github.com/beichenO2/PolarProcess) | 进程守护（与监控职责分离，不直接依赖） | 可选 |

---

## License

MIT
