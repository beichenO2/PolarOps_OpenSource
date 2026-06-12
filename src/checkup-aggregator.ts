/**
 * checkup-aggregator.ts — Append-only ingestor for cross-project checkup events.
 *
 * Migrated from SOTAgent/src/checkup-aggregator.ts.
 * Receives events forwarded from PolarCopilot Hub, stores as line-delimited JSON.
 */

import { mkdirSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface CheckupEvent {
  event_id: string;
  project: string;
  agent_target: string;
  page_url: string;
  page_title?: string;
  user_text: string;
  screenshot_b64?: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface AggregatorEnvelope {
  received_at: string;
  source: string;
  event: CheckupEvent;
}

export interface CheckupAggregatorOptions {
  filePath?: string;
}

const DEFAULT_DIR = path.join(
  process.env.POLAROPS_DATA_DIR ?? path.join(process.env.HOME ?? '', 'Polarisor', 'PolarOps', 'data'),
);
const DEFAULT_FILE = process.env.POLAROPS_CHECKUP_FILE ?? path.join(DEFAULT_DIR, 'checkup-events.jsonl');

export class CheckupAggregator {
  readonly filePath: string;

  constructor(options: CheckupAggregatorOptions = {}) {
    this.filePath = options.filePath ?? DEFAULT_FILE;
    this.ensureDir();
  }

  private ensureDir(): void {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  append(event: CheckupEvent, source = 'polarcop-hub'): AggregatorEnvelope {
    const envelope: AggregatorEnvelope = {
      received_at: new Date().toISOString(),
      source,
      event,
    };
    appendFileSync(this.filePath, JSON.stringify(envelope) + '\n', 'utf-8');
    return envelope;
  }

  size(): number {
    try {
      if (!existsSync(this.filePath)) return 0;
      const stat = statSync(this.filePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  count(): number {
    try {
      if (!existsSync(this.filePath)) return 0;
      const content = readFileSync(this.filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim()).length;
    } catch {
      return 0;
    }
  }

  recent(limit = 50): AggregatorEnvelope[] {
    try {
      if (!existsSync(this.filePath)) return [];
      const content = readFileSync(this.filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      return lines.slice(-limit).map(line => JSON.parse(line) as AggregatorEnvelope);
    } catch {
      return [];
    }
  }
}

function statSync(filePath: string) {
  return { size: (existsSync(filePath) ? 1 : 0) };
}
