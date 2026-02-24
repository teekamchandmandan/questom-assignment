'use client';

import {
  createContext,
  use,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  loadConversations,
  deleteConversation,
  type Conversation,
  type Language,
} from '@/lib/conversations';
import { useToasts } from '@/components/Toast';
import { useAutoScroll } from '@/lib/hooks/use-auto-scroll';
import { useConversationPersistence } from '@/lib/hooks/use-conversation-persistence';
import { useToolResultTracker } from '@/lib/hooks/use-tool-result-tracker';
import type { ChatContextValue } from '@/lib/chat-types';

// Re-export types so existing consumers don't need to change imports
export type {
  ChatState,
  ChatActions,
  ChatMeta,
  ChatContextValue,
} from '@/lib/chat-types';

function generateId() {
  return crypto.randomUUID();
}

export const ChatContext = createContext<ChatContextValue | null>(null);

/** Consume the chat context – throws if used outside ChatProvider. */
export function useChatContext(): ChatContextValue {
  const ctx = use(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatId, setChatId] = useState(() => '');

  // Generate a stable ID on the client only to avoid hydration mismatch.
  useEffect(() => {
    setChatId((prev) => prev || generateId());
  }, []);

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const languageRef = useRef(language);
  languageRef.current = language;

  const { toasts, addToast, dismissToast } = useToasts();

  // Transport uses a function for `body` so it always reads the
  // latest chatIdRef / languageRef value, even after resets.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: () => ({
          chatId: chatIdRef.current,
          language: languageRef.current,
        }),
      }),
    [],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
  } = useChat({ transport });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Keep a mutable ref to messages for hooks that read latest value
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  useConversationPersistence({
    messages,
    messagesRef,
    status,
    chatIdRef,
    language,
    setConversations,
  });

  const { fileRefreshKey, sandboxId, setFileRefreshKey, setSandboxId } =
    useToolResultTracker({ status, messagesRef });

  const {
    messagesEndRef,
    scrollContainerRef,
    shouldAutoScrollRef,
    handleScroll,
  } = useAutoScroll(messages);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput('');
      shouldAutoScrollRef.current = true;
      await sendMessage({ text });
    },
    [input, isLoading, sendMessage, shouldAutoScrollRef],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput('');
    const newId = generateId();
    setChatId(newId);
    chatIdRef.current = newId;
    shouldAutoScrollRef.current = true;
    setSidebarOpen(false);
    setFileExplorerOpen(false);
    setFileRefreshKey(0);
    setSandboxId(null);
  }, [setMessages, shouldAutoScrollRef, setFileRefreshKey, setSandboxId]);

  const handleSelectConversation = useCallback(
    (convo: Conversation) => {
      setChatId(convo.id);
      chatIdRef.current = convo.id;
      setMessages(convo.messages);
      setLanguage(convo.language);
      setSidebarOpen(false);
      setFileRefreshKey((k) => k + 1);
    },
    [setMessages, setFileRefreshKey],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      setConversations(loadConversations());
      addToast('Conversation deleted', 'info');
      if (id === chatIdRef.current) {
        handleNewChat();
      }
    },
    [handleNewChat, addToast],
  );

  return (
    <ChatContext
      value={{
        state: {
          messages,
          input,
          language,
          isLoading,
          error: error ?? null,
          sidebarOpen,
          fileExplorerOpen,
          conversations,
        },
        actions: {
          sendMessage,
          setInput,
          setLanguage: (lang: Language) => {
            if (lang !== language) {
              setLanguage(lang);
            }
          },
          stop,
          regenerate,
          toggleSidebar: () => setSidebarOpen((o) => !o),
          toggleFileExplorer: () => setFileExplorerOpen((o) => !o),
          closeSidebar: () => setSidebarOpen(false),
          closeFileExplorer: () => setFileExplorerOpen(false),
          newChat: handleNewChat,
          selectConversation: handleSelectConversation,
          deleteConversation: handleDeleteConversation,
          handleSubmit,
        },
        meta: {
          chatId,
          sandboxId,
          messagesEndRef,
          scrollContainerRef,
          handleScroll,
          fileRefreshKey,
          status,
          toasts,
          dismissToast,
        },
      }}
    >
      {children}
    </ChatContext>
  );
}
