import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { executeCode, writeFileToSandbox } from '@/lib/sandbox';
import { SYSTEM_PROMPT, MODEL_NAME, MAX_STEPS } from '@/lib/constants';

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  const conversationId = typeof chatId === 'string' ? chatId : undefined;

  // Build the tools with the conversation's chatId baked in so the
  // sandbox session is reused across tool calls in the same chat.
  const runCode = tool({
    description:
      'Execute JavaScript or Python code inside a sandboxed environment and return stdout, stderr, and exit code. When filePath is provided, the code is written to that file and executed from there (e.g., `node app.js` or `python3 main.py`) — useful for multi-file projects. Without filePath, code runs inline.',
    inputSchema: z.object({
      language: z
        .enum(['javascript', 'python'])
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
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: { runCode, writeFile },
    stopWhen: stepCountIs(MAX_STEPS),
  });

  return result.toUIMessageStreamResponse();
}
