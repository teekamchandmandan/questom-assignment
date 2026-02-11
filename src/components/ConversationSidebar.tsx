'use client';

import { type Conversation, type Language } from '@/lib/conversations';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string;
  isOpen: boolean;
  onSelect: (convo: Conversation) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

const LANG_LABELS: Record<Language, string> = {
  javascript: 'JS',
  python: 'PY',
  typescript: 'TS',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ConversationSidebar({
  conversations,
  activeId,
  isOpen,
  onSelect,
  onDelete,
  onNewChat,
  onClose,
}: ConversationSidebarProps) {
  return (
    <>
      {/* Backdrop — dismisses sidebar on click */}
      {isOpen && (
        <div className='fixed inset-0 bg-black/50 z-30' onClick={onClose} />
      )}

      <aside
        className={`fixed z-40 top-0 left-0 h-full w-64 bg-zinc-950 border-r border-zinc-800/60 flex flex-col transition-[translate] duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className='flex items-center justify-between px-3 py-3 border-b border-zinc-800/60'>
          <span className='text-sm font-semibold text-zinc-300'>History</span>
          <div className='flex items-center gap-1'>
            <button
              onClick={onNewChat}
              className='p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors'
              title='New Chat'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M12 5v14' />
                <path d='M5 12h14' />
              </svg>
            </button>
            <button
              onClick={onClose}
              className='p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors'
              title='Close'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M18 6 6 18' />
                <path d='m6 6 12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className='flex-1 overflow-y-auto py-1'>
          {conversations.length === 0 && (
            <p className='text-xs text-zinc-500 text-center mt-8'>
              No conversations yet
            </p>
          )}
          {conversations.map((convo) => (
            <div
              key={convo.id}
              className={`group flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition-colors ${
                convo.id === activeId
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
              onClick={() => onSelect(convo)}
            >
              <div className='flex-1 min-w-0'>
                <p className='text-sm truncate'>{convo.title}</p>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span className='text-[10px] text-zinc-500'>
                    {timeAgo(convo.updatedAt)}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                      convo.id === activeId
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {LANG_LABELS[convo.language] ?? 'JS'}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(convo.id);
                }}
                className='opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all'
                title='Delete'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='13'
                  height='13'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M3 6h18' />
                  <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
                  <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
