# PolarOps Runtime Governance Design

## 目标

把 PolarOps 接入统一运行时治理：PolarPort 是唯一端口权威，PolarProcess 是唯一进程生命周期权威。本轮只完成代码、契约、测试和 stopped 状态注册，不启动服务、不申领端口、不影响其他项目。

## 现状与根因

`src/server.ts` 当前直接调用 PolarPort `/api/allocate`，但 PolarPort 不可用或分配失败时会静默回退到 `11065`。这使服务可以绕过端口权威。项目也没有前台 `Start/start.sh`，`package.json` 暴露直接启动的 `tsx` 命令，`polaris.json.service_management` 为 `null`，因此 PolarProcess 无法拥有唯一 PID 和声明健康探针。

## 方案比较

### 保留 server 内部分配，只删除 fallback

能阻止静默硬编码，但端口申领仍与进程入口耦合，无法复用生态统一 launcher 契约，不采用。

### 让 PolarProcess 直接运行带端口参数的 Node 命令

进程可受管，但端口参数会成为 PolarProcess 注册表中的第二份配置，容易与 PolarPort 和 `polaris.json` 漂移，不采用。

### 前台 launcher + 环境变量注入（采用）

新增 `Start/start.sh`。launcher 先检查 PolarPort，再申领 `polarops / PolarOps / 11065`，拒绝非 preferred 返回值，随后导出 `PORT` 并 `exec node dist/server.js`。server 不再访问 PolarPort，只校验并消费 `PORT`。PolarProcess 注册 launcher，保持 `auto_start=false` 和 stopped。

## 组件边界

- `Start/start.sh`：检查 PolarPort、申领并校验端口、前台 `exec`；不后台化、不写 PID 文件、不处理 stop/restart。
- `src/server.ts`：创建 Hono 应用、校验 `PORT`、监听 loopback、注册 capability；不分配端口。
- `package.json`：构建与测试保持 transient；持久启动入口统一指向 `Start/start.sh`。
- `polaris.json`：记录 service ID、preferred 端口、健康端点、迁移状态和验证证据。
- PolarProcess：唯一生命周期所有者；本轮只创建 stopped 注册记录。

## 数据流

1. PolarProcess 运行 `bash Start/start.sh`。
2. launcher 检查 `http://127.0.0.1:11050/api/health`。
3. launcher 通过共享 `port-claim.sh` 申领 preferred `11065`。
4. launcher 验证端口未漂移，设置 `PORT=11065` 并用 `exec` 替换自身。
5. `dist/server.js` 校验 `PORT` 后监听 `127.0.0.1`，健康端点为 `/api/health`。

## 失败边界

- PolarPort 不健康：launcher 失败，不触发 legacy preferred-port fallback。
- PolarPort 返回非 `11065`：释放本次申领并失败，避免健康端点与实际端口不一致。
- build 工件不存在：launcher 失败并提示先执行 install/build，不临时运行源码。
- `PORT` 缺失或非法：server 在监听前失败，不使用默认值。
- capability 注册失败：保持现有可选行为，只记录日志，不改变运行时权威。

## 验证

- TDD 覆盖 launcher 的 claim/foreground/禁止命令契约、SSoT 对齐和 server 的 `PORT` 校验。
- 运行 `npm test`、`npm run build`、`bash -n Start/start.sh` 和治理审计。
- 注册后确认 PolarProcess 为 stopped、PID 为空、`auto_start=false`；PolarPort 无 active 记录；`11065` 无 listener。
