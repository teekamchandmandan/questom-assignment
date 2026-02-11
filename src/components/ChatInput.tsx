'use client';

import { useChatContext } from '@/lib/chat-context';
import type { Language } from '@/lib/conversations';
import { ChevronDownIcon } from './Icons';

const LANGUAGE_OPTIONS: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'typescript', label: 'TypeScript', icon: 'TS' },
  { value: 'python', label: 'Python', icon: 'PY' },
];

export function ChatInput() {
  const { state, actions } = useChatContext();
  const { input, isLoading, language } = state;
  const { setInput, handleSubmit, stop, setLanguage } = actions;

  return (
    <div className='flex-shrink-0 border-t border-zinc-800 px-3 sm:px-4 py-3 sm:py-4'>
      <form
        onSubmit={handleSubmit}
        className='max-w-3xl mx-auto flex gap-2 sm:gap-3'
      >
        {/* Language selector */}
        <div className='relative flex-shrink-0'>
          <label htmlFor='lang-select' className='sr-only'>
            Language
          </label>
          <select
            id='lang-select'
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            disabled={isLoading}
            className='appearance-none bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 sm:px-3 py-3 pr-7 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:opacity-40 cursor-pointer transition-colors hover:border-zinc-600'
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon}
              </option>
            ))}
          </select>
          {/* Dropdown chevron */}
          <ChevronDownIcon className='pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500' />
        </div>

        <label htmlFor='chat-input' className='sr-only'>
          Describe a coding task
        </label>
        <input
          id='chat-input'
          type='text'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='What should we build?'
          className='flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-3 sm:px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-zinc-400'
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type='button'
            onClick={() => stop()}
            className='px-3 sm:px-5 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors'
          >
            Stop
          </button>
        ) : (
          <button
            type='submit'
            disabled={!input.trim()}
            className='px-3 sm:px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5'
          >
            Send
            <kbd className='hidden sm:inline-flex items-center text-[10px] font-sans text-emerald-300/60 ml-0.5'>
              ↵
            </kbd>
          </button>
        )}
      </form>
    </div>
  );
}
