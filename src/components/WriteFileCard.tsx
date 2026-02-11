import { CopyButton } from './CopyButton';
import { CodeBlock } from './CodeBlock';
import { FileIcon, CheckSmallIcon } from './Icons';
import { languageFromExtension } from '@/lib/file-tree';
import type { WriteFileToolPart } from '@/lib/types';

interface WriteFileCardProps {
  part: WriteFileToolPart;
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

  const language = filePath ? languageFromExtension(filePath) : 'plaintext';

  return (
    <div className='border border-zinc-700/80 rounded-lg overflow-hidden my-2 animate-card-in shadow-lg shadow-black/20'>
      {/* Header */}
      <div className='bg-zinc-800/60 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3'>
        <div className='flex items-center gap-1.5 sm:gap-2 min-w-0'>
          {/* File icon */}
          <FileIcon className='text-blue-400 flex-shrink-0' />
          <span className='text-xs text-zinc-300 font-mono truncate'>
            {filePath || 'writing file…'}
          </span>
        </div>

        {isDone && output?.success && (
          <span className='ml-auto text-[10px] text-emerald-400 font-medium flex items-center gap-1'>
            <CheckSmallIcon strokeWidth={2.5} />
            saved
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
          Writing file…
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
