'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import type { UIMessage } from 'ai';
import { isRunCodeToolPart, isWriteFileToolPart } from '@/lib/types';

/**
 * Watches for tool-call completion (status transitions to 'ready')
 * and extracts the latest sandboxId from tool results. Also bumps
 * a refresh key so the FileExplorer can re-fetch files.
 */
export function useToolResultTracker({
  status,
  messagesRef,
}: {
  status: string;
  messagesRef: RefObject<UIMessage[]>;
}) {
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const msgs = messagesRef.current;
    if (
      prevStatusRef.current !== 'ready' &&
      status === 'ready' &&
      msgs.length > 0
    ) {
      const lastMsg = msgs[msgs.length - 1];
      const hasToolParts = lastMsg?.parts?.some((p: { type: string }) =>
        p.type.startsWith('tool-'),
      );
      if (hasToolParts) {
        setFileRefreshKey((k) => k + 1);
        for (let i = lastMsg.parts.length - 1; i >= 0; i--) {
          const p = lastMsg.parts[i];
          if (
            isRunCodeToolPart(p) &&
            p.state === 'output-available' &&
            p.output?.sandboxId
          ) {
            setSandboxId(p.output.sandboxId);
            break;
          }
          if (
            isWriteFileToolPart(p) &&
            p.state === 'output-available' &&
            p.output?.sandboxId
          ) {
            setSandboxId(p.output.sandboxId);
            break;
          }
        }
      }
    }
    prevStatusRef.current = status;
  }, [status, messagesRef]);

  return { fileRefreshKey, sandboxId, setFileRefreshKey, setSandboxId };
}
