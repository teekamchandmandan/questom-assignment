'use client';

import { ChatProvider, useChatContext } from '@/lib/chat-context';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { ChatHeader } from '@/components/ChatHeader';
import { EmptyState } from '@/components/EmptyState';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { FileExplorer } from '@/components/FileExplorer';
import { NetworkBanner } from '@/components/NetworkBanner';
import { ToastContainer } from '@/components/Toast';
import { RetryIcon } from '@/components/Icons';

// ── Composed page ───────────────────────────────────────────────────

export default function Chat() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}

// ── Layout — thin composition of compound parts ────────────────────

function ChatLayout() {
  return (
    <div className='flex h-dvh bg-background text-foreground'>
      <ConversationSidebar />
      <div className='flex flex-col flex-1 min-w-0'>
        <NetworkBanner />
        <ChatHeader />
        <ChatMessages />
        <ChatInput />
      </div>
      <ChatToasts />
      <FileExplorer />
    </div>
  );
}

// ── Messages area ───────────────────────────────────────────────────

function ChatMessages() {
  const { state, actions, meta } = useChatContext();
  const { messages, isLoading, error } = state;
  const { regenerate, sendMessage } = actions;
  const { chatId, messagesEndRef, scrollContainerRef, handleScroll } = meta;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className='flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-8'
    >
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
          <div key={message.id} className='message-item'>
            <ChatMessage message={message} chatId={chatId} />
          </div>
        ))}

        {isLoading &&
          (() => {
            // Show thinking indicator when waiting for the model:
            // - After user sends a message (no AI response parts yet)
            // - Between multi-step tool calls (AI is reasoning for next step)
            const lastMsg = messages[messages.length - 1];
            const showThinking =
              lastMsg?.role === 'user' ||
              (lastMsg?.role === 'assistant' &&
                lastMsg.parts[lastMsg.parts.length - 1]?.type.startsWith(
                  'tool-',
                ));
            return showThinking ? (
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
                <div className='text-zinc-400 animate-thinking'>
                  Working on it…
                </div>
              </div>
            ) : null;
          })()}

        {error && (
          <div
            className='bg-red-950/50 border border-red-800 rounded-lg p-4 text-red-300 text-sm flex items-center justify-between gap-3'
            role='alert'
          >
            <span>Error: {error.message}</span>
            <button
              onClick={() => regenerate()}
              className='flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-red-900/60 hover:bg-red-800/60 text-red-200 border border-red-700/50 transition-colors flex items-center gap-1.5'
            >
              <RetryIcon />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// ── Toast notifications ─────────────────────────────────────────────

function ChatToasts() {
  const { meta } = useChatContext();
  return <ToastContainer toasts={meta.toasts} onDismiss={meta.dismissToast} />;
}
