import React                       from 'react';
import { motion }                  from 'framer-motion';
import { Link }                    from 'react-router-dom';
import { getFileIcon }             from '../../utils/codeHighlight';
import { FileNode as RepoFileNode } from '../../types';
import {
  FolderIcon,
  FolderOpenIcon,
  DocumentIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Props {
  files     : RepoFileNode[];
  owner     : string;
  repo      : string;
  branch    : string;
  path     ?: string;
  onNavigate: (newPath: string) => void;
  onFileOpen?: (file: RepoFileNode) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build parent path — go one level up */
const getParentPath = (currentPath: string): string => {
  const parts = currentPath.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
};

/** Format date string → relative time */
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours   = Math.floor(diff / 3600000);
    const days    = Math.floor(diff / 86400000);

    if (minutes < 1)  return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours   < 24) return `${hours}h ago`;
    if (days    < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FileExplorer
// ─────────────────────────────────────────────────────────────────────────────
const FileExplorer: React.FC<Props> = ({
  files,
  owner,
  repo,
  branch,
  path = '',
  onNavigate,
  onFileOpen,
}) => {
  const hasParent = path !== '';

  // Sort: dirs first, then files, both alphabetically
  const sorted = [...files].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });

  const handleDirClick = (file: RepoFileNode) => {
    const newPath = path ? `${path}/${file.name}` : file.name;
    onNavigate(newPath);
  };

  const handleFileClick = (file: RepoFileNode) => {
    if (onFileOpen) {
      onFileOpen(file);
    }
  };

  const handleParentClick = () => {
    onNavigate(getParentPath(path));
  };

  return (
    <div className="gradient-border overflow-hidden rounded-xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5
                      bg-bg-tertiary border-b border-[#2a2a3a]">
        {/* Branch + path breadcrumb */}
        <div className="flex items-center gap-1 text-sm font-mono text-text-secondary
                        flex-wrap overflow-hidden">
          <span className="text-indigo-400">{branch}</span>

          {path && (
            <>
              {path.split('/').filter(Boolean).map((segment, idx, arr) => {
                const segPath = arr.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={segPath}>
                    <ChevronRightIcon className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <button
                      onClick   = {() => onNavigate(segPath)}
                      className = "text-indigo-400 hover:underline truncate max-w-[120px]"
                    >
                      {segment}
                    </button>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-text-muted flex-shrink-0">
          <span>{files.length} items</span>
        </div>
      </div>

      {/* ── File list ───────────────────────────────────────────────────── */}
      <div className="divide-y divide-[#2a2a3a]">

        {/* Go up (..) row */}
        {hasParent && (
          <motion.div
            initial   = {{ opacity: 0 }}
            animate   = {{ opacity: 1 }}
            className = "flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition-colors cursor-pointer group"
            onClick   = {handleParentClick}
          >
            <FolderOpenIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-sm text-indigo-400 font-mono hover:underline">
              ..
            </span>
          </motion.div>
        )}

        {/* Empty state */}
        {files.length === 0 && (
          <div className="px-4 py-12 text-center text-text-muted text-sm">
            This directory is empty
          </div>
        )}

        {/* File/Dir rows */}
        {sorted.map((file, i) => (
          <motion.div
            key        = {file.path ?? file.name}
            initial    = {{ opacity: 0 }}
            animate    = {{ opacity: 1 }}
            transition = {{ delay: i * 0.02 }}
            className  = "flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition-colors group cursor-pointer"
            onClick    = {() =>
              file.type === 'dir'
                ? handleDirClick(file)
                : handleFileClick(file)
            }
          >
            {/* Icon */}
            <span className="text-sm flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {file.type === 'dir'
                ? <FolderIcon className="w-4 h-4 text-yellow-400" />
                : <span className="text-base leading-none">
                    {getFileIcon(file.name, 'file')}
                  </span>
              }
            </span>

            {/* Name */}
            <span
              className = {`text-sm font-mono flex-shrink-0 min-w-0 truncate
                             max-w-[200px] md:max-w-[300px]
                             group-hover:underline ${
                file.type === 'dir'
                  ? 'text-indigo-400 font-medium'
                  : 'text-text-primary'
              }`}
            >
              {file.name}
            </span>

            {/* Last commit message */}
            <span className="hidden md:block text-xs text-text-muted
                              flex-1 truncate min-w-0">
              {file.lastCommit?.message ?? ''}
            </span>

            {/* Last commit date */}
            <span className="text-xs text-text-muted flex-shrink-0 whitespace-nowrap ml-auto">
              {file.lastCommit?.date ? formatDate(file.lastCommit.date) : ''}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;