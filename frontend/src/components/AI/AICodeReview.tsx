import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, CheckCircleIcon, XCircleIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import aiService from '../../services/aiService';

interface ReviewComment {
  line: number;
  type: 'suggestion' | 'issue' | 'praise';
  comment: string;
  suggestion?: string;
}

interface ReviewResult {
  score: number;
  summary: string;
  approved: boolean;
  comments: ReviewComment[];
}

interface Props {
  prId?: string;
  diff?: string;
}

const AICodeReview: React.FC<Props> = ({ prId = '', diff = '' }) => {
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult]       = useState<ReviewResult | null>(null);
  const [customDiff, setCustomDiff] = useState(diff);

  const review = async () => {
    if (!customDiff.trim()) { toast.error('Please provide a diff to review'); return; }
    setReviewing(true);
    try {
      const res = await aiService.reviewPR(prId, customDiff);
      setResult(res);
    } catch {
      // Demo result when API not available
      setResult({
        score: 78,
        summary: 'The code is generally well-written with good structure. There are a few areas for improvement in error handling and performance.',
        approved: false,
        comments: [
          { line: 15, type: 'issue',      comment: 'Missing null check for user object',        suggestion: 'Add optional chaining: user?.id' },
          { line: 28, type: 'suggestion', comment: 'Consider using useMemo to optimize re-renders', suggestion: 'const memoized = useMemo(() => compute(data), [data])' },
          { line: 42, type: 'praise',     comment: 'Excellent use of TypeScript generics here!' },
          { line: 67, type: 'issue',      comment: 'Async function missing await keyword',      suggestion: 'Add await before the async call' },
        ],
      });
    } finally {
      setReviewing(false);
    }
  };

  const typeConfig = {
    issue:      { icon: <XCircleIcon className="w-4 h-4" />,       color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
    suggestion: { icon: <ChatBubbleLeftIcon className="w-4 h-4" />, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
    praise:     { icon: <CheckCircleIcon className="w-4 h-4" />,    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Diff Input */}
      {!result && (
        <div className="gradient-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#2a2a3a] bg-bg-tertiary flex items-center justify-between">
            <span className="text-sm text-text-muted">Paste your diff / changes</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={review}
              disabled={reviewing}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600
                         hover:bg-indigo-500 text-white text-sm disabled:opacity-50 transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              {reviewing ? 'Reviewing…' : 'AI Review'}
            </motion.button>
          </div>
          <textarea
            value={customDiff}
            onChange={e => setCustomDiff(e.target.value)}
            placeholder={`@@ -1,5 +1,8 @@\n-old code\n+new code`}
            className="w-full h-64 bg-[#0d0d14] text-text-primary placeholder-text-muted
                       p-4 text-sm font-mono outline-none resize-none"
          />
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Score Card */}
          <div className="gradient-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`text-5xl font-bold ${scoreColor(result.score)}`}>
                  {result.score}
                </div>
                <div>
                  <p className="text-text-muted text-sm">Review Score</p>
                  <div className={`flex items-center gap-1 mt-1 ${result.approved ? 'text-green-400' : 'text-red-400'}`}>
                    {result.approved
                      ? <><CheckCircleIcon className="w-4 h-4" /><span className="text-sm font-medium">Approved</span></>
                      : <><XCircleIcon className="w-4 h-4" /><span className="text-sm font-medium">Changes Requested</span></>
                    }
                  </div>
                </div>
              </div>
              <div className="w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2a2a3a" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={result.score >= 80 ? '#10b981' : result.score >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${result.score} ${100 - result.score}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {(['issue','suggestion','praise'] as const).map(type => {
                const count = result.comments.filter(c => c.type === type).length;
                const cfg   = typeConfig[type];
                return count > 0 ? (
                  <span key={type} className={`badge ${cfg.color} ${cfg.bg} border ${cfg.border} text-xs`}>
                    {count} {type}{count > 1 ? 's' : ''}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            {result.comments.map((c, i) => {
              const cfg = typeConfig[c.type];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`gradient-border p-4 border-l-4 ${cfg.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${cfg.color} mt-0.5 flex-shrink-0`}>{cfg.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge text-[10px] capitalize ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                          {c.type}
                        </span>
                        <code className="text-xs text-text-muted">Line {c.line}</code>
                      </div>
                      <p className="text-sm text-text-primary">{c.comment}</p>
                      {c.suggestion && (
                        <pre className="mt-2 text-xs font-mono bg-bg-tertiary border border-[#2a2a3a]
                                        rounded-lg p-2 overflow-x-auto text-indigo-300">
                          {c.suggestion}
                        </pre>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={() => setResult(null)}
            className="w-full py-2 rounded-lg border border-[#2a2a3a] text-text-muted
                       hover:text-text-primary hover:bg-bg-tertiary text-sm transition-colors"
          >
            Review Another Diff
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AICodeReview;