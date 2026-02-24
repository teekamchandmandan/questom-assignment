# Sandbox Agent

A production-style demo of a tool-calling AI coding assistant built with Next.js 16, AI SDK v6, and Vercel Sandbox.

The app accepts natural-language coding tasks, runs generated code inside isolated Firecracker microVMs, and streams execution output back to the chat UI.

## Highlights

- Tool-calling loop with `runCode` and `writeFile` (max 5 tool steps/request)
- Multi-language execution: JavaScript, TypeScript, Python
- Conversation-scoped sandbox reuse with idle TTL cleanup
- Real-time stdout/stderr streaming over SSE with graceful fallback
- File explorer and file preview backed by sandbox filesystem APIs
- Serverless-safe sandbox reconnection via `Sandbox.get({ sandboxId })`
- Defensive guardrails: rate limiting, input caps, token/output limits, timeout bounds

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19         |
| AI         | AI SDK v6 (`ai@6`), OpenAI (`gpt-5-mini`) |
| Sandbox    | `@vercel/sandbox` (Firecracker microVMs)  |
| Validation | Zod v4                                    |
| UI         | Tailwind CSS v4, `react-markdown`, Shiki  |

## System Flow

```
UI (ChatProvider/useChat)
  -> POST /api/chat
  -> streamText(openai('gpt-5-mini'))
  -> tool calls (runCode, writeFile)
  -> Vercel Sandbox execution
  -> outputManager pub/sub
  -> GET /api/sandbox/stream (SSE)
  -> incremental output + final tool result in chat
```

## Key Paths

- `src/app/api/chat/route.ts`: main AI orchestration, tools, validation, rate limiting
- `src/app/api/sandbox/stream/route.ts`: SSE endpoint for realtime logs
- `src/app/api/sandbox/files/route.ts`: list files in current sandbox
- `src/app/api/sandbox/files/read/route.ts`: read single sandbox file
- `src/lib/sandbox-exec.ts`: command execution and output shaping
- `src/lib/sandbox-sessions.ts`: session map, TTL cleanup, sandbox reuse
- `src/lib/sandbox-files.ts`: write/list/read file helpers
- `src/lib/chat-context.tsx`: chat state composition root for UI

## Quick Start

### Prerequisites

- Node.js 20+
- Vercel account and project access
- OpenAI API key

### Install

```bash
npm install
```

### Configure environment

```bash
vercel link
vercel env pull
```

Add to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

> `VERCEL_OIDC_TOKEN` is short-lived (roughly 12h locally). If sandbox auth starts failing, run `vercel env pull` again.

### Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — start local dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — start built app
- `npm run lint` — run ESLint
- `npm run typecheck` — run TypeScript checks

## API Surface

- `POST /api/chat` — validates input, executes model/tool loop, streams UI messages
- `GET /api/sandbox/stream?chatId=...` — SSE log stream (`stdout`/`stderr` chunks)
- `GET /api/sandbox/files?chatId=...&sandboxId=...` — fetch sandbox file list (UI builds tree)
- `GET /api/sandbox/files/read?path=...&chatId=...&sandboxId=...` — fetch file content

## Operational Limits

Defined in `src/lib/constants.ts` and `src/app/api/chat/route.ts`:

- Rate limit: 20 requests/minute per IP
- Input size: 10,000 characters (last user message)
- Max tool steps: 5
- Max model output: 4,096 tokens
- Sandbox timeout: 5 minutes
- Sandbox idle session TTL: 5 minutes
- Output truncation: 50,000 characters

## Serverless Notes

- Sandbox sessions are cached in-memory per runtime process for reuse.
- Tool outputs include `sandboxId`; file APIs can reconnect with `Sandbox.get({ sandboxId })` when requests hit different serverless instances.
- Realtime log streaming requires the chat route and SSE route to share process memory. If they do not, the UI still shows final output after command completion.

## Extending Tools

When adding a new AI tool:

1. Add a `tool({ inputSchema })` in `src/app/api/chat/route.ts`
2. Implement sandbox logic in `src/lib/sandbox-exec.ts` and/or `src/lib/sandbox-files.ts`
3. Add tool part types and type guards in `src/lib/types.ts`
4. Add a UI card component and wire it in `src/components/ChatMessage.tsx`

## License

Internal/demo project (no license declared in this repository).
