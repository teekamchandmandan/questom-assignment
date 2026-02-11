const EXAMPLE_PROMPTS = [
  'Calculate the first 20 Fibonacci numbers',
  'Fetch and parse a JSON API',
  'Generate a UUID v4 without any libraries',
  'Write a function that finds all prime numbers up to 1000',
];

export function EmptyState({
  onPromptClick,
}: {
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className='text-center text-zinc-600 mt-16 sm:mt-32 space-y-4 sm:space-y-6 animate-fade-in-up px-2'>
      <p className='text-3xl'>&#x1F4E6;</p>
      <p className='text-xl font-semibold text-zinc-300 tracking-tight'>
        Code Executor Sandbox
      </p>
      <p className='text-sm text-zinc-500'>Pick a prompt or type your own</p>
      <div className='flex flex-wrap justify-center gap-2 max-w-xl mx-auto px-2'>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className='px-4 py-2 text-sm rounded-full border border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200 cursor-pointer'
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
