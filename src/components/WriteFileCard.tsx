import { CopyButton } from './CopyButton';
import { CodeBlock } from './CodeBlock';
import type { WriteFileToolPart } from '@/lib/types';

interface WriteFileCardProps {
  part: WriteFileToolPart;
}

/** Infer a display language from the file extension for syntax highlighting */
function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'tsx',
    jsx: 'jsx',
    py: 'python',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    csv: 'plaintext',
    txt: 'plaintext',
    toml: 'toml',
  };
  return map[ext ?? ''] ?? 'plaintext';
}

export function WriteFileCard({ part }: WriteFileCardProps) {
  const { state, input, output, errorText } = part;
  const filePath = input?.filePath ?? '';
  const content = input?.content ?? '';
  const description = input?.description;

  const isWriting =
    state === 'input-available' || state === 'approval-requested';
  const isDone = state === 'output-available';
  const isError = state === 'output-error';

  const language = filePath ? languageFromPath(filePath) : 'plaintext';

  return (
    <div className='border border-zinc-700/80 rounded-lg overflow-hidden my-2 animate-card-in shadow-lg shadow-black/20'>
      {/* Header */}
      <div className='bg-zinc-800/60 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3'>
        <div className='flex items-center gap-1.5 sm:gap-2 min-w-0'>
          {/* File icon */}
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-blue-400 flex-shrink-0'
          >
            <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' />
            <path d='M14 2v4a2 2 0 0 0 2 2h4' />
          </svg>
          <span className='text-xs text-zinc-300 font-mono truncate'>
            {filePath || 'writing file…'}
          </span>
        </div>

        {isDone && output?.success && (
          <span className='ml-auto text-[10px] text-emerald-400 font-medium flex items-center gap-1'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='20 6 9 17 4 12' />
            </svg>
            written
          </span>
        )}

        {isDone && output && !output.success && (
          <span className='ml-auto text-[10px] text-red-400 font-medium'>
            failed
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className='px-3 sm:px-4 py-2 border-t border-zinc-800 text-xs text-zinc-400'>
          {description}
        </div>
      )}

      {/* File content preview */}
      {content && (
        <div className='relative border-t border-zinc-800 group/code'>
          <CopyButton
            text={content}
            className='absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10'
          />
          <CodeBlock code={content} language={language} />
        </div>
      )}

      {/* Writing indicator */}
      {isWriting && (
        <div className='px-3 sm:px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center gap-2'>
          <span
            className='inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
            role='status'
          />
          Writing to sandbox…
        </div>
      )}

      {/* Error */}
      {isError && errorText && (
        <div className='px-3 sm:px-4 py-3 border-t border-zinc-800 text-xs text-red-400'>
          {errorText}
        </div>
      )}

      {isDone && output?.error && (
        <div className='px-3 sm:px-4 py-3 border-t border-zinc-800 text-xs text-red-400'>
          {output.error}
        </div>
      )}
    </div>
  );
}
