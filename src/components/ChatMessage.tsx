import type { UIMessage } from 'ai';
import { ToolCard } from './ToolCard';
import { MarkdownRenderer } from './MarkdownRenderer';
import { isRunCodeToolPart } from '@/lib/types';

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Skip empty assistant messages (can appear around tool calls)
  const hasContent = message.parts.some(
    (p) =>
      (p.type === 'text' && p.text.trim()) ||
      p.type.startsWith('tool-') ||
      p.type === 'dynamic-tool',
  );
  if (!isUser && !hasContent) return null;

  return (
    <div
      className={`flex gap-2 sm:gap-3 animate-message-in ${isUser ? 'justify-end' : ''}`}
    >
      {!isUser && (
        <div
          className='w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 shadow-sm shadow-emerald-900/50'
          aria-hidden='true'
        >
          AI
        </div>
      )}

      <div
        className={`max-w-[calc(100%-2.5rem)] sm:max-w-[85%] space-y-3 ${
          isUser
            ? 'bg-zinc-800/90 rounded-2xl rounded-br-md px-3 sm:px-4 py-2.5 sm:py-3'
            : ''
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text.trim()) {
            return isUser ? (
              <div
                key={i}
                className='text-sm leading-relaxed whitespace-pre-wrap'
              >
                {part.text}
              </div>
            ) : (
              <div key={i} className='leading-relaxed'>
                <MarkdownRenderer content={part.text} />
              </div>
            );
          }

          if (isRunCodeToolPart(part)) {
            return <ToolCard key={i} part={part} />;
          }

          return null;
        })}
      </div>

      {isUser && (
        <div
          className='w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 shadow-sm shadow-zinc-900/50'
          aria-hidden='true'
        >
          U
        </div>
      )}
    </div>
  );
}
