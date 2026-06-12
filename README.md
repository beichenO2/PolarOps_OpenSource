# PolarOps

Ops monitoring, checkup aggregation, and project health scanning for the Polarisor ecosystem.

Migrated from SOTAgent's `checkup-aggregator.ts`, `digist-monitor.ts`, `knowlever-monitor.ts`, and `web-scanner.ts`.

## Endpoints

### Checkup Events
- `POST /api/checkup-events` — receive checkup events from PolarCopilot Hub

### DiGist Monitoring
- `GET /api/digist/status` — DiGist monitoring status
- `GET /api/digist/interests` — list DiGist interests
- `POST /api/digist/interests/:id/crawl` — trigger interest crawl

### KnowLever Monitoring
- `GET /api/knowlever/status` — KnowLever pipeline status
- `GET /api/knowlever/topics` — list topics with pipeline status
- `POST /api/knowlever/topics/:id/compile` — trigger topic compile

### Web Scanning
- `GET /api/scan` — scan all project repos

### Health
- `GET /api/health` — service health check

## Quick Start

```bash
npm install
npm run dev
```

The server starts on a port allocated by PolarPort.
