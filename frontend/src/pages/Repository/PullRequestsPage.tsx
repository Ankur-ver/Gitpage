import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowPathIcon, XCircleIcon,
  MagnifyingGlassIcon, PlusIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import Modal from '../../components/UI/Modal';
import AICodeReview from '../../components/AI/AICodeReview';
import toast from 'react-hot-toast';
import { repositoryService } from '../../services/repoService';

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
  canMerge?: boolean;
}

const PullRequestsPage: React.FC = () => {
  const { username, repo } = useParams<{ username:string; repo:string }>();
  const [filter, setFilter]   = useState<'open'|'merged'|'closed'>('open');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<PR | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(false);

  const [branches, setBranches] = useState<string[]>([]);
  const [parentBranches, setParentBranches] = useState<string[]>([]);
  const [parentOwner, setParentOwner] = useState<string | null>(null);
  const [parentRepoName, setParentRepoName] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBase, setPrBase] = useState('');
  const [prHead, setPrHead] = useState('');

  const [repoInfo, setRepoInfo] = useState<any | null>(null);

  const fetchPRs = async () => {
    if (!username || !repo) return;
    setLoading(true);
    try {
      const data = await repositoryService.getPullRequests(username, repo, filter);
      const mapped: PR[] = data.map((p: any) => ({
        id: p._id || p.id || Math.random(),
        number: p.number,
        title: p.title,
        state: p.state,
        author: p.author?.username || (p.author as any) || 'unknown',
        branch: p.headBranch || p.branch || '',
        base: p.baseBranch || p.base || '',
        comments: p.comments ?? 0,
        additions: p.additions ?? 0,
        deletions: p.deletions ?? 0,
        createdAt: p.createdAt || '',
        draft: p.draft || false,
        reviewStatus: p.reviewStatus || 'pending',
        canMerge: p.canMerge || false,
      }));
      setPrs(mapped);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load pull requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, repo, filter]);

  useEffect(() => {
    if (!username || !repo) return;
    (async () => {
      try {
        const r = await repositoryService.getRepository(username, repo);
        setRepoInfo(r);
        if ((r as any).fork && (r as any).forkedFrom) {
          // backend populates forkedFrom with { name, ownerUsername }
          setParentOwner((r as any).forkedFrom.ownerUsername);
          setParentRepoName((r as any).forkedFrom.name);
        } else {
          setParentOwner(null);
          setParentRepoName(null);
        }
      } catch (err) {
        // ignore
      }
    })();
  }, [username, repo]);

  useEffect(() => {
    if (!showNew || !username || !repo) return;
    let mounted = true;
    (async () => {
      try {
        // head branches from current repo (fork)
        const headData = await repositoryService.getBranches(username, repo);
        if (!mounted) return;
        const headNames = headData.map((b: any) => b.name || b);
        setBranches(headNames);
        setPrHead(headNames.length > 0 ? headNames[0] : '');

        // base branches from parent/upstream if available, else current repo
        if (parentOwner && parentRepoName) {
          try {
            const baseData = await repositoryService.getBranches(parentOwner, parentRepoName);
            if (!mounted) return;
            const baseNames = baseData.map((b: any) => b.name || b);
            setParentBranches(baseNames);
            setPrBase(baseNames.length > 0 ? baseNames[0] : '');
          } catch {
            // fallback to current repo branches
            setParentBranches([]);
            setPrBase(headNames.length > 0 ? headNames[0] : '');
          }
        } else {
          setParentBranches([]);
          setPrBase(headNames.length > 0 ? headNames[0] : '');
        }
      } catch (err: any) {
        toast.error('Failed to load branches');
      }
    })();
    return () => { mounted = false; };
  }, [showNew, username, repo, parentOwner, parentRepoName]);

  const filtered = prs
    .filter(p => p.state === filter)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    open:   prs.filter(p => p.state === 'open').length,
    merged: prs.filter(p => p.state === 'merged').length,
    closed: prs.filter(p => p.state === 'closed').length,
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
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-text-muted mx-auto mb-3" />
              <h3 className="font-semibold text-text-primary">Loading pull requests…</h3>
            </div>
          ) : filtered.length === 0 ? (
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
                  onClick={async () => {
                    try {
                      const detail = await repositoryService.getPullRequest(username || '', repo || '', pr.number);
                      // detail.diff may exist
                      const mapped: PR = {
                        id: detail._id || detail.id || pr.id,
                        number: detail.number,
                        title: detail.title,
                        state: detail.state,
                        author: detail.author?.username || pr.author,
                        branch: detail.headBranch || pr.branch,
                        base: detail.baseBranch || pr.base,
                        comments: detail.comments ?? pr.comments,
                        additions: detail.additions ?? pr.additions,
                        deletions: detail.deletions ?? pr.deletions,
                        createdAt: detail.createdAt || pr.createdAt,
                        draft: detail.draft || pr.draft,
                        reviewStatus: detail.reviewStatus || pr.reviewStatus,
                        canMerge: detail.canMerge ?? pr.canMerge,
                      } as PR;
                      // attach diff into a temporary field on mapped
                      (mapped as any).diff = detail.diff;
                      setSelected(mapped);
                    } catch (err: any) {
                      toast.error('Failed to load PR details');
                      setSelected(pr);
                    }
                  }}
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
                  onClick={async () => {
                    try {
                      await repositoryService.mergePullRequest(username || '', repo || '', selected.number);
                      toast.success('PR merged successfully!');
                      (selected as any).state = 'merged';
                      setSelected({ ...selected } as any);
                      setTimeout(() => {
                        fetchPRs();
                        setSelected(null);
                      }, 800);
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to merge PR');
                    }
                  }}
                  disabled={!selected?.canMerge}
                  className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors disabled:opacity-60"
                >
                  Merge pull request
                </button>
                <button
                  onClick={() => { toast.error('PR closed'); setSelected(null); }}
                  className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-text-secondary hover:text-text-primary hover:bg-bg-tertiary text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            )}
            {selected.state === 'merged' && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-sm text-purple-400">✓ This pull request has been merged</p>
              </div>
            )}

            {/* Changed files list */}
            {(selected as any).diff?.files && (selected as any).diff.files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-text-primary mb-2">Changed files</h4>
                <div className="max-h-64 overflow-auto divide-y divide-[#2a2a3a]">
                  {(selected as any).diff.files.map((f: any, idx: number) => (
                    <div key={f.filename + idx} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-text-muted">{f.filename}</span>
                          <span className="text-green-400 text-xs">+{f.additions}</span>
                          <span className="text-red-400 text-xs">-{f.deletions}</span>
                        </div>
                        {f.content ? (
                          <details className="text-xs text-text-muted">
                            <summary className="cursor-pointer">View</summary>
                            <pre className="text-xs whitespace-pre-wrap mt-2 bg-bg-secondary p-2 rounded">{f.content}</pre>
                          </details>
                        ) : null}
                      </div>
                    </div>
                 ))}
                </div>
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
              <select value={prBase} onChange={e => setPrBase(e.target.value)} className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
                {(parentBranches.length > 0 ? parentBranches : branches).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {parentOwner && parentRepoName && (
                <p className="text-xs text-text-muted mt-1">Target: {parentOwner}/{parentRepoName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Compare branch</label>
              <select value={prHead} onChange={e => setPrHead(e.target.value)} className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Title</label>
            <input
              value={prTitle}
              onChange={e => setPrTitle(e.target.value)}
              placeholder="PR title"
              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea
              value={prBody}
              onChange={e => setPrBody(e.target.value)}
              placeholder="Describe your changes…"
              rows={4}
              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none resize-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-text-secondary hover:bg-bg-tertiary text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!username || !repo) return;
                try {
                  const targetOwner = parentOwner || username;
                  const targetRepo = parentRepoName || repo;
                  const newPR = await repositoryService.createPullRequest(targetOwner, targetRepo, {
                    title: prTitle || 'No title',
                    body: prBody,
                    head: `${username}:${prHead}`,
                    base: prBase || prHead,
                    draft: false,
                  });
                  toast.success(`PR #${newPR.number} created successfully!`);
                  setShowNew(false);
                  setPrTitle('');
                  setPrBody('');
                  await fetchPRs();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to create PR');
                }
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
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
