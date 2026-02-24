import type { Sandbox } from '@vercel/sandbox';

// ── Result types ─────────────────────────────────────────────────────

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  sandboxId?: string;
}

export interface WriteFileResult {
  success: boolean;
  filePath: string;
  error?: string;
  sandboxId?: string;
}

// ── Sandbox primitives ───────────────────────────────────────────────

export type Runtime = 'node24' | 'python3.13';
export type ExecLanguage = 'javascript' | 'python' | 'typescript';
export type SandboxInstance = Awaited<ReturnType<typeof Sandbox.create>>;

export interface SandboxSession {
  sandbox: SandboxInstance;
  lastUsed: number;
  runtime: Runtime;
  tsxInstalled?: boolean;
}
