# Loom Video Script — Sandbox Agent (~10 min)

Target: **8–10 minutes.** Record in one take if possible; Loom lets you trim dead air.

---

## Pre-Recording Checklist

- [ ] Deployed app is live and working (test one prompt before recording)
- [ ] Browser: only one tab open — the deployed Vercel URL (clean URL bar, no distracting extensions)
- [ ] VS Code: project open with `src/` tree expanded, no unrelated tabs
- [ ] Clear localStorage on the deployed site so sidebar is empty (fresh start)
- [ ] Set browser zoom to 100%, window ~1280×800 (Loom captures at 720p+)
- [ ] Select **Python** as the default language before recording (Demo A uses Python)
- [ ] Have the architecture diagram ready (Excalidraw or a pre-rendered PNG/SVG) — see section below
- [ ] Close Slack, notifications, and anything that might pop up
- [ ] Loom: select "Screen + Camera", camera in bottom-left corner

---

## Architecture Diagram (prepare in advance)

Use Excalidraw or Figma to draw this. Keep it clean — white/dark background, minimal colors.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Chat UI)                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ ChatProvider │→ │ useChat()   │→ │ Next.js API Routes   │ │
│  │ (context)    │  │ (AI SDK v6) │  │ POST /api/chat       │ │
│  └─────────────┘  └─────────────┘  └──────────┬───────────┘ │
└───────────────────────────────────────────────│──────────────┘
                                                │
                                                ▼
                                ┌──────────────────────────┐
                                │  AI SDK streamText()     │
                                │  Model: GPT-5 mini       │
                                │  Tools: runCode,writeFile│
                                └──────────┬───────────────┘
                                           │ tool call
                                           ▼
                                ┌──────────────────────────┐
                                │  Vercel Sandbox          │
                                │  (Firecracker microVM)   │
                                │  Amazon Linux 2023       │
                                │  Node 24 / Python 3.13   │
                                └──────────┬───────────────┘
                                           │ stdout/stderr
                                           ▼
                                ┌──────────────────────────┐
                                │  Tool Result → AI        │
                                │  → continues or responds │
                                └──────────────────────────┘
```

---

## Section 1 — Live Demo (0:00 – 2:30)

**Goal:** Hook the viewer immediately. Show the product working, not slides.

### Opening (10 sec)

> "Hi, I'm [Name]. This is Sandbox Agent — a chat app where you describe a coding task in plain English, and an AI agent writes the code, executes it inside a secure sandbox, and streams back the results. Let me show you."

### Demo A — Basic execution (45 sec)

1. Click the **"Calculate the first 20 Fibonacci numbers"** example prompt chip (language selector should already be on Python)
2. While it streams, narrate:
   > "The AI is generating Python code. You can see the response streaming in real-time — that's the AI SDK's streaming protocol."
4. When the ToolCard appears:
   > "Now it's executing inside a Vercel Sandbox — a Firecracker microVM. You can see the lifecycle indicator: Sandbox, Running, Result."
5. When output appears:
   > "And there's our Fibonacci sequence. The exit code is 0, clean execution. The code has Shiki syntax highlighting — same engine as VS Code."

### Demo B — Multi-step stateful session (60 sec)

1. Type: "Create a utility function that checks if a number is prime and save it to /vercel/sandbox/prime_utils.py"
   *(Being explicit about the file path nudges the agent to use writeFile/runCode with filePath, making the multi-step experience more reliable.)*
2. While it runs:
   > "Because sandboxes are reused per conversation, the AI can build up files incrementally. Watch — it'll save a utility module to the sandbox filesystem."
3. Wait for the WriteFileCard or ToolCard to appear.
4. Then type: "Now write a main script that imports prime_utils and tests every number from 1 to 30"
5. While it runs:
   > "This is the multi-step experience — it's importing the file it created moments ago. Same sandbox, same filesystem."
6. Open the **File Explorer** panel (click the folder icon in the header):
   > "The file explorer shows every file in the sandbox — you can click any file to preview its contents. It refreshes automatically after each tool call."

**Fallback:** If the AI completes everything in a single tool call, narrate: "The agent was efficient and did it in one step — but the sandbox would persist if we continued building on it." Then move to Demo C.

### Demo C — Error self-correction (30 sec)

1. Switch the language selector to **JavaScript**
2. Type: "Fetch data from httpx://invalid-url and parse the JSON response"
3. Wait for it to fail and self-correct:
   > "The AI sees the error in stderr, analyzes what went wrong, fixes the code, and retries automatically — up to 5 steps. That's the `stopWhen: stepCountIs(5)` configuration on the server."

### Demo D — Show conversation sidebar (15 sec)

1. Click the **sidebar toggle** (panel icon, top-left)
   > "Conversations persist in localStorage. You can switch between past sessions, and each one restores its full message history and language selection."
2. Close the sidebar.

### Transition (5 sec)

> "Let me walk you through how this is built."

---

## Section 2 — Architecture Overview (2:30 – 4:30)

**Goal:** Show the prepared diagram. Explain the data flow clearly and concisely.

1. Switch to the **architecture diagram** (pre-opened tab, or screen-share switch)

2. Walk through the diagram top-to-bottom:

   > "The app is a Next.js 16 App Router project. All state lives in a single ChatProvider context — one place for messages, input, language, sidebar state, everything."

   > "When the user sends a message, `useChat` from the AI SDK sends it to a POST API route at `/api/chat`. The route calls `streamText` with GPT-5 mini and two tools: `runCode` and `writeFile`."

   > "When the model decides to call a tool, the AI SDK automatically invokes the tool's `execute` function. For `runCode`, that spins up a Vercel Sandbox — a Firecracker microVM running Amazon Linux 2023 — executes the code, and returns stdout, stderr, and the exit code."

   > "The model sees the tool result and either responds to the user or makes another tool call. The `stopWhen: stepCountIs(5)` guard prevents infinite loops."

3. Highlight sandbox session reuse:

   > "One key architectural decision: sandboxes are reused across tool calls within a conversation. There's a session manager — a Map keyed by conversation ID and runtime — with a 5-minute idle TTL. This means the AI can create a file in one step and import it in the next. When a sandbox dies from timeout or OOM, the catch block auto-recreates a fresh one."

4. Mention the SSE streaming:

   > "There's a second endpoint, `/api/sandbox/stream`, that pipes real-time stdout/stderr via Server-Sent Events. During long-running scripts, output appears line by line instead of all at once. This uses an in-memory EventEmitter bridge that works in single-instance deployments and falls back gracefully in serverless."

---

## Section 3 — Code Walkthrough (4:30 – 8:00)

**Goal:** Walk through the actual code. Show engineering depth, not just features.

### 3A — API Route: the agent brain (75 sec)

Switch to VS Code → open [src/app/api/chat/route.ts](src/app/api/chat/route.ts)

> "This is the API route — the core of the agent."

1. **Security first** — scroll to the rate limiter (~line 20):

   > "Before anything hits the model, there's an in-memory rate limiter — 20 requests per minute per IP — and input validation that rejects messages over 10,000 characters. Intentionally simple for a demo, but the pattern is here."

2. **Tool definitions** — scroll to `const runCode = tool({` (~line 84):

   > "Here are the two tools — `runCode` and `writeFile`. Each uses AI SDK v6's `tool()` function with `inputSchema` — a Zod v4 schema. Notice the `conversationId` captured in the closure — that's what makes all tool calls in a conversation share the same sandbox."

3. **streamText call** — scroll to `const result = streamText({` (~line 124):
   > "`streamText` ties it together — GPT-5 mini, a language-specific system prompt, both tools, a 5-step guard via `stopWhen`, and a 4096 token output cap. The response goes out as `toUIMessageStreamResponse()` — the streaming format that pairs with the client's `useChat`."

### 3B — Sandbox manager (60 sec)

Open [src/lib/sandbox.ts](src/lib/sandbox.ts)

> "The sandbox manager is where the infrastructure logic lives."

1. **Session Map** — scroll to `getSessions()` (~line 42):

   > "Sessions are stored on `globalThis` with a Symbol key — this ensures the same Map is shared across all API route bundles in Next.js turbopack. Without this, the chat route and the file explorer route would see different sandbox instances."

2. **getOrCreateSandbox** — scroll down (~line 74):

   > "This function checks if a sandbox exists for this conversation and runtime. If yes, it refreshes the timestamp and returns it. If not, it calls `Sandbox.create()` — that's where the Firecracker microVM actually spins up. If a sandbox dies from timeout or OOM, the error handler deletes the session so the next call creates a fresh one."

3. **Streaming execution** — scroll to the streaming logic:
   > "For streaming, we run commands in detached mode and iterate `cmd.logs()` — an async generator that yields stdout and stderr chunks. Each chunk gets pushed to an `outputManager` — an EventEmitter that bridges to a separate SSE endpoint. That's how output appears line by line during long executions."

### 3C — Component architecture (60 sec)

Open [src/lib/chat-context.tsx](src/lib/chat-context.tsx)

> "On the frontend, there's one context provider — `ChatProvider`. It exports three objects: `state` for all read values, `actions` for mutations like `sendMessage` and `newChat`, and `meta` for refs and derived values like `chatId`. Every component pulls from this single context."

Open [src/app/page.tsx](src/app/page.tsx)

> "The page itself is just a thin composition — `ChatProvider` wraps `ChatLayout`, which stacks the sidebar, header, messages area, input bar, toasts, and file explorer. Each is a focused component, typically under 150 lines."

Open [src/components/ChatMessage.tsx](src/components/ChatMessage.tsx)

> "Messages render through a parts loop. AI SDK v6 uses `message.parts` — each part is either text, a tool call, or a tool result. The type guards — `isRunCodeToolPart`, `isWriteFileToolPart` — dispatch to the right card component. Adding a new tool is a matter of adding a type guard, a card component, and wiring it in here."

---

## Section 4 — Under the Hood (8:00 – 9:30)

**Goal:** Show you understand the infrastructure, not just the framework.

> "Let me quickly explain what's happening under the hood when code executes."

1. **Firecracker microVMs:**

   > "Vercel Sandbox uses Firecracker — the same virtualization technology that powers AWS Lambda and Fargate. Each sandbox is a lightweight microVM with its own kernel, not just a container. That means full process isolation — even if the user's code tries to escape, it's trapped in its own VM."

2. **Runtime environment:**

   > "Inside, it's Amazon Linux 2023 with Node.js 24 or Python 3.13, depending on the language. The writable filesystem is at `/vercel/sandbox/`, and it supports installing npm packages or pip packages at runtime."

3. **Security boundaries:**

   > "On top of sandbox isolation, the app has its own guardrails: rate limiting at the API layer, input length caps, stdout truncation at 50,000 characters so a runaway `while True: print()` doesn't blow up the response, and the model output is capped at 4,096 tokens per turn."

4. **Request lifecycle:**
   > "So the full lifecycle is: user message → API route validates and rate-limits → `streamText` sends the conversation to GPT-5 mini → the model decides to call `runCode` → the tool's `execute` function gets or creates a sandbox → code runs in the microVM → stdout/stderr stream back via SSE while the command runs → the final result goes back to the model as a tool result → the model generates a natural language summary → that streams to the UI."

---

## Section 5 — Closing (9:30 – 10:00)

> "To summarize: this is a Next.js App Router application using AI SDK v6 and Vercel Sandbox. The agent can write and execute code across multiple languages, maintain state across conversation turns, stream output in real-time, and self-correct when things go wrong — all inside isolated Firecracker microVMs."

> "The code is on GitHub and the app is deployed on Vercel. This project is really about building the kind of agent-powered developer tooling that I'm excited to work on — taking LLM capabilities and turning them into products with real engineering behind them. Thanks for watching."

---

## Timing Cheat Sheet

| Section                 | Start | Duration  | Notes                              |
| ----------------------- | ----- | --------- | ---------------------------------- |
| 1. Live demo            | 0:00  | 2:30      | Hook immediately, 3 demos + sidebar |
| 2. Architecture diagram | 2:30  | 2:00      | Pre-made diagram, top-to-bottom    |
| 3. Code walkthrough     | 4:30  | 3:30      | route.ts → sandbox.ts → components |
| 4. Under the hood       | 8:00  | 1:30      | Firecracker, security, lifecycle   |
| 5. Closing              | 9:30  | 0:30      | Summary + sign off                 |
| **Total**               |       | **10:00** |                                    |

## Tips

- **Lead with the demo.** Don't explain before showing. Let the product speak, then explain how it works.
- **Don't read code line-by-line.** Zoom to the relevant section, highlight the key concept, move on. Use `Cmd+G` to jump to a line number if needed.
- **Use VS Code shortcuts:** `Cmd+P` to jump between files quickly. Pre-open the 4–5 files you'll reference in tabs.
- **If something breaks live**, narrate it: "This is actually great — you can see the error recovery in action." Roll with it.
- **Keep the camera visible** but small. Eye contact at the start and end; look at the screen during code walkthrough.
- **Speak slightly slower than natural** — Loom recordings often feel rushed on playback.
