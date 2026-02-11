'use client';

import { useEffect, useState } from 'react';
import { highlightCode } from '@/lib/highlighter';

interface CodeBlockProps {
  code: string;
  language?: string;
  /** Extra classes on the wrapper */
  className?: string;
}

/**
 * Renders syntax-highlighted code using shiki.
 * Shows a plain-text fallback while the highlighter loads.
 */
export function CodeBlock({
  code,
  language = 'text',
  className = '',
}: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    highlightCode(code, language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (!html) {
    // Fallback while shiki loads
    return (
      <pre
        className={`bg-zinc-950 rounded-md px-4 py-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre ${className}`}
      >
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className={`shiki-wrapper rounded-md overflow-x-auto text-xs [&_pre]:!bg-zinc-950 [&_pre]:px-4 [&_pre]:py-3 [&_code]:!text-xs [&_code]:!font-mono ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
