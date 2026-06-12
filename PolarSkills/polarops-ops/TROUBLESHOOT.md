# PolarOps — 故障排查

> ⚠️ **项目状态：archived** — 本 Skill 作为历史参考保留。
>
> PolarOps 监控服务出问题时的诊断指南。

## 健康检查

```bash
# 进程存活
pgrep -f "PolarOps/src" || echo "NOT RUNNING"

# HTTP 端点
curl -s http://127.0.0.1:<PORT>/api/health
```

## 常见故障

### 1. 监控数据为空

**症状**：checkup 返回空数组或超时

**原因**：被监控的服务本身挂了，或 PolarOps 无法连接

**排查**：
```bash
# 检查各监控对象是否存活
curl -s http://127.0.0.1:4800/api/status   # SOTAgent
curl -s http://127.0.0.1:11050/api/health   # PolarPort
```

### 2. 启动失败

**症状**：模块加载错误

**修复**：
```bash
cd ~/Polarisor/PolarOps
rm -rf node_modules
npm ci
npm start
```

### 3. 扫描超时

**症状**：web-scanner 长时间不返回结果

**原因**：目标服务响应慢或网络问题

**修复**：检查 Tailscale 连接状态（跨设备扫描时）

## 日志位置

- 标准输出（前台运行时直接看终端）
- 如果有 launchd：`/tmp/polarops-*.log`

## 依赖服务

| 服务 | 用途 | 如果挂了 |
|---|---|---|
| SOTAgent | 服务发现（获取要监控的列表） | 无法自动发现新服务 |
| DiGist | 被监控对象 | digist-monitor 报 unreachable |
| KnowLever | 被监控对象 | knowlever-monitor 报 unreachable |
| Tailscale | 跨设备通信 | 远程设备监控失败 |

## 紧急恢复

```bash
cd ~/Polarisor/PolarOps
npm start
# 确认恢复
curl -s http://127.0.0.1:<PORT>/api/health
```
