import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useAI } from '../../hooks/useAI';

interface Props { onClose?: () => void }

const AIAssistant: React.FC<Props> = ({ onClose }) => {
  const { chatHistory, loading, chat } = useAI();
  const [input, setInput]   = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    await chat(msg);
  };

  const suggestions = [
    'Explain this code',
    'Find bugs in my code',
    'How can I optimize this?',
    'Generate unit tests',
    'Review my pull request',
  ];

  return (
    <div className="flex flex-col h-full bg-bg-card border border-[#2a2a3a] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a]
                      bg-gradient-to-r from-indigo-500/10 to-purple-600/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                          flex items-center justify-center ai-glow">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">AI Assistant</h3>
            <p className="text-[11px] text-indigo-400">Powered by GitPage AI</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center shadow-glow animate-float">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-1">How can I help you?</h3>
              <p className="text-text-muted text-sm">
                Ask me anything about your code, bugs, or best practices.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left px-3 py-2 rounded-lg bg-bg-tertiary border border-[#2a2a3a]
                             text-sm text-text-secondary hover:text-text-primary hover:border-indigo-500/30
                             transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                                  flex items-center justify-center flex-shrink-0 mt-0.5">
                    <SparklesIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-bg-tertiary text-text-primary rounded-bl-sm border border-[#2a2a3a]'
                }`}>
                  {msg.content.includes('```') ? (
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{msg.content}</pre>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                                  flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    U
                  </div>
                )}
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                                flex items-center justify-center">
                  <SparklesIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-bg-tertiary border border-[#2a2a3a] rounded-2xl rounded-bl-sm
                                px-4 py-3 flex items-center gap-1.5">
                  {[0,1,2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2a2a3a]">
        <div className="flex items-end gap-2 bg-bg-secondary border border-[#2a2a3a]
                        rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
          <CodeBracketIcon className="w-4 h-4 text-text-muted mb-1 flex-shrink-0" />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about your code… (Enter to send)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted
                       outline-none resize-none max-h-32"
            style={{ height: 'auto' }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={send}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                       disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <PaperAirplaneIcon className="w-4 h-4 text-white" />
          </motion.button>
        </div>
        <p className="text-[11px] text-text-muted mt-2 text-center">
          AI may produce inaccurate information. Always review suggestions.
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;