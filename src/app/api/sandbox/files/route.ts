import { listSandboxFiles } from '@/lib/sandbox';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return Response.json({ error: 'Missing chatId' }, { status: 400 });
  }

  const files = await listSandboxFiles(chatId);
  return Response.json({ files });
}
