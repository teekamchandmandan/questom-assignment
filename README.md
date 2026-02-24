# Sandbox Agent

AI code-execution chat app built with Next.js, AI SDK v6, and Vercel Sandbox. Users describe a coding task, the agent writes code, runs it in an isolated Firecracker microVM, and streams results back to the UI.

## Features

- Tool-calling agent (`runCode`, `writeFile`) with retry loops capped at 5 steps
- Sandboxed execution for JavaScript, TypeScript, and Python
- Stateful sandbox sessions per conversation with idle TTL cleanup
- Real-time stdout/stderr streaming via SSE (with graceful fallback)
- Conversation persistence in localStorage
- Sandbox file explorer with serverless-safe reconnection (`Sandbox.get()`)
- Input, output, token, timeout, and rate-limit guards

## Architecture

```
User → Chat UI (Next.js App Router)
         ↓
       /api/chat (POST)
         ↓
       AI SDK streamText → OpenAI GPT-5 mini
         ↓                        ↓
       Tool Call: runCode    Tool Call: writeFile
         ↓                        ↓
       Vercel Sandbox (Firecracker microVM)
         ↓
       stdout/stderr → SSE stream → UI (real-time)
         ↓
       Tool Result → AI continues or responds
```

**Key architectural decisions:**

| Decision                          | Rationale                                                                |
| --------------------------------- | ------------------------------------------------------------------------ |
| `streamText` over `ToolLoopAgent` | Simpler, well-documented, sufficient for scoped tool-calling loops       |
| Sandbox session reuse (Map + TTL) | Enables stateful multi-step coding; 5-min idle cleanup prevents leaks    |
| `Sandbox.get()` reconnection      | File explorer works in serverless where in-memory sessions aren't shared |
| Shiki over Prism                  | VS Code-quality highlighting with broader language support               |
| localStorage over database        | Keeps demo self-contained with zero infrastructure dependencies          |
| SSE for output streaming          | Decoupled from chat stream; graceful fallback when unavailable           |

## Project Structure

```
src/
├── app/
│   ├── page.tsx
│   └── api/
│       ├── chat/route.ts
│       └── sandbox/
│           ├── stream/route.ts
│           └── files/
│               ├── route.ts
│               └── read/route.ts
├── components/
│   ├── FileExplorer.tsx
│   ├── file-explorer/
│   │   ├── TreeNodeItem.tsx
│   │   └── FilePreview.tsx
│   ├── ToolCard.tsx
│   ├── WriteFileCard.tsx
│   └── ...
└── lib/
  ├── chat-context.tsx
  ├── chat-types.ts
  ├── hooks/
  │   ├── use-auto-scroll.ts
  │   ├── use-conversation-persistence.ts
  │   └── use-tool-result-tracker.ts
  ├── sandbox.ts                 # public barrel exports
  ├── sandbox-exec.ts
  ├── sandbox-files.ts
  ├── sandbox-sessions.ts
  ├── sandbox-types.ts
  └── ...
```

### Core module responsibilities

- `src/lib/sandbox.ts`: stable public API (`executeCode`, `writeFileToSandbox`, file APIs)
- `src/lib/sandbox-exec.ts`: runtime command execution + output truncation + streaming
- `src/lib/sandbox-sessions.ts`: sandbox reuse, TTL cleanup, and `Sandbox.get()` reconnection
- `src/lib/sandbox-files.ts`: file write/list/read helpers
- `src/lib/chat-context.tsx`: provider wiring only
- `src/lib/hooks/*`: extracted chat concerns (auto-scroll, persistence, tool result tracking)
- `src/components/FileExplorer.tsx` + `src/components/file-explorer/*`: layout shell + tree/preview subcomponents

## Getting Started

### Prerequisites

- Node.js 20+
- A [Vercel](https://vercel.com) account (for sandbox OIDC auth)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Setup

1. **Clone and install:**

   ```bash
   git clone <repo-url>
   cd questom-sandbox-agent
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   # Link to your Vercel project (creates .vercel/)
   vercel link

   # Pull OIDC token for sandbox auth
   vercel env pull
   ```

   Then add your OpenAI key to `.env.local`:

   ```
   OPENAI_API_KEY=sk-...
   ```

   > **Note:** The local `VERCEL_OIDC_TOKEN` expires after ~12 hours. If sandbox auth fails, re-run `vercel env pull`.

3. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Deploying to Vercel

```bash
vercel --prod
```

Add `OPENAI_API_KEY` in your Vercel project's environment variables. Sandbox works natively on Vercel — no extra configuration needed.

## Tech Stack

| Layer               | Technology                                                                          |
| ------------------- | ----------------------------------------------------------------------------------- |
| Framework           | [Next.js 16](https://nextjs.org) (App Router)                                       |
| AI                  | [Vercel AI SDK v6](https://sdk.vercel.ai) + [OpenAI GPT-5 mini](https://openai.com) |
| Sandbox             | [Vercel Sandbox](https://vercel.com/docs/sandbox) (Firecracker microVMs)            |
| Styling             | [Tailwind CSS v4](https://tailwindcss.com)                                          |
| Syntax Highlighting | [Shiki](https://shiki.style)                                                        |
| Markdown            | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm           |
| Schema Validation   | [Zod v4](https://zod.dev)                                                           |

## Example Prompts

- "Write a Python script that prints the first 20 Fibonacci numbers"
- "Create a TypeScript prime-check function and test 17 and 20"
- "Generate 5 UUIDs without external packages"
