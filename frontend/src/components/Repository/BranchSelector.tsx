import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Props {
  branches: string[];
  current: string;
  onChange: (b: string) => void;
}

const BranchSelector: React.FC<Props> = ({ branches, current, onChange }) => {
  const [open, setOpen]  = useState(false);
  const [q, setQ]        = useState('');
  const filtered = branches.filter(b => b.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a]
                   bg-bg-card text-text-primary text-sm hover:bg-bg-tertiary transition-colors"
      >
        <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1
            3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5
            0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0
            1-1v-.628A2.25 2.25 0 0 1 9.5 3.25z"/>
        </svg>
        <span className="font-medium max-w-[140px] truncate">{current}</span>
        <ChevronDownIcon className="w-3 h-3 text-text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit  ={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-full mt-1 w-64 bg-bg-card border border-[#2a2a3a]
                       rounded-xl shadow-card z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-[#2a2a3a]">
              <div className="flex items-center gap-2 bg-bg-secondary rounded-lg px-2 py-1.5">
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-text-muted" />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Filter branches…"
                  className="flex-1 bg-transparent text-xs text-text-primary
                             placeholder-text-muted outline-none"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              <p className="text-[10px] text-text-muted px-2 py-1 uppercase tracking-wider">Branches</p>
              {filtered.map(branch => (
                <button
                  key={branch}
                  onClick={() => { onChange(branch); setOpen(false); setQ(''); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                              flex items-center gap-2 ${
                    branch === current
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {branch === current && <span className="text-xs">✓</span>}
                  <span className="truncate">{branch}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BranchSelector;