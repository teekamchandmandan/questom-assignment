import { Sandbox } from '@vercel/sandbox';
import { SANDBOX_TIMEOUT, SANDBOX_SESSION_TTL } from './constants';
import { outputManager } from './output-stream';

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
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

const sessions = new Map<string, SandboxSession>();

// Periodic cleanup interval (runs every 60 s)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, session] of sessions) {
      if (now - session.lastUsed > SANDBOX_SESSION_TTL) {
        session.sandbox.stop().catch(() => {});
        sessions.delete(key);
      }
    }
    // Stop the interval when there are no sessions left
    if (sessions.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
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

function commandForLanguage(language: 'javascript' | 'python'): string {
  return language === 'python' ? 'python3' : 'node';
}

async function runInSandbox(
  sandbox: SandboxInstance,
  language: 'javascript' | 'python',
  code: string,
  filePath?: string,
  streamId?: string,
): Promise<CodeExecutionResult> {
  // If filePath specified, write code to file first
  if (filePath) {
    await sandbox.runCommand('mkdir', ['-p', filePath.replace(/\/[^/]+$/, '')]);
    await sandbox.runCommand('sh', [
      '-c',
      `cat > ${filePath} << 'SANDBOX_EOF'
${code}
SANDBOX_EOF`,
    ]);
  }

  const args: string[] = filePath ? [filePath] : ['-e', code];

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

    return { stdout, stderr, exitCode: finished.exitCode };
  }

  // Non-streaming: wait for full result
  const result = await sandbox.runCommand(commandForLanguage(language), args);
  const stdout = await result.stdout();
  const stderr = await result.stderr();
  return { stdout, stderr, exitCode: result.exitCode };
}

function toErrorResult(error: unknown): CodeExecutionResult {
  const message =
    error instanceof Error ? error.message : 'Unknown sandbox error';
  return { stdout: '', stderr: message, exitCode: 1 };
}

// ── Public API ───────────────────────────────────────────────────────

export interface WriteFileResult {
  success: boolean;
  filePath: string;
  error?: string;
}

export async function writeFileToSandbox(
  filePath: string,
  content: string,
  conversationId?: string,
): Promise<WriteFileResult> {
  // Determine runtime — default to node24 for file operations
  const runtime: Runtime = 'node24';

  try {
    const sandbox = conversationId
      ? await getOrCreateSandbox(conversationId, runtime)
      : await Sandbox.create({ runtime, timeout: SANDBOX_TIMEOUT });

    // Ensure parent directory exists
    const parentDir = filePath.replace(/\/[^/]+$/, '');
    if (parentDir && parentDir !== filePath) {
      await sandbox.runCommand('mkdir', ['-p', parentDir]);
    }

    // Write file content using heredoc
    await sandbox.runCommand('sh', [
      '-c',
      `cat > ${filePath} << 'SANDBOX_EOF'
${content}
SANDBOX_EOF`,
    ]);

    // Verify the write succeeded
    const verify = await sandbox.runCommand('test', ['-f', filePath]);
    if (verify.exitCode !== 0) {
      return { success: false, filePath, error: 'File was not created' };
    }

    // If no conversationId, stop the one-off sandbox
    if (!conversationId) {
      await sandbox.stop().catch(() => {});
    }

    return { success: true, filePath };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error writing file';
    return { success: false, filePath, error: message };
  }
}

export async function executeCode(
  language: 'javascript' | 'python',
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
    return await runInSandbox(
      sandbox,
      language,
      code,
      filePath,
      conversationId,
    );
  } catch (error) {
    // If the sandbox died (timeout, OOM, etc.) remove it so a fresh
    // one is created on the next call.
    const key = sessionKey(conversationId, runtime);
    const session = sessions.get(key);
    if (session) {
      session.sandbox.stop().catch(() => {});
      sessions.delete(key);
    }
    return toErrorResult(error);
  }
}

/** One-off sandbox for requests without a conversation ID (backward compat) */
async function executeOneOff(
  runtime: Runtime,
  language: 'javascript' | 'python',
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
