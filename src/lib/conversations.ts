import type { UIMessage } from 'ai';

const STORAGE_KEY = 'sandbox-agent-conversations:v1';

// ── In-memory cache to avoid repeated localStorage reads/parses ────
let cachedConversations: Conversation[] | null = null;

export type Language = 'javascript' | 'python' | 'typescript';

export interface Conversation {
  id: string;
  title: string;
  language: Language;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

/** Read all conversations from localStorage, sorted newest-first. */
export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  if (cachedConversations) return cachedConversations;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const convos: Conversation[] = JSON.parse(raw);
    cachedConversations = convos.sort((a, b) => b.updatedAt - a.updatedAt);
    return cachedConversations;
  } catch {
    return [];
  }
}

/** Persist the full conversation list to localStorage. */
function persist(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    cachedConversations = null; // invalidate cache so next read picks up changes
  } catch {
    // localStorage full — silently ignore
  }
}

/** Save (upsert) a single conversation. */
export function saveConversation(convo: Conversation) {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === convo.id);
  if (idx >= 0) {
    all[idx] = { ...convo, updatedAt: Date.now() };
  } else {
    all.unshift({ ...convo, updatedAt: Date.now() });
  }
  persist(all);
}

/** Delete a conversation by id. */
export function deleteConversation(id: string) {
  const all = loadConversations().filter((c) => c.id !== id);
  persist(all);
}

/** Derive a short title from the first user message. */
export function deriveTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New Chat';
  const text = first.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join(' ')
    .trim();
  if (!text) return 'New Chat';
  return text.length > 50 ? text.slice(0, 50) + '…' : text;
}
