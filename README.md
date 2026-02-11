# Sandbox Agent

An AI-powered code execution chatbot built with Next.js, the Vercel AI SDK, and Vercel Sandbox. Describe a coding task in natural language, and an OpenAI-powered agent writes code, executes it inside a Firecracker microVM, and streams the results back — all within a polished chat interface.

## Features

- **AI agent with tool calling** — GPT-5 mini generates code and autonomously executes it via `runCode` and `writeFile` tools, self-correcting on errors up to 5 steps
- **Sandboxed execution** — Code runs inside [Vercel Sandbox](https://vercel.com/docs/sandbox) (Firecracker microVMs) for full isolation; supports JavaScript, TypeScript, and Python
- **Stateful sessions** — Sandbox filesystem persists across tool calls in a conversation, enabling multi-step workflows (create a file → import it → run it)
- **Multi-file projects** — `writeFile` tool for config/data files + `runCode` with `filePath` for file-based execution; build full projects incrementally
- **Real-time output streaming** — stdout/stderr stream to the UI in real-time via a dedicated SSE endpoint during long-running executions
- **Markdown & syntax highlighting** — AI responses render as rich Markdown; code blocks use Shiki (VS Code-quality) highlighting for 17+ languages
- **Conversation persistence** — Conversations auto-save to localStorage with a sidebar for browsing, switching, and deleting past chats
- **File explorer** — Right-side panel showing the sandbox's file tree, auto-refreshing after each tool call
- **Language selector** — Switch between JavaScript, TypeScript, and Python per conversation
- **Mobile responsive** — Fully usable on mobile (375px+) with `dvh` viewport, responsive typography, and collapsible panels
- **Security hardened** — IP-based rate limiting (20 req/min), input length validation (10k chars), stdout truncation (50k chars), capped model output (4096 tokens)

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

| Decision                          | Rationale                                                             |
| --------------------------------- | --------------------------------------------------------------------- |
| `streamText` over `ToolLoopAgent` | Simpler, well-documented, sufficient for scoped tool-calling loops    |
| Sandbox session reuse (Map + TTL) | Enables stateful multi-step coding; 5-min idle cleanup prevents leaks |
| Shiki over Prism                  | VS Code-quality highlighting with broader language support            |
| localStorage over database        | Keeps demo self-contained with zero infrastructure dependencies       |
| SSE for output streaming          | Decoupled from chat stream; graceful fallback when unavailable        |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main chat UI (useChat, state, layout)
│   ├── layout.tsx                  # Root layout (Geist font, metadata)
│   ├── globals.css                 # Tailwind + dark theme + animations
│   └── api/
│       ├── chat/route.ts           # POST — AI agent with runCode & writeFile tools
│       └── sandbox/
│           ├── stream/route.ts     # GET SSE — real-time stdout/stderr streaming
│           └── files/route.ts      # GET — sandbox file tree listing
├── components/
│   ├── ChatMessage.tsx             # Message bubble (user/AI) with avatar
│   ├── ToolCard.tsx                # Sandbox execution card with lifecycle display
│   ├── WriteFileCard.tsx           # File creation card with syntax preview
│   ├── ChatInput.tsx               # Input bar + language selector + send/stop
│   ├── EmptyState.tsx              # Welcome screen with clickable example prompts
│   ├── ConversationSidebar.tsx     # Left sidebar for conversation history
│   ├── FileExplorer.tsx            # Right sidebar for sandbox file tree
│   ├── MarkdownRenderer.tsx        # react-markdown with styled components
│   ├── CodeBlock.tsx               # Shiki syntax-highlighted code block
│   ├── CopyButton.tsx              # Clipboard copy with success feedback
│   ├── LifecycleIndicator.tsx      # Sandbox → Running → Result status dots
│   ├── NetworkBanner.tsx           # Offline detection banner
│   └── Toast.tsx                   # Toast notification system
└── lib/
    ├── constants.ts                # Model config, limits, system prompts
    ├── sandbox.ts                  # SandboxSessionManager, executeCode, writeFile
    ├── output-stream.ts            # OutputStreamManager (EventEmitter + SSE bridge)
    ├── conversations.ts            # localStorage persistence helpers
    ├── highlighter.ts              # Shiki singleton with language preloading
    └── types.ts                    # Shared TypeScript types & type guards
```

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

- "Write a Python script that generates the first 20 Fibonacci numbers"
- "Create a TypeScript function to check if a number is prime, then test it with 17 and 20"
- "Build a REST API mock that returns JSON user data"
- "Generate 5 random UUIDs without any external packages"
