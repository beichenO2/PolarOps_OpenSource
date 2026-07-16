import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const launcherPath = resolve(root, 'Start/start.sh');

describe('runtime governance contract', () => {
  test('launcher claims the declared port and stays in the foreground', () => {
    expect(existsSync(launcherPath)).toBe(true);
    const launcher = readFileSync(launcherPath, 'utf8');

    expect(launcher).toContain('$POLARPORT_URL/api/health');
    expect(launcher).toContain(
      'source "$HOME/Polarisor/Agent_core/scripts/port-claim.sh"',
    );
    expect(launcher).toContain('claim_port "polarops" "PolarOps" 11065');
    expect(launcher).toContain('release_port "$PORT"');
    expect(launcher).toContain('exec node dist/server.js');
    expect(launcher).not.toMatch(
      /\bnohup\b|\bpkill\b|\bkillall\b|(^|\s)kill\s|&\s*$/m,
    );
    expect(launcher).not.toContain('.pid');
  });

  test('package entrypoints and SSoT use the governed launcher', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const polaris = JSON.parse(readFileSync(resolve(root, 'polaris.json'), 'utf8'));

    expect(pkg.scripts.start).toBe('bash Start/start.sh');
    expect(pkg.scripts.dev).toBe('bash Start/start.sh');
    expect(polaris.service_management).toMatchObject({
      service_id: 'polarops',
      start_command: 'bash Start/start.sh',
      preferred_port: 11065,
      health_endpoint: 'http://127.0.0.1:11065/api/health',
      auto_start: false,
    });
  });
});
