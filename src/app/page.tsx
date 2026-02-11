'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type FormEvent,
} from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { EmptyState } from '@/components/EmptyState';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { FileExplorer } from '@/components/FileExplorer';
import {
  loadConversations,
  saveConversation,
  deleteConversation,
  deriveTitle,
  type Conversation,
  type Language,
} from '@/lib/conversations';

function generateId() {
  return crypto.randomUUID();
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const chatIdRef = useRef(generateId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef(language);

  // Keep the ref in sync so the transport closure sees the latest value
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Transport uses a function for `body` so it always reads the
  // latest chatIdRef / languageRef value, even after resets.
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

  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    transport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // ── Load conversations from localStorage on mount ──────────────
  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  // ── Persist conversation whenever messages change ──────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const convo: Conversation = {
      id: chatIdRef.current,
      title: deriveTitle(messages),
      language,
      messages,
      createdAt:
        conversations.find((c) => c.id === chatIdRef.current)?.createdAt ??
        Date.now(),
      updatedAt: Date.now(),
    };
    saveConversation(convo);
    setConversations(loadConversations());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Refresh file explorer after tool calls complete ────────────
  const prevStatusRef = useRef(status);
  useEffect(() => {
    // When status transitions from streaming/submitted → ready, a response finished
    if (
      prevStatusRef.current !== 'ready' &&
      status === 'ready' &&
      messages.length > 0
    ) {
      // Check if the latest assistant message has any tool parts
      const lastMsg = messages[messages.length - 1];
      const hasToolParts = lastMsg?.parts?.some((p: { type: string }) =>
        p.type.startsWith('tool-'),
      );
      if (hasToolParts) {
        setFileRefreshKey((k) => k + 1);
      }
    }
    prevStatusRef.current = status;
  }, [status, messages]);

  // ── Scroll to bottom on new messages ───────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage({ text });
  };

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput('');
    chatIdRef.current = generateId();
    setSidebarOpen(false);
    setFileExplorerOpen(false);
    setFileRefreshKey(0);
  }, [setMessages]);

  const handleSelectConversation = useCallback(
    (convo: Conversation) => {
      chatIdRef.current = convo.id;
      setMessages(convo.messages);
      setLanguage(convo.language);
      setSidebarOpen(false);
      // Trigger file explorer refresh for the new conversation
      setFileRefreshKey((k) => k + 1);
    },
    [setMessages],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      setConversations(loadConversations());
      // If deleted the active conversation, start a new one
      if (id === chatIdRef.current) {
        handleNewChat();
      }
    },
    [handleNewChat],
  );

  return (
    <div className='flex h-dvh bg-background text-foreground'>
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={chatIdRef.current}
        isOpen={sidebarOpen}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onNewChat={handleNewChat}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className='flex flex-col flex-1 min-w-0'>
        {/* Header */}
        <header className='flex-shrink-0 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-emerald-950/30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 min-w-0'>
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className='p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex-shrink-0'
              title='Toggle history'
              aria-label='Toggle conversation history'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <rect width='18' height='18' x='3' y='3' rx='2' />
                <path d='M9 3v18' />
              </svg>
            </button>
            <div className='min-w-0'>
              <h1 className='text-base sm:text-lg font-bold tracking-tight'>
                Sandbox Agent
              </h1>
              <p className='text-xs text-zinc-400 mt-0.5 tracking-wide hidden sm:block'>
                Describe a task — the agent writes code and executes it in a
                sandboxed microVM
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 flex-shrink-0'>
            {/* File explorer toggle */}
            {messages.length > 0 && (
              <button
                onClick={() => setFileExplorerOpen((o) => !o)}
                className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
                  fileExplorerOpen
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title='Toggle file explorer'
                aria-label='Toggle file explorer'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' />
                  <path d='M12 10v6' />
                  <path d='M9 13h6' />
                </svg>
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                disabled={isLoading}
                className='flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex-shrink-0'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M12 20h9' />
                  <path d='M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z' />
                </svg>
                New Chat
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className='flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-8'>
          <div
            className='max-w-3xl mx-auto space-y-4 sm:space-y-5'
            aria-live='polite'
          >
            {messages.length === 0 && (
              <EmptyState
                onPromptClick={async (prompt) => {
                  if (isLoading) return;
                  await sendMessage({ text: prompt });
                }}
              />
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                chatId={chatIdRef.current}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div
                className='flex gap-2 sm:gap-3 animate-message-in'
                role='status'
              >
                <div
                  className='w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 shadow-sm shadow-emerald-900/50'
                  aria-hidden='true'
                >
                  AI
                </div>
                <div className='text-zinc-400 animate-thinking'>Thinking…</div>
              </div>
            )}

            {error && (
              <div
                className='bg-red-950/50 border border-red-800 rounded-lg p-4 text-red-300 text-sm'
                role='alert'
              >
                Error: {error.message}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onStop={() => stop()}
          isLoading={isLoading}
          language={language}
          onLanguageChange={setLanguage}
        />
      </div>

      {/* File Explorer */}
      <FileExplorer
        chatId={chatIdRef.current}
        isOpen={fileExplorerOpen}
        onClose={() => setFileExplorerOpen(false)}
        refreshKey={fileRefreshKey}
      />
    </div>
  );
}
