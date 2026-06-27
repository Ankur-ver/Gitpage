import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { repositoryService } from '../../services/repoService';

interface Props {
  code: string;
  language: string;
  filename: string;
  owner?: string;
  repo?: string;
  branch?: string;
  filePath?: string;
  fileSha?: string;
  onCommitted?: () => void;
}

const CodeViewer: React.FC<Props> = ({
  code,
  language,
  filename,
  owner,
  repo,
  branch,
  filePath,
  fileSha,
  onCommitted,
}) => {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [commitMessage, setCommitMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = Boolean(owner && repo && branch && filePath);
  const hasChanges = draft !== code;

  const defaultCommitMessage = useMemo(
    () => `Update ${filePath || filename}`,
    [filePath, filename]
  );

  useEffect(() => {
    setDraft(code);
    setCommitMessage('');
    setEditing(false);
  }, [code, filename, fileSha]);

  const copy = async () => {
    await navigator.clipboard.writeText(editing ? draft : code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([editing ? draft : code], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEditing = () => {
    if (!localStorage.getItem('token')) {
      toast.error('Sign in to edit files');
      return;
    }
    setDraft(code);
    setCommitMessage(defaultCommitMessage);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(code);
    setCommitMessage('');
    setEditing(false);
  };

  const commitChanges = async () => {
    if (!canEdit || !owner || !repo || !branch || !filePath) return;
    if (!hasChanges) {
      toast.error('No changes to commit');
      return;
    }

    const message = commitMessage.trim() || defaultCommitMessage;
    setSaving(true);
    try {
      const result = await repositoryService.updateFileContent(
        owner,
        repo,
        branch,
        filePath,
        draft,
        message,
        fileSha
      );
      toast.success(`Committed ${result.commit.shortSha}`);
      setEditing(false);
      onCommitted?.();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to commit changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gradient-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary border-b border-[#2a2a3a] gap-3">
        <div className="min-w-0">
          <span className="block text-sm font-mono text-text-secondary truncate">{filename}</span>
          {editing && (
            <span className="block text-[11px] text-text-muted mt-0.5">
              Editing on {branch}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {editing ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={cancelEditing}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                           bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1 transition-colors disabled:opacity-60"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={commitChanges}
                disabled={saving || !hasChanges}
                className="flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-500
                           border border-green-500/40 rounded-md px-2.5 py-1 transition-colors disabled:opacity-60"
              >
                {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <CheckIcon className="w-3.5 h-3.5" />}
                {saving ? 'Committing' : 'Commit'}
              </motion.button>
            </>
          ) : (
            <>
              {canEdit && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={startEditing}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                             bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1 transition-colors"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  Edit
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={copy}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                           bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1 transition-colors"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={download}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary
                           bg-bg-secondary border border-[#2a2a3a] rounded-md px-2.5 py-1 transition-colors"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Raw
              </motion.button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="px-4 py-3 bg-bg-secondary border-b border-[#2a2a3a]">
          <input
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            placeholder={defaultCommitMessage}
            disabled={saving}
            className="w-full bg-bg-tertiary border border-[#2a2a3a] rounded-md px-3 py-2
                       text-sm text-text-primary placeholder:text-text-muted outline-none
                       focus:border-indigo-500/60 disabled:opacity-60"
          />
        </div>
      )}

      <Editor
        height="500px"
        language={language}
        value={draft}
        theme="vs-dark"
        onChange={(value) => setDraft(value ?? '')}
        options={{
          readOnly: !editing || saving,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 21,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          fontFamily: "'JetBrains Mono', monospace",
          renderLineHighlight: 'line',
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          wordWrap: 'off',
        }}
      />
    </div>
  );
};

export default CodeViewer;
