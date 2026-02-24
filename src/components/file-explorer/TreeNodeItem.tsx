'use client';

import { useState } from 'react';
import { formatSize, getFileIcon, type TreeNode } from '@/lib/file-tree';
import { ChevronRightIcon } from '../Icons';

export function TreeNodeItem({
  node,
  depth,
  selectedPath,
  onFileClick,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onFileClick: (node: TreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isDir = node.type === 'directory';
  const isSelected = !isDir && node.path === selectedPath;

  return (
    <div>
      <button
        onClick={isDir ? () => setExpanded((e) => !e) : () => onFileClick(node)}
        className={`w-full flex items-center gap-1.5 py-1 px-2 text-left rounded-md transition-colors text-xs cursor-pointer ${
          isSelected
            ? 'bg-emerald-500/10 text-emerald-400'
            : isDir
              ? 'text-zinc-300 hover:bg-zinc-800/60'
              : 'text-zinc-400 hover:bg-zinc-800/40'
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
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
