// ── File Tree Utilities ──────────────────────────────────────────────
// Pure data-transform helpers used by the FileExplorer component.
// Extracted here to keep the component focused on rendering and to
// make this logic independently testable.

export interface FileEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children: TreeNode[];
}

/**
 * Converts a flat list of FileEntry objects into a nested tree structure
 * rooted at /vercel/sandbox, sorted directories-first then alphabetically.
 */
export function buildTree(entries: FileEntry[]): TreeNode[] {
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

/** Format a byte count into a human-readable string (B / KB / MB). */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Return an emoji icon for a filename based on its extension. */
export function getFileIcon(name: string): string {
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
