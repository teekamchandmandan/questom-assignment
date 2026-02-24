'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { UIMessage } from 'ai';

/**
 * Encapsulates auto-scroll logic: tracks whether the user is near the
 * bottom of the scroll container and scrolls to the latest message when
 * new content arrives.
 */
export function useAutoScroll(messages: UIMessage[]) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (isProgrammaticScrollRef.current) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 150;
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      isProgrammaticScrollRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    }
  }, [messages]);

  return {
    messagesEndRef,
    scrollContainerRef,
    shouldAutoScrollRef,
    handleScroll,
  };
}
