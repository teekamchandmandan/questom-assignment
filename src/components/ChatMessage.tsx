import type { UIMessage } from 'ai';
import { ToolCard } from './ToolCard';
import { WriteFileCard } from './WriteFileCard';
import { MarkdownRenderer } from './MarkdownRenderer';
import { isRunCodeToolPart, isWriteFileToolPart } from '@/lib/types';

interface ChatMessageProps {
  message: UIMessage;
  chatId?: string;
}

// ── Explicit variant: User message ──────────────────────────────────

function UserMessage({ message }: { message: UIMessage }) {
  return (
    <div className='flex gap-2 sm:gap-3 animate-message-in justify-end'>
      <div className='max-w-[calc(100%-2.5rem)] sm:max-w-[85%] space-y-3 bg-zinc-800/90 rounded-2xl rounded-br-md px-3 sm:px-4 py-2.5 sm:py-3'>
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text.trim()) {
            return (
              <div
                key={i}
                className='text-sm leading-relaxed whitespace-pre-wrap'
              >
                {part.text}
              </div>
            );
          }
          return null;
        })}
      </div>
      <div
        className='w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 shadow-sm shadow-zinc-900/50'
        aria-hidden='true'
      >
        U
      </div>
    </div>
  );
}

// ── Explicit variant: Assistant message ─────────────────────────────

function AssistantMessage({
  message,
  chatId,
}: {
  message: UIMessage;
  chatId?: string;
}) {
  // Skip empty assistant messages (can appear around tool calls)
  const hasContent = message.parts.some(
    (p) =>
      (p.type === 'text' && p.text.trim()) ||
      p.type.startsWith('tool-') ||
      p.type === 'dynamic-tool',
  );
  if (!hasContent) return null;

  return (
    <div className='flex gap-2 sm:gap-3 animate-message-in'>
      <div
        className='w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 shadow-sm shadow-emerald-900/50'
        aria-hidden='true'
      >
        AI
      </div>
      <div className='max-w-[calc(100%-2.5rem)] sm:max-w-[85%] space-y-3'>
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text.trim()) {
            return (
              <div key={i} className='leading-relaxed'>
                <MarkdownRenderer content={part.text} />
              </div>
            );
          }

          if (isRunCodeToolPart(part)) {
            return <ToolCard key={i} part={part} chatId={chatId} />;
          }

          if (isWriteFileToolPart(part)) {
            return <WriteFileCard key={i} part={part} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ── ChatMessage — selects the correct variant ───────────────────────

export function ChatMessage({ message, chatId }: ChatMessageProps) {
  return message.role === 'user' ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} chatId={chatId} />
  );
}
