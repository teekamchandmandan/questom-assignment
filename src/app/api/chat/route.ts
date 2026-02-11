import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { executeCode, writeFileToSandbox } from '@/lib/sandbox';
import {
  getSystemPrompt,
  MODEL_NAME,
  MAX_STEPS,
  MAX_TOKENS,
  MAX_INPUT_LENGTH,
  type SupportedLanguage,
} from '@/lib/constants';

const VALID_LANGUAGES = new Set<SupportedLanguage>([
  'javascript',
  'python',
  'typescript',
]);

// ── Simple in-memory rate limiter ──────────────────────────────────
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // max requests per window per IP
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  // ── Rate limiting ────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { messages, chatId, language } = await req.json();

  // ── Input validation ─────────────────────────────────────────────
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Messages array is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Validate last user message length
  const lastMsg = messages[messages.length - 1];
  const lastText =
    lastMsg?.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      ?.map((p: { text: string }) => p.text)
      ?.join('') ?? '';
  if (lastText.length > MAX_INPUT_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Message too long (${lastText.length} chars). Maximum is ${MAX_INPUT_LENGTH} characters.`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const conversationId = typeof chatId === 'string' ? chatId : undefined;
  const lang: SupportedLanguage =
    typeof language === 'string' &&
    VALID_LANGUAGES.has(language as SupportedLanguage)
      ? (language as SupportedLanguage)
      : 'javascript';

  // Build the tools with the conversation's chatId baked in so the
  // sandbox session is reused across tool calls in the same chat.
  const runCode = tool({
    description:
      'Execute JavaScript, TypeScript, or Python code inside a sandboxed environment and return stdout, stderr, and exit code. When filePath is provided, the code is written to that file and executed from there (e.g., `node app.js`, `npx tsx app.ts`, or `python3 main.py`) — useful for multi-file projects. Without filePath, code runs inline.',
    inputSchema: z.object({
      language: z
        .enum(['javascript', 'python', 'typescript'])
        .describe('The programming language to execute'),
      code: z.string().describe('The code to execute'),
      filePath: z
        .string()
        .optional()
        .describe(
          'Optional file path to write the code to before executing (e.g., "/vercel/sandbox/app.js"). When set, the code is saved to this path and run as a file.',
        ),
    }),
    execute: async ({ language, code, filePath }) =>
      executeCode(language, code, conversationId, filePath),
  });

  const writeFile = tool({
    description:
      'Write a file to the sandbox filesystem. Use this for creating configuration files, data files, HTML files, or any file that does not need to be immediately executed. For code that should be executed, prefer runCode with filePath instead.',
    inputSchema: z.object({
      filePath: z
        .string()
        .describe(
          'The absolute path where the file should be written (e.g., "/vercel/sandbox/config.json", "/vercel/sandbox/data/input.csv")',
        ),
      content: z.string().describe('The content to write to the file'),
      description: z
        .string()
        .optional()
        .describe('A brief description of what this file is for'),
    }),
    execute: async ({ filePath, content }) =>
      writeFileToSandbox(filePath, content, conversationId),
  });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai(MODEL_NAME),
    system: getSystemPrompt(lang),
    messages: modelMessages,
    tools: { runCode, writeFile },
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_TOKENS,
  });

  return result.toUIMessageStreamResponse();
}
