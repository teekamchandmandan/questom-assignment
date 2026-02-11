'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { CopyButton } from './CopyButton';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className='text-lg font-bold mt-4 mb-2 text-zinc-100'>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className='text-base font-bold mt-3 mb-1.5 text-zinc-100'>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className='text-sm font-semibold mt-2.5 mb-1 text-zinc-200'>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className='text-sm leading-relaxed mb-2 last:mb-0'>{children}</p>
  ),
  ul: ({ children }) => (
    <ul className='list-disc list-inside text-sm space-y-1 mb-2 ml-1'>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='list-decimal list-inside text-sm space-y-1 mb-2 ml-1'>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className='text-sm leading-relaxed'>{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-emerald-400 hover:text-emerald-300 underline underline-offset-2'
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className='font-semibold text-zinc-100'>{children}</strong>
  ),
  em: ({ children }) => <em className='italic text-zinc-300'>{children}</em>,
  code: ({ className, children }) => {
    const match = className?.match(/language-(\w+)/);
    if (match) {
      const codeString = String(children).replace(/\n$/, '');
      return (
        <div className='relative group/code'>
          <CopyButton
            text={codeString}
            className='absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10'
          />
          <CodeBlock code={codeString} language={match[1]} />
        </div>
      );
    }
    return (
      <code className='bg-zinc-800 text-emerald-300 text-xs font-mono px-1.5 py-0.5 rounded'>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <div className='mb-2 last:mb-0'>{children}</div>,
  blockquote: ({ children }) => (
    <blockquote className='border-l-2 border-zinc-600 pl-3 text-zinc-400 italic mb-2'>
      {children}
    </blockquote>
  ),
  hr: () => <hr className='border-zinc-700 my-3' />,
  table: ({ children }) => (
    <div className='overflow-x-auto mb-2'>
      <table className='text-sm border-collapse w-full'>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className='border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-left text-xs font-semibold text-zinc-200'>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className='border border-zinc-700 px-3 py-1.5 text-xs'>{children}</td>
  ),
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
