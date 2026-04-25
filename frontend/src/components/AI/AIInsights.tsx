import React from 'react';
import { motion } from 'framer-motion';
import { ShieldExclamationIcon, BoltIcon, SparklesIcon, BugAntIcon } from '@heroicons/react/24/outline';
import { AIAnalysis } from '../../types';

interface Props { analyses: AIAnalysis[] }

const severityConfig = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'CRITICAL' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'HIGH'     },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'MEDIUM'   },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'LOW'      },
  info:     { color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20',   label: 'INFO'     },
};

const typeIcons: Record<string, React.ReactNode> = {
  bug:         <BugAntIcon className="w-4 h-4" />,
  security:    <ShieldExclamationIcon className="w-4 h-4" />,
  performance: <BoltIcon className="w-4 h-4" />,
  style:       <SparklesIcon className="w-4 h-4" />,
  suggestion:  <SparklesIcon className="w-4 h-4" />,
};

const AIInsights: React.FC<Props> = ({ analyses }) => {
  const counts = {
    critical: analyses.filter(a => a.severity === 'critical').length,
    high:     analyses.filter(a => a.severity === 'high').length,
    medium:   analyses.filter(a => a.severity === 'medium').length,
    low:      analyses.filter(a => a.severity === 'low').length,
  };

  if (analyses.length === 0) {
    return (
      <div className="gradient-border p-8 text-center">
        <SparklesIcon className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
        <h3 className="font-semibold text-text-primary mb-1">No Issues Found</h3>
        <p className="text-text-muted text-sm">Run AI analysis on your code to see insights here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(counts).map(([key, val]) => {
          const cfg = severityConfig[key as keyof typeof severityConfig];
          return (
            <div key={key} className={`gradient-border p-3 text-center ${cfg.bg} border ${cfg.border}`}>
              <p className={`text-2xl font-bold ${cfg.color}`}>{val}</p>
              <p className="text-xs text-text-muted mt-1">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Issues list */}
      <div className="space-y-2">
        {analyses.map((analysis, i) => {
          const cfg = severityConfig[analysis.severity];
          return (
            <motion.div
              key={analysis.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`gradient-border p-4 border-l-4 ${cfg.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`${cfg.color} mt-0.5 flex-shrink-0`}>
                  {typeIcons[analysis.type] || <SparklesIcon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge text-[10px] ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                    <span className="badge badge-purple text-[10px] capitalize">{analysis.type}</span>
                    <code className="text-xs font-mono text-text-muted">{analysis.file}
                      {analysis.line ? `:${analysis.line}` : ''}
                    </code>
                  </div>
                  <p className="text-sm text-text-primary">{analysis.message}</p>
                  {analysis.suggestion && (
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      💡 {analysis.suggestion}
                    </p>
                  )}
                  {analysis.autoFix && (
                    <pre className="mt-2 text-xs font-mono bg-bg-tertiary border border-[#2a2a3a]
                                    rounded-lg p-2 overflow-x-auto text-green-400">
                      {analysis.autoFix}
                    </pre>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AIInsights;