/**
 * server.ts — PolarOps Hono server.
 *
 * Mounts checkup/digist/knowlever/scan endpoints.
 * The governed launcher injects the PolarPort-claimed port through PORT.
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CheckupAggregator } from './checkup-aggregator.js';
import { DigistMonitor } from './digist-monitor.js';
import { KnowLeverMonitor } from './knowlever-monitor.js';
import { scanAllRepos } from './web-scanner.js';

const DATA_DIR = process.env.POLAROPS_DATA_DIR
  ?? path.join(process.env.HOME ?? '', 'Polarisor', 'PolarOps', 'data');

export function resolveRuntimePort(value: string | undefined): number {
  const port = Number(value);
  if (!value || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function isServerEntrypoint(moduleUrl: string, argvPath: string | undefined): boolean {
  return Boolean(argvPath && moduleUrl === pathToFileURL(path.resolve(argvPath)).href);
}

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
  const port = resolveRuntimePort(process.env.PORT);

  serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
    console.log(`PolarOps listening on http://127.0.0.1:${info.port}`);
  });

  await registerCapabilities();
}

if (isServerEntrypoint(import.meta.url, process.argv[1])) {
  void main();
}
