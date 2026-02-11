# Project Rules

## Architecture Overview

Next.js 16 App Router chat application. An OpenAI agent (GPT-5 mini) generates and executes code inside Vercel Sandbox (Firecracker microVMs) via AI SDK v6 tool calling. Three API routes, one context provider, no database.

**Data flow:** `page.tsx` → `ChatProvider` (wraps `useChat`) → `POST /api/chat` → `streamText` + tools (`runCode`, `writeFile`) → Vercel Sandbox → results stream back. Real-time stdout/stderr is piped through a separate SSE endpoint (`/api/sandbox/stream`).

**Key files:**

| File                                  | Responsibility                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/chat-context.tsx`            | Single `ChatProvider` context with `{ state, actions, meta }` pattern; all chat state lives here                                       |
| `src/lib/sandbox.ts`                  | Sandbox session manager (`Map` + TTL keyed by `conversationId:runtime`); `executeCode()`, `writeFileToSandbox()`, `listSandboxFiles()` |
| `src/lib/constants.ts`                | All tunables: `MODEL_NAME`, timeouts, max tokens, `getSystemPrompt()` factory                                                          |
| `src/lib/types.ts`                    | Tool part interfaces + type guards (`RunCodeToolPart`, `WriteFileToolPart`, `isRunCodeToolPart()`)                                     |
| `src/lib/output-stream.ts`            | In-memory `EventEmitter` pub/sub for real-time stdout/stderr streaming                                                                 |
| `src/lib/conversations.ts`            | localStorage CRUD for conversations (key: `sandbox-agent-conversations:v1`)                                                            |
| `src/app/api/chat/route.ts`           | `streamText` with `convertToModelMessages()`, rate limiter, input validation                                                           |
| `src/app/api/sandbox/stream/route.ts` | SSE endpoint — subscribes to `outputManager` for real-time output                                                                      |
| `src/app/api/sandbox/files/route.ts`  | GET endpoint — returns sandbox file tree for the `FileExplorer` panel                                                                  |

## AI SDK v6 Conventions

This project uses AI SDK **v6** (package `ai@6.x`) with **Zod v4**. Critical differences from v5:

- **Tool definition:** `tool({ inputSchema: z.object({...}) })` — NOT `parameters`
- **Client `useChat`:** returns `sendMessage({ text })` — no `handleInputChange`/`handleSubmit` pattern; input is managed via `useState` in `ChatProvider`
- **Message structure:** `message.parts` array — NOT `message.content` or `message.toolInvocations`
- **Tool part types:** `part.type === 'tool-runCode'` (pattern: `tool-{toolName}`) with states: `input-streaming` → `input-available` → `output-available` | `output-error`
- **Server response:** `result.toUIMessageStreamResponse()` — NOT `toDataStreamResponse()`
- **Status field:** `'ready' | 'submitted' | 'streaming' | 'error'` — derive `isLoading` as `status === 'submitted' || status === 'streaming'`
- **Message conversion:** Server must call `convertToModelMessages(messages)` because `useChat` sends `UIMessage[]` but `streamText` expects `ModelMessage[]`

## Chat Transport Pattern

The `ChatProvider` uses `DefaultChatTransport` with a `body()` function (not a static object) so that `chatId` and `language` are read from refs at send-time, surviving chat resets:

```ts
const transport = useMemo(
  () =>
    new DefaultChatTransport({
      body: () => ({
        chatId: chatIdRef.current,
        language: languageRef.current,
      }),
    }),
  [],
);
```

This closure pattern is intentional — a static `body` object would go stale after `newChat()` resets the `chatId`.

## SVG Icons

- **Never inline SVGs** in component files. All icons live in `src/components/Icons.tsx`.
- Use the `icon(size, children)` factory and export a named component.
- Icon components accept `SVGProps<SVGSVGElement>`: `import { SomeIcon } from '@/components/Icons'`.

## Component Patterns

- All interactive components are `'use client'` — the app is a single-page chat UI
- Components consume shared state via `useChatContext()` → `{ state, actions, meta }`
- Tool results render through dedicated card components: `ToolCard` (runCode) and `WriteFileCard` (writeFile); detect part type using type guards from `src/lib/types.ts`
- `ChatMessage.tsx` dispatches parts to the correct card via `isRunCodeToolPart(part)` / `isWriteFileToolPart(part)` — add new tools here
- Syntax highlighting uses a lazy-loaded Shiki singleton (`src/lib/highlighter.ts`); `CodeBlock` is the shared component
- Markdown in AI responses renders via `MarkdownRenderer` → delegates code blocks to `CodeBlock`
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`) — avoid manual `React.memo()` or `useMemo` for JSX; the compiler handles it

## Adding a New Tool

1. Define Zod v4 input schema and `tool()` in `src/app/api/chat/route.ts`, add to the `tools` object passed to `streamText`
2. Add execution logic in `src/lib/sandbox.ts` (export a new async function)
3. Create `{ToolName}Input`, `{ToolName}Output`, `{ToolName}ToolPart` interfaces + `is{ToolName}ToolPart()` type guard in `src/lib/types.ts` — follow the `RunCodeToolPart` pattern exactly
4. Build a card component in `src/components/{ToolName}Card.tsx` to render all states (`input-streaming`, `input-available`, `output-available`, `output-error`)
5. Wire the card into `ChatMessage.tsx` with the type guard: `if (is{ToolName}ToolPart(part)) return <{ToolName}Card part={part} />`

## Sandbox Session Management

Sandboxes are reused across tool calls within a conversation via `src/lib/sandbox.ts`:

- **Session key:** `${conversationId}:${runtime}` — each runtime (`node24`, `python3.13`) gets its own sandbox
- **TTL:** `SANDBOX_SESSION_TTL` (5 min idle) — a `setInterval` cleanup runs every 60s
- **Error recovery:** If a sandbox dies (timeout/OOM), the catch block in `executeCode()` deletes the session so the next call creates a fresh one
- **Streaming:** When `conversationId` is provided, `runInSandbox()` runs commands in detached mode with `cmd.logs()` for real-time output, pushing chunks to `outputManager`
- **One-off fallback:** Requests without `conversationId` create a disposable sandbox (backward compat)

## Output Streaming Architecture

Real-time stdout/stderr uses an in-memory pub/sub (`src/lib/output-stream.ts`) + SSE (`/api/sandbox/stream`):

1. `sandbox.ts` calls `outputManager.start(chatId)` → pushes chunks via `outputManager.push()` → calls `outputManager.end()`
2. `ToolCard` opens an `EventSource` to `/api/sandbox/stream?chatId=...` during the `input-available` state
3. The SSE route subscribes to `outputManager` and pipes chunks as `data:` events

**Limitation:** This requires the chat API route and SSE route to share the same Node.js process (same `outputManager` instance). Works in local dev and single-instance deployments. In serverless (separate function instances), the client falls back gracefully — it simply shows output after execution completes instead of streaming.

## Security & Limits

All limits are defined in `src/lib/constants.ts`:

| Limit             | Value             | Purpose                                                      |
| ----------------- | ----------------- | ------------------------------------------------------------ |
| Rate limit        | 20 req/min per IP | In-memory Map in `route.ts`; resets per 60s window           |
| Input length      | 10,000 chars      | Last user message validated server-side                      |
| Output truncation | 50,000 chars      | `truncateOutput()` in `sandbox.ts` caps stdout/stderr        |
| Model output      | 4,096 tokens      | `maxOutputTokens` in `streamText` call                       |
| Max tool steps    | 5                 | `stopWhen: stepCountIs(MAX_STEPS)` — prevents infinite loops |
| Sandbox timeout   | 5 min             | Sandbox lifetime via `Sandbox.create({ timeout })`           |
| Session idle TTL  | 5 min             | Cleanup timer removes idle sessions                          |

When adding features, preserve these limits. The rate limiter is deliberately simple (in-memory Map) — it resets on server restart, which is acceptable for a demo.

## Styling & UI

- Tailwind CSS v4 with `@import 'tailwindcss'` (not `@tailwind` directives); theme tokens in `globals.css` via `@theme inline`
- Dark theme only — no light mode toggle; CSS variables `--background: #0a0a0a`, `--foreground: #ededed`
- Emerald accent palette; Geist font family (sans + mono)
- Mobile responsive from 375px+ using `dvh` viewport units, `sm:` breakpoints
- Custom animations in `globals.css`: `animate-message-in`, `animate-card-in`, `animate-thinking`
- No CSS modules or styled-components — Tailwind utility classes only

## Development

- `npm run dev` — starts Next.js dev server (turbopack)
- `npm run build` — production build; `npm run lint` — ESLint
- Sandbox auth requires `OPENAI_API_KEY` and Vercel OIDC in `.env.local`; re-run `vercel env pull` if sandbox auth fails (OIDC token expires ~12h)
- Conversations persist in localStorage (key: `sandbox-agent-conversations:v1`) — no backend storage; cache invalidated on write via `cachedConversations = null`
- No test framework is currently configured — the project is a demo/interview artifact
- React Compiler is enabled — don't add `babel-plugin-react-compiler` to individual files; it's global in `next.config.ts`
