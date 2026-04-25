import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BugAntIcon, SparklesIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import aiService from '../../services/aiService';

const AIDebugger: React.FC = () => {
  const [code, setCode]       = useState('// Paste your code here\n');
  const [error, setError]     = useState('');
  const [language, setLang]   = useState('typescript');
  const [result, setResult]   = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const debug = async () => {
    if (!code.trim() || !error.trim()) {
      toast.error('Please provide code and error message');
      return;
    }
    setLoading(true);
    try {
      const res = await aiService.debugCode(code, error, language);
      setResult(res);
    } catch {
      toast.error('Debug failed – check your API key');
    } finally {
      setLoading(false);
    }
  };

  const langs = ['typescript','javascript','python','java','go','rust','cpp','php'];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="gradient-border p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BugAntIcon className="w-5 h-5 text-red-400" />
          <h3 className="font-semibold text-text-primary">AI Debugger</h3>
        </div>
        <select
          value={language}
          onChange={e => setLang(e.target.value)}
          className="bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-1.5
                     text-sm text-text-primary outline-none"
        >
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={debug}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600
                     hover:bg-indigo-500 text-white text-sm disabled:opacity-50 transition-colors ml-auto"
        >
          <SparklesIcon className="w-4 h-4" />
          {loading ? 'Analyzing…' : 'Debug with AI'}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor */}
        <div className="gradient-border overflow-hidden">
          <div className="px-4 py-2 border-b border-[#2a2a3a] bg-bg-tertiary text-xs text-text-muted">
            Code to debug
          </div>
          <Editor
            height="300px"
            language={language}
            value={code}
            onChange={v => setCode(v || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              padding: { top: 12 },
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Error Message */}
        <div className="gradient-border overflow-hidden">
          <div className="px-4 py-2 border-b border-[#2a2a3a] bg-bg-tertiary text-xs text-text-muted">
            Error / Problem description
          </div>
          <textarea
            value={error}
            onChange={e => setError(e.target.value)}
            placeholder="Paste your error message or describe the problem…"
            className="w-full h-[300px] bg-[#0d0d14] text-text-primary placeholder-text-muted
                       p-4 text-sm font-mono outline-none resize-none"
          />
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-border p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-green-400">
            <WrenchScrewdriverIcon className="w-5 h-5" />
            <h3 className="font-semibold">AI Debug Results</h3>
          </div>

          {result.rootCause && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Root Cause</p>
              <p className="text-sm text-text-primary bg-red-500/10 border border-red-500/20
                            rounded-lg p-3">{result.rootCause}</p>
            </div>
          )}

          {result.fix && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Suggested Fix</p>
              <pre className="text-sm font-mono bg-bg-tertiary border border-[#2a2a3a]
                              rounded-lg p-3 overflow-x-auto text-green-400">{result.fix}</pre>
            </div>
          )}

          {result.explanation && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Explanation</p>
              <p className="text-sm text-text-primary leading-relaxed">{result.explanation}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AIDebugger;