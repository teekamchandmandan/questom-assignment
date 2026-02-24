'use client';

import { languageFromExtension } from '@/lib/file-tree';
import { CodeBlock } from '../CodeBlock';
import { CopyButton } from '../CopyButton';
import { SpinnerIcon } from '../Icons';

interface FilePreviewProps {
  previewFile: { path: string; name: string };
  previewContent: string | null;
  previewLoading: boolean;
  previewError: string | null;
}

export function FilePreview({
  previewFile,
  previewContent,
  previewLoading,
  previewError,
}: FilePreviewProps) {
  return (
    <div className='flex flex-col h-full'>
      {previewLoading && (
        <div className='flex items-center justify-center py-8'>
          <div className='flex items-center gap-2 text-xs text-zinc-400'>
            <span className='animate-spin'>
              <SpinnerIcon />
            </span>
            Reading file…
          </div>
        </div>
      )}

      {previewError && (
        <div className='px-3 py-4 text-xs text-red-400'>{previewError}</div>
      )}

      {previewContent !== null && (
        <div className='flex-1 flex flex-col min-h-0'>
          {/* Preview toolbar */}
          <div className='flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/40'>
            <span className='text-[10px] text-zinc-500 font-mono truncate'>
              {previewFile.path.replace(/^\/vercel\/sandbox\//, '')}
            </span>
            <CopyButton text={previewContent} />
          </div>
          {/* Code content */}
          <div className='flex-1 overflow-auto'>
            <CodeBlock
              code={previewContent}
              language={languageFromExtension(previewFile.name)}
              className='!rounded-none border-none [&_pre]:!py-3 [&_pre]:!px-3 text-[11px]'
            />
          </div>
        </div>
      )}
    </div>
  );
}
