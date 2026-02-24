import type { RefObject } from 'react';
import type { UIMessage } from 'ai';
import type { Conversation, Language } from '@/lib/conversations';
import type { ToastData } from '@/components/Toast';

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
  handleSubmit: (e: React.FormEvent) => void;
}

// ── Meta Interface ──────────────────────────────────────────────────

export interface ChatMeta {
  chatId: string;
  sandboxId: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  fileRefreshKey: number;
  status: string;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
}

// ── Context Value ───────────────────────────────────────────────────

export interface ChatContextValue {
  state: ChatState;
  actions: ChatActions;
  meta: ChatMeta;
}
