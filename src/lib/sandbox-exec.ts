import { Sandbox } from '@vercel/sandbox';
import { randomBytes } from 'crypto';
import { SANDBOX_TIMEOUT, MAX_OUTPUT_SIZE } from './constants';
import { outputManager } from './output-stream';
import {
  getSessions,
  getOrCreateSandbox,
  sessionKey,
} from './sandbox-sessions';
import type {
  CodeExecutionResult,
  ExecLanguage,
  Runtime,
  SandboxInstance,
} from './sandbox-types';

// ── Language helpers ──────────────────────────────────────────────────

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

// ── Shell / file helpers ─────────────────────────────────────────────

/** Shell-escape a string by wrapping it in single quotes and escaping inner quotes. */
function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Write file content to the sandbox using a heredoc with a randomised
 * delimiter so content containing the delimiter cannot break the write.
 * The filePath is shell-escaped to prevent injection.
 */
export async function writeFileViaCat(
  sandbox: SandboxInstance,
  filePath: string,
  content: string,
): Promise<void> {
  const delimiter = `SANDBOX_EOF_${randomBytes(8).toString('hex')}`;
  const safePath = shellEscape(filePath);
  await sandbox.runCommand('mkdir', ['-p', filePath.replace(/\/[^/]+$/, '')]);
  await sandbox.runCommand('sh', [
    '-c',
    `cat > ${safePath} << '${delimiter}'
${content}
${delimiter}`,
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

// ── Run in sandbox ───────────────────────────────────────────────────

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

  // For TypeScript, ensure tsx is available (once per session)
  if (language === 'typescript') {
    const sessions = getSessions();
    // Find the session for this sandbox to check / set the flag
    let session;
    for (const s of sessions.values()) {
      if (s.sandbox === sandbox) {
        session = s;
        break;
      }
    }
    if (!session?.tsxInstalled) {
      await sandbox.runCommand('npm', ['install', '-g', 'tsx']).catch(() => {});
      if (session) session.tsxInstalled = true;
    }
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

// ── Public API ───────────────────────────────────────────────────────

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
