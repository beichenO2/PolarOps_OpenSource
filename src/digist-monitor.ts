/**
 * digist-monitor.ts — DiGist project monitoring bridge.
 *
 * Migrated from SOTAgent/src/digist-monitor.ts.
 * Reads digist.sqlite when present; optional DiGist API for /health + crawl trigger.
 */

import fs from 'node:fs';
import path from 'node:path';

const POLARISOR = path.join(process.env.HOME || '~', 'Polarisor');
const DIGIST_ROOT = path.join(POLARISOR, 'digist');
const DEFAULT_DB_PATH = path.join(DIGIST_ROOT, 'data', 'digist.sqlite');
const DIGIST_API_URL = (process.env.DIGIST_API_URL || 'http://127.0.0.1:4880').replace(/\/$/, '');

export interface IDigistStatus {
  available: boolean;
  dbPath: string;
  dbExists: boolean;
  totalItems: number;
  apiReachable: boolean;
  apiUrl: string;
}

export class DigistMonitor {
  private dbPath: string;
  private apiUrl: string;

  constructor(dbPath?: string, apiUrl?: string) {
    this.dbPath = dbPath ?? DEFAULT_DB_PATH;
    this.apiUrl = apiUrl ?? DIGIST_API_URL;
  }

  async getStatus(): Promise<IDigistStatus> {
    const dbExists = fs.existsSync(this.dbPath);
    let apiReachable = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.apiUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      apiReachable = res.ok;
    } catch {
      apiReachable = false;
    }

    return {
      available: dbExists,
      dbPath: this.dbPath,
      dbExists,
      totalItems: 0,
      apiReachable,
      apiUrl: this.apiUrl,
    };
  }
}
