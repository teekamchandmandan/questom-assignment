interface LifecycleStepProps {
  label: string;
  done: boolean;
  active: boolean;
}

function LifecycleStep({ label, done, active }: LifecycleStepProps) {
  return (
    <span
      className={`transition-all duration-500 ease-out ${
        done
          ? 'text-emerald-400 scale-100'
          : active
            ? 'text-yellow-400 animate-pulse scale-105'
            : 'text-zinc-500 scale-100'
      }`}
    >
      <span className='inline-block transition-transform duration-300'>
        {done ? '●' : active ? '◐' : '○'}
      </span>{' '}
      {label}
    </span>
  );
}

function ChevronRight() {
  return (
    <span className='text-zinc-500 transition-colors duration-500'>→</span>
  );
}

interface LifecycleIndicatorProps {
  state: string;
}

export function LifecycleIndicator({ state }: LifecycleIndicatorProps) {
  const isWaiting = state === 'input-streaming';
  const isExecuting =
    state === 'input-available' || state === 'approval-requested';
  const isDone = state === 'output-available';
  const isError = state === 'output-error';

  return (
    <div className='flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs'>
      <LifecycleStep label='Preparing' done={!isWaiting} active={isWaiting} />
      <ChevronRight />
      <LifecycleStep
        label='Executing'
        done={isDone || isError}
        active={isExecuting}
      />
      <ChevronRight />
      <LifecycleStep
        label={isError ? 'Failed' : 'Done'}
        done={isDone || isError}
        active={false}
      />
    </div>
  );
}
