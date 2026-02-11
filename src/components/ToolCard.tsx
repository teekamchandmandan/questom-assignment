import { LifecycleIndicator } from './LifecycleIndicator';
import { CopyButton } from './CopyButton';
import { CodeBlock } from './CodeBlock';
import type { RunCodeToolPart } from '@/lib/types';

interface ToolCardProps {
  part: RunCodeToolPart;
}

export function ToolCard({ part }: ToolCardProps) {
  const { state, input, output, errorText } = part;
  const language = input?.language ?? 'javascript';
  const code = input?.code ?? '';

  const isExecuting =
    state === 'input-available' || state === 'approval-requested';
  const isDone = state === 'output-available';
  const isError = state === 'output-error';

  return (
    <div className='border border-zinc-700/80 rounded-lg overflow-hidden my-2 animate-card-in shadow-lg shadow-black/20'>
      {/* Sandbox lifecycle header */}
      <div className='bg-zinc-800/60 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3'>
        <LifecycleIndicator state={state} />
        <span className='ml-auto text-xs text-zinc-500 font-mono'>
          {language}
        </span>
      </div>

      {/* Code block */}
      {code && (
        <div className='relative border-t border-zinc-800 group/code'>
          <CopyButton
            text={code}
            className='absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10'
          />
          <CodeBlock code={code} language={language} />
        </div>
      )}

      {/* Executing indicator */}
      {isExecuting && (
        <div className='px-3 sm:px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center gap-2'>
          <span
            className='inline-block w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'
            role='status'
          />
          Executing in sandbox…
        </div>
      )}

      {/* Output */}
      {isDone && output && (
        <div className='border-t border-zinc-800'>
          {output.stdout && (
            <div className='relative px-3 sm:px-4 py-3 group/stdout'>
              <CopyButton
                text={output.stdout}
                className='absolute top-2 right-2 opacity-0 group-hover/stdout:opacity-100 transition-opacity'
              />
              <div className='text-[10px] uppercase tracking-wider text-zinc-500 mb-1'>
                stdout
              </div>
              <pre className='text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap'>
                {output.stdout}
              </pre>
            </div>
          )}
          {output.stderr && (
            <div className='px-3 sm:px-4 py-3 border-t border-zinc-800'>
              <div className='text-[10px] uppercase tracking-wider text-red-400 mb-1'>
                stderr
              </div>
              <pre className='text-xs font-mono text-red-300 overflow-x-auto whitespace-pre-wrap'>
                {output.stderr}
              </pre>
            </div>
          )}
          <div className='px-3 sm:px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-500'>
            exit code: {output.exitCode}
          </div>
        </div>
      )}

      {/* Error */}
      {isError && errorText && (
        <div className='px-3 sm:px-4 py-3 border-t border-zinc-800 text-xs text-red-400'>
          {errorText}
        </div>
      )}
    </div>
  );
}
