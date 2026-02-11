import { Sandbox } from '@vercel/sandbox';
import {
  SANDBOX_TIMEOUT,
  SANDBOX_SESSION_TTL,
  MAX_OUTPUT_SIZE,
} from './constants';
import { outputManager } from './output-stream';
import { formatSize, type FileEntry } from './file-tree';

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  sandboxId?: string;
}

// ── Sandbox Session Manager ──────────────────────────────────────────
// Maintains one sandbox per (conversationId, runtime) pair so that
// filesystem state persists across tool calls within a conversation.
// Idle sessions are cleaned up after SANDBOX_SESSION_TTL milliseconds.

type Runtime = 'node24' | 'python3.13';
type SandboxInstance = Awaited<ReturnType<typeof Sandbox.create>>;

interface SandboxSession {
  sandbox: SandboxInstance;
  lastUsed: number;
  runtime: Runtime;
}

// Use globalThis so all Next.js API route bundles share the same Map
// (turbopack compiles each route separately, so module-level singletons
// are NOT shared between /api/chat and /api/sandbox/*).
const globalKey = Symbol.for('sandbox-sessions');
const timerKey = Symbol.for('sandbox-cleanup-timer');

type GlobalWithSandbox = typeof globalThis & {
  [k: symbol]: unknown;
};

function getSessions(): Map<string, SandboxSession> {
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

function sessionKey(conversationId: string, runtime: Runtime): string {
  return `${conversationId}:${runtime}`;
}

async function getOrCreateSandbox(
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

// ── Helpers ──────────────────────────────────────────────────────────

type ExecLanguage = 'javascript' | 'python' | 'typescript';

function commandForLanguage(language: ExecLanguage): string {
  switch (language) {
    case 'python':
      return 'python3';
    case 'typescript':
      return 'npx';
    default:
      return 'node';
  }
}

function argsForLanguage(
  language: ExecLanguage,
  code: string,
  filePath?: string,
): string[] {
  if (language === 'typescript') {
    // Use tsx runner; if filePath given execute the file, otherwise inline eval
    return filePath ? ['tsx', filePath] : ['tsx', '-e', code];
  }
  return filePath ? [filePath] : ['-e', code];
}

async function runInSandbox(
  sandbox: SandboxInstance,
  language: ExecLanguage,
  code: string,
  filePath?: string,
  streamId?: string,
): Promise<CodeExecutionResult> {
  // If filePath specified, write code to file first
  if (filePath) {
    await writeFileViaCat(sandbox, filePath, code);
  }

  // For TypeScript, ensure tsx is available
  if (language === 'typescript') {
    await sandbox.runCommand('npm', ['install', '-g', 'tsx']).catch(() => {});
  }

  const args: string[] = argsForLanguage(language, code, filePath);

  // Streaming mode: use detached command + logs() for real-time output
  if (streamId) {
    outputManager.start(streamId);

    const cmd = await sandbox.runCommand({
      cmd: commandForLanguage(language),
      args,
      detached: true,
    });

    let stdout = '';
    let stderr = '';

    for await (const log of cmd.logs()) {
      if (log.stream === 'stdout') {
        stdout += log.data;
        outputManager.push(streamId, { type: 'stdout', data: log.data });
      } else {
        stderr += log.data;
        outputManager.push(streamId, { type: 'stderr', data: log.data });
      }
    }

    const finished = await cmd.wait();
    outputManager.end(streamId);

    return {
      stdout: truncateOutput(stdout),
      stderr: truncateOutput(stderr),
      exitCode: finished.exitCode,
    };
  }

  // Non-streaming: wait for full result
  const result = await sandbox.runCommand(commandForLanguage(language), args);
  const stdout = await result.stdout();
  const stderr = await result.stderr();
  return {
    stdout: truncateOutput(stdout),
    stderr: truncateOutput(stderr),
    exitCode: result.exitCode,
  };
}

/**
 * Write file content to the sandbox using a heredoc.
 * Shared by both runInSandbox (when filePath is given) and writeFileToSandbox.
 */
async function writeFileViaCat(
  sandbox: SandboxInstance,
  filePath: string,
  content: string,
): Promise<void> {
  await sandbox.runCommand('mkdir', ['-p', filePath.replace(/\/[^/]+$/, '')]);
  await sandbox.runCommand('sh', [
    '-c',
    `cat > ${filePath} << 'SANDBOX_EOF'
${content}
SANDBOX_EOF`,
  ]);
}

function toErrorResult(error: unknown): CodeExecutionResult {
  const message =
    error instanceof Error ? error.message : 'Unknown sandbox error';
  return { stdout: '', stderr: message, exitCode: 1 };
}

/** Truncate output if it exceeds MAX_OUTPUT_SIZE to prevent excessive token usage */
function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_SIZE) return output;
  return (
    output.slice(0, MAX_OUTPUT_SIZE) +
    `\n\n--- Output truncated (${output.length.toLocaleString()} chars, limit ${MAX_OUTPUT_SIZE.toLocaleString()}) ---`
  );
}

// ── Public API ───────────────────────────────────────────────────────

export interface WriteFileResult {
  success: boolean;
  filePath: string;
  error?: string;
  sandboxId?: string;
}

export async function writeFileToSandbox(
  filePath: string,
  content: string,
  conversationId?: string,
  language?: string,
): Promise<WriteFileResult> {
  // Pick runtime matching the conversation language so the file
  // lands in the same sandbox that runCode uses.
  const runtime: Runtime = language === 'python' ? 'python3.13' : 'node24';

  try {
    const sandbox = conversationId
      ? await getOrCreateSandbox(conversationId, runtime)
      : await Sandbox.create({ runtime, timeout: SANDBOX_TIMEOUT });

    // Write file content (mkdir + heredoc)
    await writeFileViaCat(sandbox, filePath, content);

    // Verify the write succeeded
    const verify = await sandbox.runCommand('test', ['-f', filePath]);
    if (verify.exitCode !== 0) {
      return { success: false, filePath, error: 'File was not created' };
    }

    const sbId = sandbox.sandboxId;

    // If no conversationId, stop the one-off sandbox
    if (!conversationId) {
      await sandbox.stop().catch(() => {});
    }

    return { success: true, filePath, sandboxId: sbId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error writing file';
    return { success: false, filePath, error: message };
  }
}

export async function executeCode(
  language: ExecLanguage,
  code: string,
  conversationId?: string,
  filePath?: string,
): Promise<CodeExecutionResult> {
  const runtime: Runtime = language === 'python' ? 'python3.13' : 'node24';

  // Fallback: no conversation ID → one-off sandbox (old behavior)
  if (!conversationId) {
    return executeOneOff(runtime, language, code, filePath);
  }

  try {
    const sandbox = await getOrCreateSandbox(conversationId, runtime);
    const result = await runInSandbox(
      sandbox,
      language,
      code,
      filePath,
      conversationId,
    );
    return { ...result, sandboxId: sandbox.sandboxId };
  } catch (error) {
    // If the sandbox died (timeout, OOM, etc.) remove it so a fresh
    // one is created on the next call.
    const sessions = getSessions();
    const key = sessionKey(conversationId, runtime);
    const session = sessions.get(key);
    if (session) {
      session.sandbox.stop().catch(() => {});
      sessions.delete(key);
    }
    return toErrorResult(error);
  }
}

// ── File listing ─────────────────────────────────────────────────────

export type { FileEntry } from './file-tree';

/**
 * Lists all user-created files in the sandbox for a given conversation.
 * Returns a flat list of { path, type, size } entries rooted at /vercel/sandbox/.
 */
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
async function getSandboxForFiles(
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

export async function listSandboxFiles(
  conversationId: string,
  sandboxId?: string,
): Promise<FileEntry[]> {
  const sandbox = await getSandboxForFiles(conversationId, sandboxId);
  if (!sandbox) return [];

  return listFilesInSandbox(sandbox);
}

async function listFilesInSandbox(
  sandbox: SandboxInstance,
): Promise<FileEntry[]> {
  try {
    // Use a POSIX-compatible approach: find + stat via shell
    // (-printf is a GNU extension that may not be available in all runtimes)
    const result = await sandbox.runCommand('sh', [
      '-c',
      `find /vercel/sandbox -not -path '*/node_modules/*' -not -path '*/.npm/*' -not -path '*/package-lock.json' -not -path '*/__pycache__/*' -not -path '*/__pycache__' | while IFS= read -r p; do
  if [ -d "$p" ]; then
    echo "d 0 $p"
  elif [ -f "$p" ]; then
    s=$(stat -c '%s' "$p" 2>/dev/null || stat -f '%z' "$p" 2>/dev/null || echo 0)
    echo "f $s $p"
  fi
done`,
    ]);
    const stdout = await result.stdout();
    if (!stdout.trim()) return [];

    const entries: FileEntry[] = [];
    for (const line of stdout.trim().split('\n')) {
      const match = line.match(/^(\w)\s+(\d+)\s+(.+)$/);
      if (!match) continue;
      const [, typeChar, sizeStr, filePath] = match;
      // Skip the sandbox root itself
      if (filePath === '/vercel/sandbox') continue;
      entries.push({
        path: filePath,
        type: typeChar === 'd' ? 'directory' : 'file',
        size: parseInt(sizeStr, 10),
      });
    }

    return entries.sort((a, b) => {
      // Directories first, then alphabetical
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
  } catch {
    return [];
  }
}

// ── File reading ─────────────────────────────────────────────────────

const MAX_FILE_READ_SIZE = 100_000; // 100 KB max for preview

/**
 * Reads the content of a single file from the sandbox.
 * Returns the text content or null if the file doesn't exist / is too large.
 */
export async function readFileFromSandbox(
  conversationId: string,
  filePath: string,
  sandboxId?: string,
): Promise<{ content: string; size: number } | null> {
  const sandbox = await getSandboxForFiles(conversationId, sandboxId);
  if (!sandbox) return null;

  try {
    // Check if file exists and get size
    const stat = await sandbox.runCommand('sh', [
      '-c',
      `stat -c '%s' ${JSON.stringify(filePath)} 2>/dev/null || stat -f '%z' ${JSON.stringify(filePath)} 2>/dev/null`,
    ]);
    const sizeStr = (await stat.stdout()).trim();
    if (!sizeStr || stat.exitCode !== 0) return null;

    const size = parseInt(sizeStr, 10);
    if (size > MAX_FILE_READ_SIZE) {
      return {
        content: `[File too large to preview: ${formatSize(size)}]`,
        size,
      };
    }

    const result = await sandbox.runCommand('cat', [filePath]);
    if (result.exitCode !== 0) return null;

    const content = await result.stdout();
    return { content, size };
  } catch {
    return null;
  }
}

/** One-off sandbox for requests without a conversation ID (backward compat) */
async function executeOneOff(
  runtime: Runtime,
  language: ExecLanguage,
  code: string,
  filePath?: string,
): Promise<CodeExecutionResult> {
  let sandbox: SandboxInstance | null = null;
  try {
    sandbox = await Sandbox.create({ runtime, timeout: SANDBOX_TIMEOUT });
    return await runInSandbox(sandbox, language, code, filePath);
  } catch (error) {
    return toErrorResult(error);
  } finally {
    if (sandbox) {
      await sandbox.stop().catch(() => {});
    }
  }
}
