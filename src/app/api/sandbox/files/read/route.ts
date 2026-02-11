import { readFileFromSandbox } from '@/lib/sandbox';
import { resolve, normalize } from 'path';

const SANDBOX_ROOT = '/vercel/sandbox';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  const filePath = searchParams.get('path');
  const sandboxId = searchParams.get('sandboxId') ?? undefined;

  if (!chatId || !filePath) {
    return Response.json({ error: 'Missing chatId or path' }, { status: 400 });
  }

  // Prevent path traversal — resolved path must be under sandbox root
  const resolved = normalize(resolve(SANDBOX_ROOT, filePath));
  if (!resolved.startsWith(SANDBOX_ROOT + '/') && resolved !== SANDBOX_ROOT) {
    return Response.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const result = await readFileFromSandbox(chatId, resolved, sandboxId);

  if (!result) {
    return Response.json(
      { error: 'File not found or sandbox expired' },
      { status: 404 },
    );
  }

  return Response.json(result);
}
