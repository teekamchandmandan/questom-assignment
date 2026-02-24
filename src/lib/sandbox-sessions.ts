import { Sandbox } from '@vercel/sandbox';
import { SANDBOX_TIMEOUT, SANDBOX_SESSION_TTL } from './constants';
import type { Runtime, SandboxInstance, SandboxSession } from './sandbox-types';

// ── Global session storage ───────────────────────────────────────────
// Use globalThis so all Next.js API route bundles share the same Map
// (turbopack compiles each route separately, so module-level singletons
// are NOT shared between /api/chat and /api/sandbox/*).

const globalKey = Symbol.for('sandbox-sessions');
const timerKey = Symbol.for('sandbox-cleanup-timer');

type GlobalWithSandbox = typeof globalThis & {
  [k: symbol]: unknown;
};

export function getSessions(): Map<string, SandboxSession> {
  const g = globalThis as GlobalWithSandbox;
  if (!g[globalKey]) {
    g[globalKey] = new Map<string, SandboxSession>();
  }
  return g[globalKey] as Map<string, SandboxSession>;
}

// Periodic cleanup interval (runs every 60 s)
function startCleanupTimer() {
  const g = globalThis as GlobalWithSandbox;
  if (g[timerKey]) return;
  g[timerKey] = setInterval(() => {
    const sessions = getSessions();
    const now = Date.now();
    for (const [key, session] of sessions) {
      if (now - session.lastUsed > SANDBOX_SESSION_TTL) {
        session.sandbox.stop().catch(() => {});
        sessions.delete(key);
      }
    }
    // Stop the interval when there are no sessions left
    if (sessions.size === 0 && g[timerKey]) {
      clearInterval(g[timerKey] as ReturnType<typeof setInterval>);
      g[timerKey] = undefined;
    }
  }, 60_000);
}

export function sessionKey(conversationId: string, runtime: Runtime): string {
  return `${conversationId}:${runtime}`;
}

export async function getOrCreateSandbox(
  conversationId: string,
  runtime: Runtime,
): Promise<SandboxInstance> {
  const sessions = getSessions();
  const key = sessionKey(conversationId, runtime);
  const existing = sessions.get(key);

  if (existing) {
    existing.lastUsed = Date.now();
    return existing.sandbox;
  }

  const sandbox = await Sandbox.create({
    runtime,
    timeout: SANDBOX_TIMEOUT,
  });

  sessions.set(key, {
    sandbox,
    lastUsed: Date.now(),
    runtime,
  });

  startCleanupTimer();
  return sandbox;
}

// ── Reconnect helper ─────────────────────────────────────────────────
// In serverless environments, the in-memory session map is not shared
// across function instances. Use Sandbox.get() to reconnect via the
// sandbox ID that the client received in tool results.

async function reconnectSandbox(
  sandboxId: string,
): Promise<SandboxInstance | null> {
  try {
    return (await Sandbox.get({ sandboxId })) as SandboxInstance;
  } catch {
    return null;
  }
}

/**
 * Get a sandbox instance — first checks in-memory sessions (works locally),
 * then falls back to Sandbox.get() reconnection (works in serverless).
 */
export async function getSandboxForFiles(
  conversationId: string,
  sandboxId?: string,
): Promise<SandboxInstance | null> {
  const sessions = getSessions();
  const runtimes: Runtime[] = ['node24', 'python3.13'];

  // Try in-memory sessions first (works in local dev / single-instance)
  for (const runtime of runtimes) {
    const key = sessionKey(conversationId, runtime);
    const session = sessions.get(key);
    if (session) return session.sandbox;
  }

  // Fall back to Sandbox.get() reconnection (works in serverless)
  if (sandboxId) {
    return reconnectSandbox(sandboxId);
  }

  return null;
}
