'use client';

import { useChatContext } from '@/lib/chat-context';
import { SidebarIcon, FolderPlusIcon, PencilIcon } from './Icons';

export function ChatHeader() {
  const { state, actions } = useChatContext();
  const { messages, isLoading, fileExplorerOpen } = state;
  const { toggleSidebar, toggleFileExplorer, newChat } = actions;

  return (
    <header className='flex-shrink-0 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-emerald-950/30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-2 min-w-0'>
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className='p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex-shrink-0'
          title='Toggle history'
          aria-label='Toggle conversation history'
        >
          <SidebarIcon />
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
            onClick={toggleFileExplorer}
            className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
              fileExplorerOpen
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title='Toggle file explorer'
            aria-label='Toggle file explorer'
          >
            <FolderPlusIcon />
          </button>
        )}
        {messages.length > 0 && (
          <button
            onClick={newChat}
            disabled={isLoading}
            className='flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex-shrink-0'
          >
            <PencilIcon />
            New Chat
          </button>
        )}
      </div>
    </header>
  );
}
