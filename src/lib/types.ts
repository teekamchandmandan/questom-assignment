/**
 * Properly typed tool invocation part for the runCode tool.
 * Replaces the manual ToolPart interface + `as unknown as ToolPart` cast
 * with a type guard for safe narrowing.
 */

export interface RunCodeInput {
  language?: 'javascript' | 'python' | 'typescript';
  code?: string;
  filePath?: string;
}

export interface RunCodeOutput {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  sandboxId?: string;
}

export interface RunCodeToolPart {
  type: 'tool-runCode';
  toolCallId: string;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'output-available'
    | 'output-error';
  input?: RunCodeInput;
  output?: RunCodeOutput;
  errorText?: string;
}

/** Type guard to narrow a UIMessage part to a RunCodeToolPart */
export function isRunCodeToolPart(part: {
  type: string;
}): part is RunCodeToolPart {
  return part.type === 'tool-runCode';
}

// ── WriteFile tool part types ────────────────────────────────────────

export interface WriteFileInput {
  filePath?: string;
  content?: string;
  description?: string;
}

export interface WriteFileOutput {
  success?: boolean;
  filePath?: string;
  error?: string;
  sandboxId?: string;
}

export interface WriteFileToolPart {
  type: 'tool-writeFile';
  toolCallId: string;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'output-available'
    | 'output-error';
  input?: WriteFileInput;
  output?: WriteFileOutput;
  errorText?: string;
}

/** Type guard to narrow a UIMessage part to a WriteFileToolPart */
export function isWriteFileToolPart(part: {
  type: string;
}): part is WriteFileToolPart {
  return part.type === 'tool-writeFile';
}
