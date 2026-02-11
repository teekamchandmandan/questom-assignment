import { type FormEvent } from 'react';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isLoading,
}: ChatInputProps) {
  return (
    <div className='flex-shrink-0 border-t border-zinc-800 px-3 sm:px-4 py-3 sm:py-4'>
      <form
        onSubmit={onSubmit}
        className='max-w-3xl mx-auto flex gap-2 sm:gap-3'
      >
        <label htmlFor='chat-input' className='sr-only'>
          Describe a coding task
        </label>
        <input
          id='chat-input'
          type='text'
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder='Describe a coding task…'
          className='flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-3 sm:px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-zinc-500'
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type='button'
            onClick={onStop}
            className='px-3 sm:px-5 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors'
          >
            Stop
          </button>
        ) : (
          <button
            type='submit'
            disabled={!input.trim()}
            className='px-3 sm:px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors'
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
