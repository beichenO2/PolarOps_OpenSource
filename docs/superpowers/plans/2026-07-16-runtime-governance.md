# PolarOps Runtime Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PolarPort and PolarProcess the only runtime authorities for PolarOps without starting the service during migration.

**Architecture:** A foreground Bash launcher claims the declared preferred port and injects it through `PORT`. The TypeScript server validates that injected value and never allocates or falls back to a port; PolarProcess owns the launcher as a stopped service registration.

**Tech Stack:** TypeScript, Hono, Node.js, Vitest, Bash, PolarPort, PolarProcess, polaris.json.

---

### Task 1: Record the approved design and active SSoT

**Files:**
- Create: `docs/superpowers/specs/2026-07-16-runtime-governance-design.md`
- Create: `docs/superpowers/plans/2026-07-16-runtime-governance.md`
- Modify: `polaris.json`

- [x] Document the alternatives, selected architecture, failure boundaries and no-start constraint.
- [x] Add R3 runtime governance with `status: in-progress` and define `service_management`.
- [x] Run `jq empty polaris.json`; expect exit 0.
- [x] Commit the design and active SSoT.

### Task 2: Remove server-side port authority with TDD

**Files:**
- Modify: `tests/integration/server.test.ts`
- Modify: `src/server.ts`

- [x] Add tests asserting a valid injected port is accepted and a missing, non-numeric or out-of-range port is rejected:

```ts
describe('runtime port configuration', () => {
  it('accepts a valid injected port', () => {
    expect(resolveRuntimePort('11065')).toBe(11065);
  });

  it.each([undefined, '', 'abc', '0', '65536', '11065.5'])('rejects invalid PORT %s', (value) => {
    expect(() => resolveRuntimePort(value)).toThrow('PORT must be an integer between 1 and 65535');
  });
});
```

- [x] Run `npm test -- tests/integration/server.test.ts`; expect RED because `resolveRuntimePort` is not exported.
- [x] Add `resolveRuntimePort`, remove PolarPort allocation/fallback code, and consume only `process.env.PORT`:

```ts
export function resolveRuntimePort(value: string | undefined): number {
  const port = Number(value);
  if (!value || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}
```

- [x] Replace `await claimPort()` in `main()` with `resolveRuntimePort(process.env.PORT)` and delete `DEFAULT_PORT`, `POLARPORT_URL`, and `claimPort()`.
- [x] Run the focused test; expect GREEN.
- [x] Commit the server behavior change.

### Task 3: Add the governed foreground launcher with TDD

**Files:**
- Create: `tests/runtime-governance.test.ts`
- Create: `Start/start.sh`
- Modify: `package.json`
- Modify: `README.md`

- [x] Add contract tests for the PolarPort health gate, `claim_port`, preferred-port guard, foreground `exec`, forbidden lifecycle commands, package entrypoints and SSoT alignment:

```ts
const launcher = readFileSync(resolve(root, 'Start/start.sh'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const polaris = JSON.parse(readFileSync(resolve(root, 'polaris.json'), 'utf8'));

expect(launcher).toContain('$POLARPORT_URL/api/health');
expect(launcher).toContain('claim_port "polarops" "PolarOps" 11065');
expect(launcher).toContain('exec node dist/server.js');
expect(launcher).not.toMatch(/\bnohup\b|\bpkill\b|\bkillall\b|\bkill\s|&\s*$/m);
expect(pkg.scripts.start).toBe('bash Start/start.sh');
expect(pkg.scripts.dev).toBe('bash Start/start.sh');
expect(polaris.service_management).toMatchObject({
  service_id: 'polarops',
  preferred_port: 11065,
  health_endpoint: 'http://127.0.0.1:11065/api/health',
  auto_start: false,
});
```

- [x] Run `npm test -- tests/runtime-governance.test.ts`; expect RED because `Start/start.sh` is absent.
- [x] Implement the launcher and route persistent package scripts through it. The launcher must contain this control flow:

```bash
if ! curl -fsS --max-time 3 "$POLARPORT_URL/api/health" >/dev/null; then
  echo "PolarPort is unavailable; refusing preferred-port fallback" >&2
  exit 1
fi

source "$HOME/Polarisor/Agent_core/scripts/port-claim.sh"
PORT=$(claim_port "polarops" "PolarOps" 11065)
if [ "$PORT" -ne "$PREFERRED_PORT" ]; then
  release_port "$PORT"
  echo "PolarPort returned $PORT, but PolarOps SSoT requires preferred port $PREFERRED_PORT" >&2
  exit 1
fi

export PORT
exec node dist/server.js
```
- [x] Update README lifecycle ownership and no-direct-start guidance.
- [x] Run focused tests and `bash -n Start/start.sh`; expect GREEN and exit 0.
- [x] Commit the launcher and documentation.

### Task 4: Verify, register stopped, and close SSoT

**Files:**
- Modify: `polaris.json`

- [x] Run all tests, build, JSON checks, shell syntax check and the project governance audit.
- [x] Merge the isolated branch into `main` without staging `screenshots/checkup-events.png`.
- [x] Register `polarops` through PolarProcess with `auto_start:false`; do not call a start endpoint.
- [x] Confirm stopped status, null PID, no PolarPort active record and no listener on `11065`.
- [x] Set R3 to `done` with dated evidence and commit only SSoT files.
- [x] Rerun verification and the project audit from canonical `main`.

### Task 5: Update ecosystem SSoT

**Files:**
- Modify: `~/Polarisor/Agent_core/docs/audits/2026-07-16-polar-runtime-governance-baseline.md`
- Modify: `~/Polarisor/Agent_core/polaris.json`

- [x] Record the PolarOps migration evidence and post-migration ecosystem audit snapshots.
- [x] Run the global read-only governance audit.
- [x] Commit only the Agent_core SSoT updates.
