/**
 * web-scanner.ts — On-demand Git repo scanner.
 *
 * Migrated from SOTAgent/src/web-scanner.ts.
 * Scans all project repos for dashboard status display.
 */

import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const POLARISOR_ROOT = path.join(process.env.HOME || '~', 'Polarisor');

export interface IRepoStatus {
  name: string;
  path: string;
  branch: string;
  syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged' | 'no_remote';
  ahead: number;
  behind: number;
  dirty: number;
  remote: string;
  lastChecked: string;
}

export interface IScanResult {
  repos: IRepoStatus[];
  scannedAt: string;
}

async function run(cmd: string, cwd: string, timeoutMs = 8_000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, {
      cwd,
      timeout: timeoutMs,
      env: { ...process.env, GIT_SSH_COMMAND: 'ssh -o ConnectTimeout=3 -o BatchMode=yes' },
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function scanRepo(dirPath: string): Promise<IRepoStatus | null> {
  const gitDir = path.join(dirPath, '.git');
  if (!fs.existsSync(gitDir)) return null;

  const name = path.basename(dirPath);
  const branch = await run('git branch --show-current', dirPath) || 'detached';
  const remote = await run('git remote get-url origin', dirPath);

  await run('git fetch origin --quiet', dirPath, 5_000);

  const localHash = await run('git rev-parse --short HEAD', dirPath);
  const remoteHash = await run(`git rev-parse --short origin/${branch}`, dirPath);

  const ahead = parseInt(await run(`git rev-list origin/${branch}..HEAD --count`, dirPath), 10) || 0;
  const behind = parseInt(await run(`git rev-list HEAD..origin/${branch} --count`, dirPath), 10) || 0;
  const dirty = parseInt(await run('git status --porcelain | wc -l', dirPath), 10) || 0;

  let syncStatus: IRepoStatus['syncStatus'] = 'synced';
  if (!remote) syncStatus = 'no_remote';
  else if (ahead > 0 && behind > 0) syncStatus = 'diverged';
  else if (ahead > 0) syncStatus = 'ahead';
  else if (behind > 0) syncStatus = 'behind';

  return {
    name,
    path: dirPath,
    branch,
    syncStatus,
    ahead,
    behind,
    dirty,
    remote,
    lastChecked: new Date().toISOString(),
  };
}

export async function scanAllRepos(rootDir?: string): Promise<IScanResult> {
  const root = rootDir ?? POLARISOR_ROOT;
  const repos: IRepoStatus[] = [];

  if (!fs.existsSync(root)) {
    return { repos: [], scannedAt: new Date().toISOString() };
  }

  const entries = fs.readdirSync(root);
  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    if (entry.startsWith('.') || entry === 'node_modules') continue;

    const result = await scanRepo(fullPath);
    if (result) repos.push(result);
  }

  return {
    repos: repos.sort((a, b) => a.name.localeCompare(b.name)),
    scannedAt: new Date().toISOString(),
  };
}
