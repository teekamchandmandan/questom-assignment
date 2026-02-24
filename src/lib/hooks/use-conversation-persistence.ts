'use client';

import { useRef, useEffect, type RefObject } from 'react';
import type { UIMessage } from 'ai';
import {
  loadConversations,
  saveConversation,
  deriveTitle,
  type Conversation,
  type Language,
} from '@/lib/conversations';

/**
 * Persists the active conversation to localStorage when streaming
 * finishes (status settles to 'ready'). Batches writes to avoid
 * dozens of localStorage updates during streaming.
 */
export function useConversationPersistence({
  messages,
  messagesRef,
  status,
  chatIdRef,
  language,
  setConversations,
}: {
  messages: UIMessage[];
  messagesRef: RefObject<UIMessage[]>;
  status: string;
  chatIdRef: RefObject<string>;
  language: Language;
  setConversations: (convos: Conversation[]) => void;
}) {
  const pendingPersistRef = useRef(false);

  useEffect(() => {
    if (messages.length === 0) return;
    pendingPersistRef.current = true;
  }, [messages]);

  // Actually write to localStorage only when status settles to 'ready'
  // (avoids dozens of writes per second during streaming)
  useEffect(() => {
    if (status !== 'ready' || !pendingPersistRef.current) return;
    pendingPersistRef.current = false;
    const msgs = messagesRef.current;
    if (msgs.length === 0) return;
    // Read fresh conversation data to avoid stale closure over `conversations` state
    const freshConversations = loadConversations();
    const convo: Conversation = {
      id: chatIdRef.current,
      title: deriveTitle(msgs),
      language,
      messages: msgs,
      createdAt:
        freshConversations.find((c) => c.id === chatIdRef.current)?.createdAt ??
        Date.now(),
      updatedAt: Date.now(),
    };
    saveConversation(convo);
    setConversations(loadConversations());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
}
