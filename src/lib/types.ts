/**
 * Properly typed tool invocation part for the runCode tool.
 * Replaces the manual ToolPart interface + `as unknown as ToolPart` cast
 * with a type guard for safe narrowing.
 */

export interface RunCodeInput {
  language?: string;
  code?: string;
}

export interface RunCodeOutput {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
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
