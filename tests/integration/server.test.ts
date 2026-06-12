import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CheckupAggregator } from '../../src/checkup-aggregator.js';
import { createApp } from '../../src/server.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const TEST_DIR = path.join(os.tmpdir(), `polarops-test-${Date.now()}`);
const TEST_JSONL = path.join(TEST_DIR, 'checkup-events.jsonl');

describe('PolarOps integration', () => {
  let aggregator: CheckupAggregator;

  beforeAll(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    aggregator = new CheckupAggregator({ filePath: TEST_JSONL });
  });

  afterAll(() => {
    try { fs.rmSync(TEST_DIR, { recursive: true }); } catch { /* ignore */ }
  });

  describe('CheckupAggregator', () => {
    it('appends events to jsonl', () => {
      const envelope = aggregator.append({
        event_id: 'test-1',
        project: 'TestProject',
        agent_target: 'test',
        page_url: 'http://localhost/test',
        user_text: 'test event',
        timestamp: new Date().toISOString(),
      });
      expect(envelope.event.event_id).toBe('test-1');
      expect(envelope.source).toBe('polarcop-hub');
    });

    it('counts events', () => {
      const count = aggregator.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('returns recent events', () => {
      const events = aggregator.recent(10);
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]!.event.event_id).toBe('test-1');
    });
  });

  describe('Hono app', () => {
    it('health check returns ok', async () => {
      const app = createApp(aggregator);
      const res = await app.fetch(new Request('http://localhost/api/health'));
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.service).toBe('polar-ops');
    });

    it('POST /api/checkup-events accepts valid event', async () => {
      const app = createApp(aggregator);
      const res = await app.fetch(new Request('http://localhost/api/checkup-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 'test-2',
          project: 'TestProject',
          agent_target: 'test',
          page_url: 'http://localhost/test',
          user_text: 'second event',
          timestamp: new Date().toISOString(),
        }),
      }));
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.event_id).toBe('test-2');
    });

    it('POST /api/checkup-events rejects invalid event', async () => {
      const app = createApp(aggregator);
      const res = await app.fetch(new Request('http://localhost/api/checkup-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      }));
      expect(res.status).toBe(400);
    });

    it('GET /api/checkup-events returns recent events', async () => {
      const app = createApp(aggregator);
      const res = await app.fetch(new Request('http://localhost/api/checkup-events'));
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('GET /api/digist/status returns status', async () => {
      const app = createApp(aggregator);
      const res = await app.fetch(new Request('http://localhost/api/digist/status'));
      const body = await res.json();
      expect(body).toHaveProperty('available');
      expect(body).toHaveProperty('dbPath');
    });

    it('GET /api/knowlever/status returns status', async () => {
      const app = createApp(aggregator);
      const res = await app.fetch(new Request('http://localhost/api/knowlever/status'));
      const body = await res.json();
      expect(body).toHaveProperty('available');
      expect(body).toHaveProperty('topics');
    });

    it('GET /api/scan returns scan result', async () => {
      // Use temp dir to avoid scanning the full Polarisor monorepo
      const scanTmpDir = path.join(os.tmpdir(), `polarops-scan-${Date.now()}`);
      fs.mkdirSync(scanTmpDir);
      const app = createApp(aggregator);
      const res = await app.fetch(new Request(`http://localhost/api/scan?root=${encodeURIComponent(scanTmpDir)}`));
      const body = await res.json();
      expect(body).toHaveProperty('repos');
      expect(body).toHaveProperty('scannedAt');
      expect(body.repos).toEqual([]);
      fs.rmdirSync(scanTmpDir);
    });
  });
});
