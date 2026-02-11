import { readFileFromSandbox } from '@/lib/sandbox';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  const filePath = searchParams.get('path');

  if (!chatId || !filePath) {
    return Response.json({ error: 'Missing chatId or path' }, { status: 400 });
  }

  const result = await readFileFromSandbox(chatId, filePath);

  if (!result) {
    return Response.json(
      { error: 'File not found or sandbox expired' },
      { status: 404 },
    );
  }

  return Response.json(result);
}
