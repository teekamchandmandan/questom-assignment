import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { executeCode } from '@/lib/sandbox';
import { SYSTEM_PROMPT, MODEL_NAME, MAX_STEPS } from '@/lib/constants';

const runCode = tool({
  description:
    'Execute JavaScript or Python code inside a sandboxed environment and return stdout, stderr, and exit code.',
  inputSchema: z.object({
    language: z
      .enum(['javascript', 'python'])
      .describe('The programming language to execute'),
    code: z.string().describe('The code to execute'),
  }),
  execute: async ({ language, code }) => executeCode(language, code),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai(MODEL_NAME),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: { runCode },
    stopWhen: stepCountIs(MAX_STEPS),
  });

  return result.toUIMessageStreamResponse();
}
