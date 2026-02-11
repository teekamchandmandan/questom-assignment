'use client';

import { useChatContext } from '@/lib/chat-context';
import type { Language } from '@/lib/conversations';
import { ChevronDownIcon } from './Icons';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
];

const DOT_COLORS: Record<Language, string> = {
  javascript: 'bg-yellow-400',
  typescript: 'bg-blue-400',
  python: 'bg-emerald-400',
};

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
        <div className='group/lang relative flex-shrink-0'>
          <label htmlFor='lang-select' className='sr-only'>
            Language
          </label>
          <select
            id='lang-select'
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            disabled={isLoading}
            className='appearance-none bg-zinc-900 border border-zinc-700 rounded-lg pl-5 sm:pl-6 pr-7 py-3 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:opacity-40 cursor-pointer transition-colors hover:border-zinc-600'
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Colored language indicator */}
          <span
            className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${DOT_COLORS[language]}`}
          />
          {/* Dropdown chevron */}
          <ChevronDownIcon className='pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500' />

          {/* Custom tooltip */}
          <div
            role='tooltip'
            className='pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 scale-95 group-hover/lang:opacity-100 group-hover/lang:scale-100 group-focus-within/lang:!opacity-0 group-focus-within/lang:!scale-95 transition-all duration-150 ease-out z-50'
          >
            <div className='relative bg-zinc-800 border border-zinc-700/80 rounded-lg px-3 py-2 shadow-xl shadow-black/40 whitespace-nowrap'>
              <p className='text-xs font-medium text-zinc-200'>
                Sandbox runtime
              </p>
              <p className='text-[11px] text-zinc-400 mt-0.5'>
                The agent will write &amp; execute code in this language
              </p>
              {/* Arrow */}
              <div className='absolute top-full left-1/2 -translate-x-1/2 -mt-px'>
                <div className='w-2.5 h-2.5 bg-zinc-800 border-r border-b border-zinc-700/80 rotate-45 -translate-y-1/2' />
              </div>
            </div>
          </div>
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
