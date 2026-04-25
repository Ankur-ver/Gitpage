import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowPathIcon, CheckCircleIcon, XCircleIcon,
  MagnifyingGlassIcon, PlusIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import Modal from '../../components/UI/Modal';
import AICodeReview from '../../components/AI/AICodeReview';
import toast from 'react-hot-toast';

interface PR {
  id: number;
  number: number;
  title: string;
  state: 'open'|'merged'|'closed';
  author: string;
  branch: string;
  base: string;
  comments: number;
  additions: number;
  deletions: number;
  createdAt: string;
  draft: boolean;
  reviewStatus: 'pending'|'approved'|'changes_requested';
}

const MOCK_PRS: PR[] = [
  { id:1, number:45, title:'feat: Add AI-powered code review',         state:'open',   author:'johndoe', branch:'feature/ai-review',   base:'main',    comments:5,  additions:234, deletions:12,  createdAt:'2h ago',  draft:false, reviewStatus:'pending'           },
  { id:2, number:44, title:'fix: Resolve token refresh race condition', state:'open',   author:'janedoe', branch:'fix/token-refresh',    base:'develop', comments:8,  additions:45,  deletions:23,  createdAt:'5h ago',  draft:false, reviewStatus:'changes_requested' },
  { id:3, number:43, title:'chore: Update all dependencies',            state:'merged', author:'devuser', branch:'chore/deps-update',    base:'main',    comments:2,  additions:89,  deletions:156, createdAt:'1d ago',  draft:false, reviewStatus:'approved'          },
  { id:4, number:42, title:'WIP: Refactor database layer',              state:'open',   author:'johndoe', branch:'refactor/db-layer',    base:'develop', comments:0,  additions:567, deletions:234, createdAt:'2d ago',  draft:true,  reviewStatus:'pending'           },
  { id:5, number:41, title:'feat: Real-time collaboration cursors',     state:'closed', author:'collab',  branch:'feature/collab',       base:'main',    comments:12, additions:345, deletions:67,  createdAt:'3d ago',  draft:false, reviewStatus:'changes_requested' },
];

const PullRequestsPage: React.FC = () => {
  const { username, repo } = useParams<{ username:string; repo:string }>();
  const [filter, setFilter]   = useState<'open'|'merged'|'closed'>('open');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<PR | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);

  const filtered = MOCK_PRS
    .filter(p => p.state === filter)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    open:   MOCK_PRS.filter(p => p.state === 'open').length,
    merged: MOCK_PRS.filter(p => p.state === 'merged').length,
    closed: MOCK_PRS.filter(p => p.state === 'closed').length,
  };

  const stateIcon = (pr: PR) => {
    if (pr.state === 'merged') return <span className="text-purple-400">⊕</span>;
    if (pr.state === 'closed') return <XCircleIcon className="w-5 h-5 text-red-400" />;
    return <ArrowPathIcon className="w-5 h-5 text-green-400" />;
  };

  const reviewBadge = (status: PR['reviewStatus']) => {
    if (status === 'approved')           return <span className="badge badge-success">✓ Approved</span>;
    if (status === 'changes_requested')  return <span className="badge badge-warning">⚠ Changes requested</span>;
    return <span className="badge badge-gray">⏳ Pending review</span>;
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      {/* Sub-header */}
      <div className="border-b border-[#2a2a3a] bg-bg-secondary">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link to={`/${username}`} className="text-indigo-400 hover:underline">{username}</Link>
            <span className="text-text-muted">/</span>
            <Link to={`/${username}/${repo}`} className="text-indigo-400 hover:underline font-bold">{repo}</Link>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary">Pull Requests</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-64 flex items-center gap-2 bg-bg-secondary border border-[#2a2a3a]
                          rounded-lg px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
            <MagnifyingGlassIcon className="w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pull requests…"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
            />
          </div>
          <button
            onClick={() => setShowAIReview(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-500/30
                       bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-sm transition-colors ai-glow"
          >
            <SparklesIcon className="w-4 h-4" />
            AI Review
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600
                       hover:bg-indigo-500 text-white text-sm transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New pull request
          </button>
        </div>

        {/* PR List */}
        <div className="gradient-border overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-4 px-4 py-3 bg-bg-tertiary border-b border-[#2a2a3a]">
            {(['open','merged','closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex items-center gap-2 text-sm capitalize transition-colors ${
                  filter === s ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {s === 'open'   && <ArrowPathIcon className="w-4 h-4 text-green-400" />}
                {s === 'merged' && <span className="text-purple-400 text-sm">⊕</span>}
                {s === 'closed' && <XCircleIcon className="w-4 h-4 text-red-400" />}
                {counts[s]} {s}
              </button>
            ))}
          </div>

          {/* Items */}
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <h3 className="font-semibold text-text-primary">No pull requests found</h3>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a3a]">
              {filtered.map((pr, i) => (
                <motion.div
                  key={pr.id}
                  initial={{ opacity:0 }}
                  animate={{ opacity:1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(pr)}
                  className="px-4 py-4 hover:bg-bg-tertiary transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{stateIcon(pr)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-text-primary text-sm hover:text-indigo-400 transition-colors">
                          {pr.title}
                        </h4>
                        {pr.draft && <span className="badge badge-gray">Draft</span>}
                        {reviewBadge(pr.reviewStatus)}
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        #{pr.number} by <span className="text-indigo-400">{pr.author}</span>{' '}
                        wants to merge <code className="text-green-400">{pr.branch}</code> into{' '}
                        <code className="text-blue-400">{pr.base}</code> · {pr.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted flex-shrink-0">
                      <span className="text-green-400">+{pr.additions}</span>
                      <span className="text-red-400">-{pr.deletions}</span>
                      <span>💬 {pr.comments}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PR Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `PR #${selected.number}` : ''}
        size="xl"
      >
        {selected && (
          <div className="space-y-4">
            <h3 className="font-semibold text-text-primary">{selected.title}</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {reviewBadge(selected.reviewStatus)}
              <span className="text-xs text-text-muted">
                {selected.additions + selected.deletions} changes in {selected.additions} additions,{' '}
                {selected.deletions} deletions
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="gradient-border p-3 text-center">
                <p className="text-green-400 font-bold text-lg">+{selected.additions}</p>
                <p className="text-xs text-text-muted">Additions</p>
              </div>
              <div className="gradient-border p-3 text-center">
                <p className="text-red-400 font-bold text-lg">-{selected.deletions}</p>
                <p className="text-xs text-text-muted">Deletions</p>
              </div>
              <div className="gradient-border p-3 text-center">
                <p className="text-blue-400 font-bold text-lg">{selected.comments}</p>
                <p className="text-xs text-text-muted">Comments</p>
              </div>
            </div>
            {selected.state === 'open' && (
              <div className="flex gap-3">
                <button
                  onClick={() => { toast.success('PR merged!'); setSelected(null); }}
                  className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500
                             text-white text-sm transition-colors"
                >
                  Merge pull request
                </button>
                <button
                  onClick={() => { toast.error('PR closed'); setSelected(null); }}
                  className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-text-secondary
                             hover:text-text-primary hover:bg-bg-tertiary text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* AI Review Modal */}
      <Modal
        open={showAIReview}
        onClose={() => setShowAIReview(false)}
        title="AI Code Review"
        size="xl"
      >
        <AICodeReview />
      </Modal>

      {/* New PR Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create pull request" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Base branch</label>
              <select className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2
                                 text-sm text-text-primary outline-none">
                {MOCK_PRS.map(p => p.base).filter((v,i,a) => a.indexOf(v) === i).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Compare branch</label>
              <select className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2
                                 text-sm text-text-primary outline-none">
                {['feature/new-feature','fix/bug-123','chore/cleanup'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Title</label>
            <input
              placeholder="PR title"
              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                         text-sm text-text-primary placeholder-text-muted outline-none
                         focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea
              placeholder="Describe your changes…"
              rows={4}
              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                         text-sm text-text-primary placeholder-text-muted outline-none resize-none
                         focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-text-secondary
                         hover:bg-bg-tertiary text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { toast.success('PR created!'); setShowNew(false); }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                         text-white text-sm transition-colors"
            >
              Create pull request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PullRequestsPage;