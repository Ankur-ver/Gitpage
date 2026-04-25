import React from 'react';
import { motion } from 'framer-motion';
import { ClockIcon } from '@heroicons/react/24/outline';

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions: number;
  deletions: number;
}

interface Props { commits: Commit[] }

const CommitHistory: React.FC<Props> = ({ commits }) => {
  console.log('CommitHistory - received commits:', commits);

  return (
    <div className="space-y-2">
      {commits.map((commit, i) => {
        console.log('CommitHistory - rendering commit:', commit);
        return (
          <motion.div
            key={commit.sha}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="gradient-border p-4 flex items-center gap-4"
            title={commit.message || '(no commit message)'}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                            flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {commit.author.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-semibold leading-snug">
                {commit.message || '(no commit message)'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-text-muted">
                <span>{commit.author}</span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {new Date(commit.date).toLocaleString()}
                </span>
                <span className="bg-bg-secondary border border-[#2a2a3a] rounded-full px-2 py-0.5">
                  {commit.sha.slice(0, 7)}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs flex-shrink-0">
              <span className="text-green-400">+{commit.additions}</span>
              <span className="text-red-400">-{commit.deletions}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default CommitHistory