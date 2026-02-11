import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const PRELOADED_LANGS = [
  'javascript',
  'typescript',
  'python',
  'json',
  'bash',
  'shell',
  'html',
  'css',
  'markdown',
  'sql',
  'yaml',
  'xml',
  'c',
  'cpp',
  'java',
  'go',
  'rust',
] as const;

const THEME = 'vitesse-dark';

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...PRELOADED_LANGS],
    });
  }
  return highlighterPromise;
}

/**
 * Highlight code and return an HTML string.
 * Falls back to plain text if language isn't supported.
 */
export async function highlightCode(
  code: string,
  lang: string = 'text',
): Promise<string> {
  const highlighter = await getHighlighter();
  const loadedLangs = highlighter.getLoadedLanguages();

  // Normalize common aliases
  const langMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    zsh: 'bash',
    yml: 'yaml',
  };
  const resolved = langMap[lang] ?? lang;

  if (!loadedLangs.includes(resolved)) {
    // Try to load the language dynamically
    try {
      await highlighter.loadLanguage(
        resolved as Parameters<Highlighter['loadLanguage']>[0],
      );
    } catch {
      // If it fails, fall back to plain text
      return highlighter.codeToHtml(code, { lang: 'text', theme: THEME });
    }
  }

  return highlighter.codeToHtml(code, { lang: resolved, theme: THEME });
}
