import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { ClipboardDocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  code: string;
  language: string;
  filename: string;
}

const CodeViewer: React.FC<Props> = ({ code, language, filename }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gradient-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-tertiary border-b border-[#2a2a3a]">
        <span className="text-sm font-mono text-text-secondary">{filename}</span>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <Editor
        height="500px"
        language={language}
        value={code}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 21,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          fontFamily: "'JetBrains Mono', monospace",
          renderLineHighlight: 'line',
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        }}
      />
    </div>
  );
};

export default CodeViewer;