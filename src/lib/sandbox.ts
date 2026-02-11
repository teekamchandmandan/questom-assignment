import { Sandbox } from '@vercel/sandbox';
import { SANDBOX_TIMEOUT } from './constants';

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function executeCode(
  language: 'javascript' | 'python',
  code: string,
): Promise<CodeExecutionResult> {
  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null;

  try {
    sandbox = await Sandbox.create({
      runtime: language === 'python' ? 'python3.13' : 'node24',
      timeout: SANDBOX_TIMEOUT,
    });

    const cmd = language === 'python' ? 'python3' : 'node';
    const result = await sandbox.runCommand(cmd, ['-e', code]);

    const stdout = await result.stdout();
    const stderr = await result.stderr();

    return { stdout, stderr, exitCode: result.exitCode };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown sandbox error';
    return { stdout: '', stderr: message, exitCode: 1 };
  } finally {
    if (sandbox) {
      await sandbox.stop().catch(() => {});
    }
  }
}
