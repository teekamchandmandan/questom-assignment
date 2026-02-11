const EXAMPLE_PROMPTS = [
  'Calculate the first 20 Fibonacci numbers',
  'Fetch and display data from a public API',
  'Build a tiny HTTP server that returns JSON',
  'Find all prime numbers up to 1,000',
];

export function EmptyState({
  onPromptClick,
}: {
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className='text-center text-zinc-500 mt-16 sm:mt-32 space-y-4 sm:space-y-6 animate-fade-in-up px-2'>
      <p className='text-3xl'>&#x1F680;</p>
      <p className='text-xl font-semibold text-zinc-300 tracking-tight'>
        What would you like to build?
      </p>
      <p className='text-sm text-zinc-400'>
        Pick a starting point or describe your own task
      </p>
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
