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
  type RefObject,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import {
  loadConversations,
  saveConversation,
  deleteConversation,
  deriveTitle,
  type Conversation,
  type Language,
} from '@/lib/conversations';
import { useToasts, type ToastData } from '@/components/Toast';

function generateId() {
  return crypto.randomUUID();
}

// ── State Interface ─────────────────────────────────────────────────

export interface ChatState {
  messages: UIMessage[];
  input: string;
  language: Language;
  isLoading: boolean;
  error: Error | null;
  sidebarOpen: boolean;
  fileExplorerOpen: boolean;
  conversations: Conversation[];
}

// ── Actions Interface ───────────────────────────────────────────────

export interface ChatActions {
  sendMessage: (opts: { text: string }) => Promise<void>;
  setInput: (value: string) => void;
  setLanguage: (lang: Language) => void;
  stop: () => void;
  regenerate: () => void;
  toggleSidebar: () => void;
  toggleFileExplorer: () => void;
  closeSidebar: () => void;
  closeFileExplorer: () => void;
  newChat: () => void;
  selectConversation: (convo: Conversation) => void;
  deleteConversation: (id: string) => void;
  handleSubmit: (e: FormEvent) => void;
}

// ── Meta Interface ──────────────────────────────────────────────────

export interface ChatMeta {
  chatId: string;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  fileRefreshKey: number;
  status: string;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
}

// ── Context ─────────────────────────────────────────────────────────

export interface ChatContextValue {
  state: ChatState;
  actions: ChatActions;
  meta: ChatMeta;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

/** Consume the chat context – throws if used outside ChatProvider. */
export function useChatContext(): ChatContextValue {
  const ctx = use(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatId, setChatId] = useState(() => '');

  // Generate a stable ID on the client only to avoid hydration mismatch
  useEffect(() => {
    setChatId((prev) => prev || generateId());
  }, []);

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const languageRef = useRef(language);
  const { toasts, addToast, dismissToast } = useToasts();

  // Keep the ref in sync so the transport closure sees the latest value
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

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
  } = useChat({
    transport,
    onError: (err) => {
      addToast(
        err.message || 'Something went wrong. Please try again.',
        'error',
      );
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // ── Load conversations from localStorage on mount ──────────────
  useEffect(() => {
    setConversations(loadConversations());
  }, []);

  // ── Persist conversation whenever messages change ──────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const convo: Conversation = {
      id: chatIdRef.current,
      title: deriveTitle(messages),
      language,
      messages,
      createdAt:
        conversations.find((c) => c.id === chatIdRef.current)?.createdAt ??
        Date.now(),
      updatedAt: Date.now(),
    };
    saveConversation(convo);
    setConversations(loadConversations());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Refresh file explorer after tool calls complete ────────────
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
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
      }
    }
    prevStatusRef.current = status;
  }, [status]);

  // ── Smart auto-scroll ─────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 150;
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Actions ───────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput('');
      shouldAutoScrollRef.current = true;
      await sendMessage({ text });
    },
    [input, isLoading, sendMessage],
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
  }, [setMessages]);

  const handleSelectConversation = useCallback(
    (convo: Conversation) => {
      setChatId(convo.id);
      chatIdRef.current = convo.id;
      setMessages(convo.messages);
      setLanguage(convo.language);
      setSidebarOpen(false);
      setFileRefreshKey((k) => k + 1);
    },
    [setMessages],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      setConversations(loadConversations());
      if (id === chatIdRef.current) {
        handleNewChat();
      }
    },
    [handleNewChat],
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
          setLanguage,
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
