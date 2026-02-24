import { Sandbox } from '@vercel/sandbox';
import { SANDBOX_TIMEOUT } from './constants';
import { formatSize, type FileEntry } from './file-tree';
import { getOrCreateSandbox, getSandboxForFiles } from './sandbox-sessions';
import { writeFileViaCat } from './sandbox-exec';
import type {
  Runtime,
  SandboxInstance,
  WriteFileResult,
} from './sandbox-types';

export type { FileEntry } from './file-tree';

// ── Write ────────────────────────────────────────────────────────────

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

// ── List ─────────────────────────────────────────────────────────────

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

    return entries.toSorted((a, b) => {
      // Directories first, then alphabetical
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
  } catch {
    return [];
  }
}

// ── Read ─────────────────────────────────────────────────────────────

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
