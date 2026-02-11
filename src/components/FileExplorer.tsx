'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatContext } from '@/lib/chat-context';
import {
  ChevronRightIcon,
  FolderIcon,
  RefreshIcon,
  CloseSmallIcon,
  SpinnerIcon,
  FolderEmptyIcon,
} from './Icons';

interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children: TreeNode[];
}

// ── FileExplorer Component ──────────────────────────────────────────

function buildTree(entries: FileEntry[]): TreeNode[] {
  const root: TreeNode = {
    name: 'sandbox',
    path: '/vercel/sandbox',
    type: 'directory',
    children: [],
  };

  for (const entry of entries) {
    // Strip the /vercel/sandbox/ prefix to get relative segments
    const relative = entry.path.replace(/^\/vercel\/sandbox\/?/, '');
    if (!relative) continue;

    const parts = relative.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i];
      const isLast = i === parts.length - 1;
      let child = current.children.find((c) => c.name === segment);

      if (!child) {
        child = {
          name: segment,
          path: entry.path
            .split('/')
            .slice(0, 3 + i + 1)
            .join('/'),
          type: isLast ? entry.type : 'directory',
          size: isLast ? entry.size : undefined,
          children: [],
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort: directories first, then alphabetically
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) sortNodes(node.children);
    }
  }

  sortNodes(root.children);
  return root.children;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return '🟨';
    case 'ts':
    case 'tsx':
      return '🔷';
    case 'py':
      return '🐍';
    case 'json':
      return '📋';
    case 'html':
    case 'htm':
      return '🌐';
    case 'css':
      return '🎨';
    case 'md':
    case 'txt':
      return '📄';
    case 'csv':
      return '📊';
    case 'yml':
    case 'yaml':
      return '⚙️';
    case 'sh':
    case 'bash':
      return '🐚';
    default:
      return '📄';
  }
}

// ── Tree Node Component ─────────────────────────────────────────────

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const isDir = node.type === 'directory';

  return (
    <div>
      <button
        onClick={isDir ? () => setExpanded((e) => !e) : undefined}
        className={`w-full flex items-center gap-1.5 py-1 px-2 text-left rounded-md transition-colors text-xs ${
          isDir
            ? 'text-zinc-300 hover:bg-zinc-800/60 cursor-pointer'
            : 'text-zinc-400 hover:bg-zinc-800/40 cursor-default'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDir ? (
          <span
            className={`flex-shrink-0 transition-transform duration-150 text-zinc-400 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            <ChevronRightIcon />
          </span>
        ) : (
          <span className='w-3 flex-shrink-0' />
        )}

        <span className='flex-shrink-0 text-[11px]'>
          {isDir ? (expanded ? '📂' : '📁') : getFileIcon(node.name)}
        </span>

        <span className='truncate flex-1'>{node.name}</span>

        {!isDir && node.size != null && (
          <span className='text-[10px] text-zinc-500 flex-shrink-0 ml-1'>
            {formatSize(node.size)}
          </span>
        )}
      </button>

      {isDir && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── FileExplorer Component ──────────────────────────────────────────

export function FileExplorer() {
  const { state, actions, meta } = useChatContext();
  const { fileExplorerOpen: isOpen } = state;
  const { closeFileExplorer: onClose } = actions;
  const { chatId, fileRefreshKey: refreshKey } = meta;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sandbox/files?chatId=${encodeURIComponent(chatId)}`,
      );
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Fetch whenever panel opens or refreshKey changes
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, refreshKey, fetchFiles]);

  const tree = buildTree(files);
  const fileCount = files.filter((f) => f.type === 'file').length;

  return (
    <>
      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className='fixed inset-0 bg-black/50 z-30 sm:hidden'
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed sm:relative z-40 sm:z-auto top-0 right-0 h-full w-64 bg-zinc-950 border-l border-zinc-800/60 flex flex-col transition-all duration-200 ${
          isOpen
            ? 'translate-x-0 sm:w-64 sm:opacity-100'
            : 'translate-x-full sm:w-0 sm:opacity-0 sm:overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-3 py-3 border-b border-zinc-800/60 flex-shrink-0'>
          <div className='flex items-center gap-2'>
            <FolderIcon className='text-emerald-500' />
            <span className='text-sm font-semibold text-zinc-300'>
              Sandbox Files
            </span>
            {fileCount > 0 && (
              <span className='text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full'>
                {fileCount}
              </span>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <button
              onClick={fetchFiles}
              className='p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors'
              title='Refresh'
              disabled={loading}
            >
              <RefreshIcon className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className='p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors'
              title='Close'
            >
              <CloseSmallIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto py-2'>
          {loading && files.length === 0 && (
            <div className='flex items-center justify-center py-8'>
              <div className='flex items-center gap-2 text-xs text-zinc-400'>
                <SpinnerIcon className='animate-spin' />
                Loading files…
              </div>
            </div>
          )}

          {error && (
            <div className='px-3 py-2 text-xs text-red-400'>{error}</div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className='flex flex-col items-center justify-center py-8 px-4 text-center'>
              <FolderEmptyIcon
                className='text-zinc-700 mb-2'
                strokeWidth={1.5}
              />
              <p className='text-xs text-zinc-500'>No files yet</p>
              <p className='text-[10px] text-zinc-600 mt-1'>
                Files will appear here as the agent creates them
              </p>
            </div>
          )}

          {tree.length > 0 && (
            <div className='animate-fade-in-up'>
              {tree.map((node) => (
                <TreeNodeItem key={node.path} node={node} depth={0} />
              ))}
            </div>
          )}
        </div>

        {/* Footer — sandbox root info */}
        {files.length > 0 && (
          <div className='flex-shrink-0 border-t border-zinc-800/60 px-3 py-2'>
            <p className='text-[10px] text-zinc-500 font-mono truncate'>
              /vercel/sandbox/
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
