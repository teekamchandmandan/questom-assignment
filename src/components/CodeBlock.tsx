'use client';

import { useEffect, useState } from 'react';
import { highlightCode } from '@/lib/highlighter';

interface CodeBlockProps {
  code: string;
  language?: string;
  /** Extra classes on the wrapper */
  className?: string;
  /** When true, skip syntax highlighting (e.g. during streaming) */
  streaming?: boolean;
}

/**
 * Renders syntax-highlighted code using shiki.
 * Shows a plain-text fallback while the highlighter loads.
 */
export function CodeBlock({
  code,
  language = 'text',
  className = '',
  streaming = false,
}: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    // Skip heavy Shiki tokenisation while content is still streaming
    if (streaming) return;
    let cancelled = false;
    highlightCode(code, language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, streaming]);

  // Use plain fallback when streaming (html will be stale/null)
  const showFallback = streaming || !html;

  if (showFallback) {
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
