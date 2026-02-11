# Plan: Code Executor Chatbot with Vercel Sandbox

A Next.js chat app where users describe a coding task in natural language, an OpenAI-powered agent generates code, executes it inside a Vercel Sandbox (Firecracker microVM), and returns the output in a clean chat UI (model tokens stream; tool results arrive after execution). The architecture cleanly demonstrates agents, tool calling, and sandboxed execution, which is exactly what Questom wants to evaluate.

## Steps

### 1. Scaffold the project ✅

- Used `npx create-next-app@latest questom-sandbox-agent --app --typescript --tailwind --eslint`
- Installed dependencies: `npm install ai @ai-sdk/openai @vercel/sandbox zod`
- Also installed `@ai-sdk/react` (required separately in AI SDK v6 — not bundled with `ai`)
- Installed versions: `ai@6.0.79`, `@ai-sdk/openai@3.0.26`, `@vercel/sandbox@1.5.0`, `zod@4.3.6`, `next@16.1.6`, `react@19.2.3`

### 2. Set up environment variables ✅

- Created `.env.local` with `OPENAI_API_KEY` and `VERCEL_OIDC_TOKEN`
- Ran `vercel link` then `vercel env pull` to set up OIDC-based sandbox auth
- Note: local `VERCEL_OIDC_TOKEN` expires (~12 hours). If sandbox auth fails, re-run `vercel env pull`

### 3. Build the API route (backend agent logic) ✅

- Created `src/app/api/chat/route.ts`
- Uses `streamText` with `openai('gpt-5-mini')`, `stopWhen: stepCountIs(5)`
- Defines `runCode` tool with `tool()` from AI SDK using `inputSchema` (not `parameters` — v6 change)
- **API corrections applied during implementation:**
  - `tool()` uses `inputSchema` property, not `parameters` (AI SDK v6)
  - Sandbox `runCommand` uses positional overload `runCommand(cmd, args)` — no `stdout: 'pipe'` needed
  - `stdout()` / `stderr()` are async methods returning `Promise<string>`, not direct properties
  - Added `convertToModelMessages()` — required because `useChat` v6 sends `UIMessage[]` (with `parts`), but `streamText` expects `ModelMessage[]`
  - Returns `result.toUIMessageStreamResponse()` (v6 method — `toDataStreamResponse()` doesn't exist)
- Sandbox timeout set to 30 seconds via `Sandbox.create({ timeout: 30_000 })`
- Error catch in tool execute returns structured `{ stdout, stderr, exitCode }` so the agent can react instead of crashing

### 4. Build the chat UI (frontend) ✅

- Rewrote `src/app/page.tsx` with `useChat` from `@ai-sdk/react`
- **AI SDK v6 API changes from original plan:**
  - No `input`, `handleInputChange`, `handleSubmit` — managed with `useState` + `sendMessage({text})`
  - No `message.content` or `message.toolInvocations` — everything in `message.parts` array
  - Tool parts accessed as `part.type === 'tool-runCode'` with states: `input-streaming`, `input-available`, `output-available`, `output-error` (not the old `call`/`result`)
  - No client-side `maxSteps` — server's `stopWhen: stepCountIs(5)` handles multi-step loops
  - `status` property (`ready`/`submitted`/`streaming`/`error`) replaces old `isLoading`
- Dark theme (always-on, removed light/dark toggle), emerald accent, Geist font
- Message bubbles with user/AI avatars
- Tool invocation cards with code block, stdout/stderr sections, exit code
- Empty state with example prompt, error display, stop button during streaming
- Updated `globals.css` (forced dark mode) and `layout.tsx` (title: "Sandbox Agent")

### 5. Add sandbox lifecycle display (differentiator) ✅

- Built into Step 4's `ToolInvocation` component
- Lifecycle indicator: `○ Sandbox → ○ Running → ○ Result` with animated states
  - Yellow pulsing `◐` for active step, green `●` for completed steps
- Spinner + "Executing in sandbox…" shown during `input-available` state
- Verified working end-to-end: prompt → agent writes code → sandbox executes → output displayed

---

## Phase 2: Level Up the Demo

Transform the working prototype into a polished, architecturally sound demo that showcases engineering depth _and_ product thinking. Four pillars: **code architecture**, **UI/UX polish**, **new features (wow factor)**, and **quality/robustness**.

### 6. Extract components & clean up architecture ✅

- Break up the 306-line `page.tsx` into focused components:
  - `components/ChatMessage.tsx` — user/AI message bubble with avatar
  - `components/ToolCard.tsx` — sandbox execution card with lifecycle display
  - `components/ChatInput.tsx` — input bar + send/stop buttons
  - `components/EmptyState.tsx` — empty chat placeholder with clickable example prompts
  - `components/LifecycleIndicator.tsx` — the 3-step sandbox lifecycle dots
- Add `lib/` folder:
  - `lib/sandbox.ts` — sandbox creation/management logic extracted from `route.ts`
  - `lib/constants.ts` — model name, max steps, timeout values, system prompt
- Fix type safety — replace manual `ToolPart` interface and `as unknown as ToolPart` cast with proper AI SDK v6 exported types
- Remove unused default Next.js SVGs from `public/`
- Add a custom favicon

### 7. Markdown rendering for AI responses ✅

- Installed `react-markdown` + `remark-gfm`
- Created `components/MarkdownRenderer.tsx` with styled components for headings, lists, inline/block code, links, tables, blockquotes
- AI text parts now render as proper Markdown; user messages stay plain text
- Replaced plain `whitespace-pre-wrap` rendering in `ChatMessage`

### 8. Syntax highlighting ✅

- Installed `shiki` for VS Code-quality highlighting
- Created `lib/highlighter.ts` — singleton highlighter with `vitesse-dark` theme, preloaded 17 common languages, dynamic loading fallback for others
- Created `components/CodeBlock.tsx` — client component that async-highlights code via `useEffect`, shows plain-text fallback during load
- Applied to:
  - Code blocks inside AI markdown responses (via `MarkdownRenderer` `code` component)
  - Code display in `ToolCard` (replaced plain emerald monospace)
  - stdout output sections in `ToolCard`

### 9. Copy-to-clipboard buttons ✅

- Created reusable `CopyButton` component with clipboard API + fallback
- Copy buttons appear on hover (opacity transition) on:
  - Code blocks in tool cards
  - stdout output sections
  - Code blocks in AI markdown responses
- Shows checkmark icon with emerald highlight for 2s after copying

### 10. Clickable example prompts ✅

- Turned the `EmptyState` example text into 4 interactive suggestion chips (rounded pill buttons)
- Auto-send when clicked via `onPromptClick` → `sendMessage({ text: prompt })`
- Prompts: Fibonacci, JSON API, UUID v4, prime numbers

### 11. Conversation reset button ✅

- Added "New Chat" button in the header (only visible when messages exist)
- Calls `setMessages([])` + `setInput('')` from `useChat`
- Disabled while streaming to prevent mid-conversation reset
- Styled with border + hover emerald accent, includes a pencil/compose icon

### 12. Entrance animations & visual polish ✅

- Added `animate-message-in` (fade-in + slide-up, 0.3s ease-out) on all chat messages
- Added `animate-card-in` (fade-in + slide-up + subtle scale, 0.35s) on tool cards with shadow
- Added `animate-fade-in-up` (0.5s) on empty state entrance
- Replaced `animate-pulse` on "Thinking…" with custom `animate-thinking` keyframe for smoother pulse
- Lifecycle indicator steps now use `transition-all duration-500` for smooth color/scale changes between states
- Header: subtle `bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-emerald-950/30` with softer border
- Avatars upgraded to `bg-gradient-to-br` with shadow for depth
- Typography: bolder header title (`font-bold tracking-tight`), smaller subtitle (`text-xs`), larger empty state title (`text-xl font-semibold`), relaxed AI text leading
- Example prompt chips: slightly larger padding, `hover:bg-emerald-500/5` glow effect, `transition-all`
- Tool card header has more vertical padding and softer background opacity

### 13. Mobile responsiveness pass ✅

- Switched `h-screen` → `h-dvh` for proper mobile viewport height (avoids iOS keyboard/toolbar issues)
- **Header**: reduced padding on mobile (`px-4 sm:px-6`), hid subtitle on small screens (`hidden sm:block`), prevented "New Chat" button squishing (`whitespace-nowrap flex-shrink-0`)
- **Message bubbles**: `max-w-[calc(100%-2.5rem)] sm:max-w-[85%]` prevents overflow when avatar + gap + bubble exceed viewport width; reduced gap (`gap-2 sm:gap-3`), responsive avatar sizes (`w-6 h-6 sm:w-7 sm:h-7`)
- **ToolCard**: responsive padding (`px-3 sm:px-4`) on all sections (header, executing, stdout, stderr, exit code, error)
- **Lifecycle indicator**: smaller gap and font on mobile (`gap-1.5 sm:gap-3 text-[10px] sm:text-xs`) so 3-step indicator fits on 375px screens
- **ChatInput**: responsive padding (`px-3 sm:px-4`), `min-w-0` on input to prevent flex overflow, smaller button padding on mobile (`px-3 sm:px-5`)
- **EmptyState**: reduced top margin on mobile (`mt-16 sm:mt-32`), added horizontal padding (`px-2`) so prompt chips don't hit screen edges

### 14. Sandbox session reuse (wow factor) ✅

- Instead of creating a fresh `Sandbox` per tool call, maintain a sandbox per conversation session
- Enables **stateful multi-step coding**: user says "create a file" → "run it" → "modify it" — all in the same sandbox filesystem
- Store sandbox references in a `Map<conversationId:runtime, Sandbox>` with TTL-based cleanup (5 min idle)
- Pass `conversationId` from the client via `DefaultChatTransport` `body` option (resolved per-request via ref)
- **Implementation details:**
  - `lib/sandbox.ts` — `SandboxSessionManager` with `getOrCreateSandbox(conversationId, runtime)`, periodic cleanup interval, dead-sandbox recovery (auto-recreates if sandbox died from timeout/OOM)
  - `route.ts` — extracts `chatId` from request body, passes to `executeCode()` so all tool calls in a conversation share the same sandbox
  - `page.tsx` — generates `chatId` via `crypto.randomUUID()`, stored in a ref, passed via `DefaultChatTransport({ body })`, reset on "New Chat"
  - `constants.ts` — `SANDBOX_TIMEOUT` bumped to 5 min (sandbox lifetime), added `SANDBOX_SESSION_TTL` (5 min idle cleanup)
  - System prompt updated to tell the AI that sandbox filesystem persists across calls
  - Backward compatible: requests without `chatId` fall back to one-off sandbox behavior

### 15. Multi-file / filesystem support ✅

- Added `writeFile` tool — writes arbitrary files (config, data, HTML, JSON, etc.) to the sandbox filesystem
- Evolved `runCode` tool with optional `filePath` parameter — when set, writes code to that path and executes from file (e.g., `node /vercel/sandbox/app.js`) instead of inline `node -e`
- **Implementation details:**
  - `lib/sandbox.ts` — added `writeFileToSandbox(filePath, content, conversationId?)` function; updated `runInSandbox` to handle file-based execution with `mkdir -p` for parent dirs + heredoc write
  - `route.ts` — registered `writeFile` tool with `filePath`, `content`, `description` inputs; updated `runCode` inputSchema with optional `filePath`
  - `lib/types.ts` — added `WriteFileInput`, `WriteFileOutput`, `WriteFileToolPart` types + `isWriteFileToolPart()` type guard; added `filePath` to `RunCodeInput`
  - `components/WriteFileCard.tsx` — new component with file icon, filename display, syntax-highlighted content preview (auto-detected from extension), success/failure status, copy button
  - `components/ChatMessage.tsx` — now renders `WriteFileCard` for `tool-writeFile` parts
  - `components/ToolCard.tsx` — shows file path (blue, mono) in header when `runCode` uses `filePath`
  - `lib/constants.ts` — system prompt updated with multi-file workflow instructions (writeFile for supporting files, runCode+filePath for entry points, `/vercel/sandbox/` root)
- Enables multi-file project workflows: e.g., writeFile to create `utils.js` + `config.json`, then runCode with filePath to execute `index.js` that imports them

### 16. Real-time output streaming ✅

- Vercel Sandbox SDK supports `runCommand({ detached: true })` + `cmd.logs()` async generator for streaming stdout/stderr
- **Architecture:** Separate SSE endpoint + in-memory event emitter bridge between tool execution and client
- **Implementation details:**
  - `lib/output-stream.ts` — `OutputStreamManager` singleton using Node.js `EventEmitter`, keyed by `chatId`. Supports `start(id)`, `push(id, chunk)`, `subscribe(id, onChunk, onDone)`, `end(id)`. Late subscribers receive buffered chunks immediately. Auto-cleanup after 10s.
  - `lib/sandbox.ts` — `runInSandbox` now accepts optional `streamId`; when present, uses `detached: true` mode, iterates `cmd.logs()` yielding `{ data, stream }` chunks, pushes each to `outputManager`, then calls `cmd.wait()` for exit code. Session-based executions always stream; one-off executions use the original non-streaming path.
  - `app/api/sandbox/stream/route.ts` — SSE `GET` endpoint accepting `?chatId=<id>`. Creates a `ReadableStream`, subscribes to `outputManager`, sends each chunk as `data: JSON\n\n` SSE events, sends `{ type: 'done' }` on completion. Handles client disconnect via `req.signal` abort.
  - `components/ToolCard.tsx` — now a client component (`'use client'`); accepts `chatId` prop. When `isExecuting`, opens an `EventSource` to `/api/sandbox/stream?chatId=...`, accumulates stdout/stderr in state, displays them in real-time with pulsing `●` live indicator. Auto-scrolls streamed output. On `output-available`, closes EventSource and shows final output with copy buttons. Max-height 60 with overflow scroll on streaming output.
  - `components/ChatMessage.tsx` — accepts and forwards `chatId` to `ToolCard`
  - `app/page.tsx` — passes `chatIdRef.current` to `ChatMessage`
- **Graceful fallback:** In serverless environments where the SSE route runs in a separate instance (no shared memory), EventSource silently fails — the ToolCard shows the spinner and output appears all at once when execution completes (original behavior). No degraded experience.
- **UX impact:** For long-running scripts, users see stdout/stderr lines appear in real-time during execution instead of waiting for the full result

### 17. Conversation persistence (localStorage) ✅

- Save conversations to `localStorage` — auto-persisted whenever messages change
- Added a collapsible sidebar (`ConversationSidebar.tsx`) for browsing/switching/deleting past conversations
- **Implementation details:**
  - `lib/conversations.ts` — `Conversation` type (id, title, language, messages, timestamps), `loadConversations()`, `saveConversation()`, `deleteConversation()`, `deriveTitle()` (auto-derives from first user message, truncated to 50 chars)
  - `components/ConversationSidebar.tsx` — fixed sidebar with conversation list, time-ago labels, language badge (JS/TS/PY), delete button on hover, new-chat button, mobile backdrop overlay
  - `page.tsx` — loads conversations on mount, auto-saves on message changes, sidebar toggle button in header, `handleSelectConversation` restores messages + language + chatId, `handleDeleteConversation` with active-chat fallback
- Sidebar shows on click of panel icon in header; closes on mobile via backdrop tap
- Purely client-side — no database dependency

### 18. Language selector ✅

- Added compact dropdown in the input bar to switch between JavaScript / Python / TypeScript
- **Implementation details:**
  - `components/ChatInput.tsx` — added `<select>` dropdown with JS/TS/PY options, custom chevron icon, disabled during streaming, `language` and `onLanguageChange` props
  - `lib/constants.ts` — `SupportedLanguage` type, `getSystemPrompt(language)` function with per-language instructions (JS: ES2023+, PY: Python 3 idioms, TS: strong typing + tsx runner), kept `SYSTEM_PROMPT` export for backward compat
  - `app/api/chat/route.ts` — extracts `language` from request body, validates against allowed set, passes to `getSystemPrompt()`, updated `runCode` tool's `inputSchema` enum to include `'typescript'`
  - `lib/sandbox.ts` — added `ExecLanguage` type with `'typescript'`, `argsForLanguage()` helper for tsx-based execution, auto-installs `tsx` globally in sandbox on first TS run
  - `lib/types.ts` — updated `RunCodeInput.language` to `'javascript' | 'python' | 'typescript'`
  - `page.tsx` — `language` state + `languageRef` for transport body, passed to `ChatInput`, persisted with conversations, restored on conversation switch
- Language selection is saved per conversation and restored when switching back

### 19. File explorer panel (if sandbox reuse works) ✅

- Collapsible sidebar showing the sandbox's file tree
- Makes the multi-step coding experience tangible and visible
- Fetched from sandbox after each tool call
- **Implementation details:**
  - `lib/sandbox.ts` — added `listSandboxFiles(conversationId)` function that runs `find` in the active sandbox, excluding `node_modules`/`.npm`/`package-lock.json`. Returns flat `FileEntry[]` array with `path`, `type`, `size`. Checks both `node24` and `python3.13` runtimes for the given conversation.
  - `app/api/sandbox/files/route.ts` — GET endpoint accepting `?chatId=<id>`, returns JSON `{ files: FileEntry[] }` from the session's sandbox.
  - `components/FileExplorer.tsx` — right-side collapsible panel with tree-view rendering. Converts flat file list to nested `TreeNode` tree. Features: folder expand/collapse, file-type emoji icons (JS, TS, PY, JSON, HTML, CSS, etc.), file sizes, directory-first sorting, refresh button with spin animation, empty state, loading spinner, mobile backdrop overlay. Auto-fetches when panel opens or `refreshKey` increments.
  - `page.tsx` — added `fileExplorerOpen` state + `fileRefreshKey` counter. File explorer toggle button in header (folder icon, emerald highlight when active, only visible when messages exist). `refreshKey` auto-increments when streaming completes and the latest message contains tool parts. Resets on new chat, refreshes on conversation switch.

### 20. Accessibility fixes ✅

- Add `<label>` for the chat input (visually hidden is fine) — already present
- `aria-hidden="true"` on decorative avatar elements — already present
- `aria-live="polite"` on the message list for screen reader announcements — already present
- Fix `text-zinc-500` contrast on dark background → bumped to `text-zinc-400` across all components (ToolCard, EmptyState, CopyButton, FileExplorer, ConversationSidebar, LifecycleIndicator); also bumped `text-zinc-600` → `text-zinc-500` and `text-zinc-700` → `text-zinc-600` for secondary/tertiary text; fixed `placeholder-zinc-500` → `placeholder-zinc-400`
- Add `role="status"` to the "Thinking…" indicator — already present
- Keyboard shortcut hint: added `↵` (return symbol) next to "Send" button label, hidden on mobile (`hidden sm:inline-flex`)
- Added `aria-label` to icon-only toggle buttons (sidebar, file explorer) for screen readers

### 21. Error handling improvements ✅

- **Retry button on failed messages:** Added `regenerate()` from `useChat` hook. Error display now shows a styled "Retry" button with a refresh icon that re-attempts the last request.
- **Network disconnection detection:** Created `NetworkBanner` component using `navigator.onLine` + `online`/`offline` event listeners. Shows an amber warning banner below the header when offline, auto-hides when connectivity returns.
- **Toast notifications for transient errors:** Created `Toast` component system (`ToastContainer` + `useToasts` hook). Toasts appear in top-right corner with slide-in animation, auto-dismiss after 5s, support error/success/info types. Connected to `useChat`'s `onError` callback so any API error triggers a toast notification in addition to the inline error display.

### 22. Security hardening ✅

- **`maxOutputTokens: 4096`** on `streamText` to cap response cost per request
- **Input message length validation:** API route rejects messages exceeding `MAX_INPUT_LENGTH` (10,000 chars) with a 400 response before hitting the model
- **Stdout/stderr truncation:** `truncateOutput()` helper in `sandbox.ts` caps output at `MAX_OUTPUT_SIZE` (50,000 chars) with a truncation notice — applied to both streaming and non-streaming execution paths
- **In-memory rate limiting:** IP-based sliding window (20 requests/minute per IP). Returns 429 when exceeded. Uses `x-forwarded-for` header for proxy-aware IP detection. Resets per-window automatically.
- All constants (`MAX_TOKENS`, `MAX_INPUT_LENGTH`, `MAX_OUTPUT_SIZE`) centralized in `constants.ts`

### 23. Smart auto-scroll ✅

- Only auto-scroll if user is near the bottom of the chat (within 150px)
- If user has scrolled up to read history, new messages don't jump them down
- `scrollContainerRef` + `onScroll` handler tracks whether user is near bottom via `shouldAutoScrollRef`
- Auto-scroll re-engages when user submits a message or starts a new chat
- **Implementation details:**
  - `page.tsx` — added `scrollContainerRef` and `shouldAutoScrollRef` refs, `handleScroll` callback that checks `scrollHeight - scrollTop - clientHeight < 150`, `useEffect` on `[messages]` that only calls `scrollIntoView` when `shouldAutoScrollRef.current` is true
  - `handleSubmit` and `handleNewChat` both reset `shouldAutoScrollRef` to `true` so new user actions always scroll to bottom

### 24. Update README ✅

- Replaced default create-next-app README with project-specific documentation
- Includes: feature list, ASCII architecture diagram, project structure, setup instructions, tech stack table, example prompts
- Covers: prerequisites, env setup (`vercel link` + `vercel env pull`), dev server, Vercel deployment
- Documents key architectural decisions in a comparison table

---

## Phase 3: Deploy & Present

### 25. Fix remaining lint errors ✅

- **Icons.tsx** — `react/display-name` error: fixed by converting anonymous arrow in `icon()` factory to a named `Icon` function component with `displayName`
- **NetworkBanner.tsx** — was already clean: uses lazy initializer `useState(() => ...)`, no lint error
- `npm run lint` — passes with zero errors ✅
- `npx tsc --noEmit` — passes with zero errors ✅

### 26. Push to GitHub ✅

- Pushed to GitHub — `git push -u origin main` succeeded
- Verify repo is visible and README renders correctly

### 27. Deploy to Vercel — 📋 MANUAL

- Vercel project already linked (`prj_t7GXciVaodFRiBINoGb6nqKOfVgA`, project name: `questom-sandbox-agent`)
- **TODO:** Connect the GitHub repo in Vercel dashboard → enable auto-deploy from `main`
- **TODO:** Add `OPENAI_API_KEY` in Vercel project environment variables (Settings → Environment Variables)
- Vercel Sandbox works natively when deployed on Vercel (no extra config needed)
- **Note:** Real-time output streaming (SSE via `outputManager`) requires shared memory — won't work in serverless (separate function instances). The client falls back gracefully: shows output all at once when execution completes.
- **TODO:** Test the deployed URL end-to-end: prompt → code generation → sandbox execution → output display
- **TODO:** Test multi-step sessions, language switching, file explorer, conversation persistence

### 28. Record the Loom video (~10 min) — 📋 MANUAL

- **[Outside VS Code — manual step]**
- **Prep the diagram beforehand** (Excalidraw or Mermaid):
  ```
  User → Chat UI (Next.js) → API Route (/api/chat)
                                    ↓
                              AI SDK streamText
                                    ↓
                              OpenAI GPT-5 mini
                                    ↓
                              Tool Call: runCode / writeFile
                                    ↓
                              Vercel Sandbox (Firecracker microVM)
                                    ↓
                              stdout/stderr → Tool Result → UI
  ```
- Structure the video as:
  1. **Demo first (2 min):** Show the live app — type a prompt like "Write a Python script that generates the first 20 Fibonacci numbers", watch the agent write code, execute in sandbox, return results. Also demonstrate multi-step stateful sessions and the file explorer.
  2. **Architecture overview (2 min):** Show the prepared diagram, explain data flow, highlight sandbox reuse and component architecture
  3. **Code walkthrough (4 min):** Walk through `route.ts` (agent + tools + sandbox management), component structure, explain the tool calling loop, how `stopWhen: stepCountIs()` enables iteration, how sandbox isolation works
  4. **Under the hood (2 min):** Explain Firecracker microVMs, Amazon Linux 2023 runtime, writable `/vercel/sandbox`, why sandboxing matters for untrusted code, and the request lifecycle through AI SDK tool calls

### 29. Submit — 📋 MANUAL

- **[Outside VS Code — manual step]**
- Email `founders@questom.ai` with subject: "Assignment Submission - Video Walkthrough"
- Include: GitHub repo link, deployed Vercel URL, Loom video link

---

## Verification Checklist

- [x] **Lint:** `npm run lint` — zero errors ✅
- [x] **Types:** `npx tsc --noEmit` — zero errors ✅
- [x] **Visual:** Tested at 375px (mobile), 768px (tablet), and 1440px (desktop) — all layouts render correctly, no overflow or clipping issues, sidebars collapse on smaller viewports, prompt chips and input bar fit within bounds ✅
- [x] **Accessibility:** All buttons have accessible names, form inputs have labels, heading hierarchy starts with h1, `lang="en"` on `<html>`, `aria-live="polite"` on message list, `meta viewport` present, no images missing alt text; fixed remaining `text-zinc-600` → `text-zinc-500` in FileExplorer for contrast ✅
- [x] **Functionality:** Multi-step sandbox sessions verified — created `fib.js` with Fibonacci, then modified it to add sum calculation in the same sandbox; file persisted across tool calls, output correct (sum = 10945), exit code 0 ✅
- [x] **Error paths:** Sent intentionally broken code (`undefinedVar.property`) — agent ran it, got `ReferenceError` with exit code 1 shown in stderr section, then self-corrected with optional chaining fix (exit code 0); network disconnection banner appears on `offline` event and hides on `online` ✅
- [x] **Git:** Push to GitHub with a clean commit history ✅
- [ ] **Deploy:** Vercel deployment live and functional — 📋 MANUAL (connect GitHub repo in Vercel dashboard, add env vars, verify end-to-end)
- [ ] **Video:** Recorded, under 10 min, covers demo + architecture + code walkthrough + under the hood — 📋 MANUAL

---

## Decisions

- **Model: GPT-5 mini** — cheaper than GPT-5.2 with full reasoning + tool calling. More than sufficient for a demo assignment with limited usage (pricing varies by input/output/cached).
- **Vercel Sandbox over E2B:** You have a Vercel account, it's their own product, tighter integration when deployed on Vercel, and it signals familiarity with the Vercel ecosystem (relevant for Questom).
- **`streamText` over `ToolLoopAgent`:** `streamText` with `maxSteps` is simpler, well-documented, and sufficient for this scope. `ToolLoopAgent` is newer (AI SDK v6) and adds complexity without benefit here.
- **Single `runCode` tool → expand to multi-tool:** Started with one tool for simplicity; now adding `writeFile` to support multi-file workflows and demonstrate extensible tool architecture.
- **Minimal UI over template clone:** Building a focused, minimal UI keeps the codebase small and explainable in 10 minutes. The Next.js AI Chatbot template has auth, database, and file handling — overkill for this.
- **Sandbox reuse over fresh-per-call:** The single biggest "wow factor" — turns a code-runner into an interactive development environment. TTL-based cleanup prevents resource leaks.
- **`shiki` over `prism-react-renderer`:** Shiki gives VS Code-quality highlighting and supports more languages out of the box.
- **localStorage over backend persistence:** Keeps the demo self-contained; no database dependency.
- **Component extraction before features:** Clean architecture makes feature work faster and shows engineering maturity to evaluators.
- **Optional key management upgrade:** Use Vercel AI Gateway + OIDC to avoid storing a raw `OPENAI_API_KEY` locally; keep the direct OpenAI key as a fallback.

## Verification

- Local: `npm run dev` → open `localhost:3000` → send a prompt → confirm code runs in sandbox and output appears
- Test edge cases: syntax errors in generated code (agent should see the error and self-correct), multi-step tasks, both JS and Python
- Resource guardrail test: prompt the agent to produce an infinite loop or huge output and confirm timeout/output caps kick in (default 5-minute sandbox timeout)
- Deployed: verify the same flow on the Vercel URL
- Video: watch it back, ensure it's under 10 min and covers all 4 required explanation points

## Example Demo Prompts

Pre-plan these for the video recording:

1. **Basic execution:** "Write a Python script that generates the first 20 Fibonacci numbers"
2. **Error recovery:** "Write JavaScript that calculates factorial of 10" (with intentional typo in first attempt to show agent self-correction via multi-step)
3. **Multi-step:** "Create a function to check if a number is prime, then test it with 17 and 20"

## Fallback Plan

If `@vercel/sandbox` has issues locally:

- Develop the UI and agent logic with a mock `runCode` tool that returns fake output
- Test real sandbox integration only after deploying to Vercel (works natively there)
- Alternative: use `vercel dev` instead of `npm run dev` for better local parity

## Outside VS Code steps (flagged)

1. Run `vercel link` and `vercel env pull` to set up OIDC-based sandbox auth locally
2. Create a GitHub repo and push the code
3. Import the project in Vercel dashboard and set env vars
4. Record the Loom video
5. Send the submission email
