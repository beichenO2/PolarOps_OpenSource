# PolarOps — PolarSoul

## 设计哲学

PolarOps 是 Polarisor 的运维监控聚合器，从 SOTAgent 分拆出来专门负责健康检查、状态聚合和检修事件管理。

- **监控独立于守护**: SOTAgent 负责进程守护，PolarOps 负责状态观测——职责分离，防止 SOTAgent 过重
- **持久化监控数据**: 监控结果写入存储，支持历史查询和趋势分析，不依赖实时状态
- **检修事件驱动**: 所有异常通过 checkup-event 标准化，PolarCopilot Hub 消费并展示

## 功能介绍

- **生态位**: 运维状态的统一观测点，所有项目的健康数据在这里汇聚
- **承担功能**:

| 编号 | 功能域 | 说明 |
|---|---|---|
| R1 | checkup-event 聚合 | 接收各项目的检修事件，标准化存储，供 Hub 展示 |
| R2 | digist 监控 | 监控 digist 爬取状态、队列深度、错误率 |
| R3 | KnowLever 监控 | 监控编译状态、Wiki 构建质量、检索延迟 |
| R4 | 项目仓库扫描 | 定期扫描 Git 状态、未提交变更、分支健康 |

## 与其他项目的关系

- **从 SOTAgent 迁移而来**: R1-R4 原为 SOTAgent 的 R5（辅助服务与集成）中的监控模块
- **供 PolarCopilot 消费**: Hub Dashboard 的 Checkup Widget 从 PolarOps 获取数据
- **依赖 SOTAgent**: 端口分配和服务注册

## 关键设计决策

### Why 从 SOTAgent 分拆

**问题**: SOTAgent 同时承担进程管理和监控聚合，职责过重，改动监控逻辑时有影响守护进程稳定性的风险。

**决策**: 监控逻辑独立为 PolarOps，SOTAgent 专注于进程守护。

**不可妥协**: 监控数据必须持久化，不能只存内存——服务重启后监控历史不能丢失。

## 依赖与被依赖

### 依赖

| 依赖项 | 说明 |
|---|---|
| SOTAgent | 端口分配、服务注册 |

### 被依赖

| 被依赖项 | 说明 |
|---|---|
| PolarCopilot | Hub Dashboard 的 Checkup Widget |

---

## 详情入口

- [SSoT](polaris.json)
