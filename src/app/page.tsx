'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect, type FormEvent } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { EmptyState } from '@/components/EmptyState';

export default function Chat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, sendMessage, status, error, stop } = useChat();

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage({ text });
  };

  return (
    <div className='flex flex-col h-dvh bg-background text-foreground'>
      {/* Header */}
      <header className='flex-shrink-0 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-emerald-950/30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='text-base sm:text-lg font-bold tracking-tight'>
            Sandbox Agent
          </h1>
          <p className='text-xs text-zinc-400 mt-0.5 tracking-wide hidden sm:block'>
            Describe a task — the agent writes code and executes it in a
            sandboxed microVM
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setInput('');
            }}
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
            <ChatMessage key={message.id} message={message} />
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
      />
    </div>
  );
}
