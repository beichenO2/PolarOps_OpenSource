/**
 * server.ts — PolarOps Hono server.
 *
 * Mounts checkup/digist/knowlever/scan endpoints.
 * Allocates a port via PolarPort HTTP API on startup.
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import path from 'node:path';
import os from 'node:os';
import { CheckupAggregator } from './checkup-aggregator.js';
import { DigistMonitor } from './digist-monitor.js';
import { KnowLeverMonitor } from './knowlever-monitor.js';
import { scanAllRepos } from './web-scanner.js';

const DATA_DIR = process.env.POLAROPS_DATA_DIR
  ?? path.join(process.env.HOME ?? '', 'Polarisor', 'PolarOps', 'data');
const DEFAULT_PORT = Number(process.env.POLAROPS_PORT ?? 11065);
const POLARPORT_URL = process.env.POLARPORT_URL ?? 'http://127.0.0.1:11050';

export function createApp(aggregator: CheckupAggregator): Hono {
  const app = new Hono();
  const digistMonitor = new DigistMonitor();
  const knowleverMonitor = new KnowLeverMonitor();

  // ─── Health ──────────────────────────────────────
  app.get('/api/health', (c) => c.json({ ok: true, service: 'polar-ops' }));

  // ─── Checkup Events ──────────────────────────────
  app.post('/api/checkup-events', async (c) => {
    const event = await c.req.json();
    if (!event.event_id || !event.project || !event.timestamp) {
      return c.json({ ok: false, message: 'missing required fields: event_id, project, timestamp' }, 400);
    }
    const envelope = aggregator.append(event);
    return c.json({ ok: true, event_id: envelope.event.event_id, received_at: envelope.received_at });
  });

  app.get('/api/checkup-events', (c) => {
    const limit = parseInt(c.req.query('limit') ?? '50');
    const events = aggregator.recent(limit);
    return c.json(events);
  });

  // ─── DiGist Monitoring ───────────────────────────
  app.get('/api/digist/status', async (c) => {
    const status = await digistMonitor.getStatus();
    return c.json(status);
  });

  app.get('/api/digist/interests', async (c) => {
    const status = await digistMonitor.getStatus();
    return c.json({ available: status.available, interests: [] });
  });

  // ─── KnowLever Monitoring ────────────────────────
  app.get('/api/knowlever/status', async (c) => {
    const status = await knowleverMonitor.getStatus();
    return c.json(status);
  });

  app.get('/api/knowlever/topics', async (c) => {
    const status = await knowleverMonitor.getStatus();
    return c.json(status.topics);
  });

  // ─── Web Scanning ────────────────────────────────
  app.get('/api/scan', async (c) => {
    const rootDir = c.req.query('root') ?? undefined;
    const result = await scanAllRepos(rootDir);
    return c.json(result);
  });

  return app;
}

async function claimPort(): Promise<number> {
  try {
    const r = await fetch(`${POLARPORT_URL}/api/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_name: 'polar-ops',
        project: 'PolarOps',
        preferred_port: DEFAULT_PORT,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const data = (await r.json()) as { ok?: boolean; port?: number };
      if (data.ok && typeof data.port === 'number') return data.port;
    }
  } catch { /* PolarPort unreachable — fall back */ }
  return DEFAULT_PORT;
}

async function registerCapabilities(): Promise<void> {
  const sotagentBase = process.env.SOTAGENT_URL ?? 'http://127.0.0.1:4800';
  try {
    const caps = (await import('../capabilities.json', { with: { type: 'json' } })).default;
    await fetch(`${sotagentBase}/api/capabilities/register-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: 'PolarOps',
        service_name: 'polar-ops',
        capabilities: caps.capabilities,
      }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[PolarOps] Capabilities registered with SOTAgent`);
  } catch {
    console.log(`[PolarOps] SOTAgent not reachable, skipping capability registration`);
  }
}

async function main(): Promise<void> {
  const aggregator = new CheckupAggregator();
  const app = createApp(aggregator);
  const port = await claimPort();

  serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
    console.log(`PolarOps listening on http://127.0.0.1:${info.port}`);
  });

  await registerCapabilities();
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  void main();
}
