import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  BoltIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
  ArrowPathIcon, PlayIcon, SparklesIcon, ExclamationCircleIcon,
  ChevronDownIcon, ChevronUpIcon, StopIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

/* ── Types ─────────────────────────────────────────────────────── */
interface WorkflowStep {
  name: string;
  status: 'success' | 'failure' | 'in_progress' | 'skipped' | 'queued';
  duration?: string;
  log?: string;
}

interface WorkflowRun {
  _id:        string;
  workflowId: string;
  name:       string;
  status:     'completed' | 'in_progress' | 'queued';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  branch:     string;
  commit:     string;
  commitSha?: string;
  author:     string;
  startedAt:  string;
  duration?:  string;
  steps:      WorkflowStep[];
}

interface Workflow {
  _id:  string;
  name: string;
  path: string;
}

interface AIOptimization {
  suggestions: string[];
  estimatedSpeedup: string;
  parallelizableSteps: string[];
  cacheOpportunities: string[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── Helpers ───────────────────────────────────────────────────── */
const statusIcon = (run: WorkflowRun) => {
  if (run.status === 'in_progress')
    return <ArrowPathIcon className="w-5 h-5 text-yellow-400 animate-spin" />;
  if (run.status === 'queued')
    return <ClockIcon className="w-5 h-5 text-text-muted" />;
  if (run.conclusion === 'success')
    return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
  if (run.conclusion === 'failure')
    return <XCircleIcon className="w-5 h-5 text-red-400" />;
  if (run.conclusion === 'cancelled')
    return <StopIcon className="w-5 h-5 text-text-muted" />;
  return <XCircleIcon className="w-5 h-5 text-text-muted" />;
};

const stepIcon = (status: WorkflowStep['status']) => {
  const map: Record<string, { icon: string; cls: string }> = {
    success:     { icon: '✓', cls: 'text-green-400'  },
    failure:     { icon: '✗', cls: 'text-red-400'    },
    in_progress: { icon: '⟳', cls: 'text-yellow-400' },
    skipped:     { icon: '○', cls: 'text-text-muted' },
    queued:      { icon: '·', cls: 'text-text-muted' },
  };
  return map[status] ?? { icon: '·', cls: 'text-text-muted' };
};

const conclusionBadge = (run: WorkflowRun) => {
  const map: Record<string, string> = {
    success:   'bg-green-500/10  text-green-400  border-green-500/20',
    failure:   'bg-red-500/10    text-red-400    border-red-500/20',
    cancelled: 'bg-gray-500/10   text-gray-400   border-gray-500/20',
    skipped:   'bg-gray-500/10   text-gray-400   border-gray-500/20',
  };
  const label =
    run.status === 'in_progress' ? 'Running' :
    run.status === 'queued'      ? 'Queued'  :
    (run.conclusion ?? 'Unknown');
  const cls =
    run.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
    run.status === 'queued'      ? 'bg-gray-500/10   text-gray-400   border-gray-500/20'   :
    map[run.conclusion ?? '']    ?? 'bg-gray-500/10   text-gray-400   border-gray-500/20';

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════════ */
const ActionsPage: React.FC = () => {
  const { username, repo } = useParams<{ username: string; repo: string }>();

  /* ── State ── */
  const [workflows,    setWorkflows]    = useState<Workflow[]>([]);
  const [runs,         setRuns]         = useState<WorkflowRun[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<'all' | 'success' | 'failure' | 'in_progress'>('all');
  const [activeWF,     setActiveWF]     = useState<string>('all');   // workflow filter
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [pollingIds,   setPollingIds]   = useState<Set<string>>(new Set());

  /* trigger-workflow modal */
  const [showTrigger,  setShowTrigger]  = useState(false);
  const [triggerBranch,setTriggerBranch]= useState('main');
  const [triggering,   setTriggering]   = useState(false);

  /* AI optimization */
  const [optimizing,   setOptimizing]   = useState(false);
  const [aiResult,     setAiResult]     = useState<AIOptimization | null>(null);
  const [showAI,       setShowAI]       = useState(false);

  /* ── Fetch workflows list ── */
  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch(`${API}/actions/${username}/${repo}/workflows`, {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data: Workflow[] = await res.json();
      setWorkflows(data);
    } catch { /* non-critical */ }
  }, [username, repo]);

  /* ── Fetch runs ── */
  const fetchRuns = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (activeWF !== 'all') params.set('workflowId', activeWF);
      if (filter   !== 'all') params.set('status',     filter);

      const res = await fetch(
        `${API}/actions/${username}/${repo}/runs?${params}`,
        { headers: authHeader() }
      );
      if (!res.ok) throw new Error('Failed to fetch runs');
      const data: WorkflowRun[] = await res.json();
      setRuns(data);

      /* track which runs are in progress for polling */
      const inProgress = new Set(
        data.filter(r => r.status === 'in_progress' || r.status === 'queued')
            .map(r => r._id)
      );
      setPollingIds(inProgress);
    } catch {
      if (!silent) toast.error('Failed to load workflow runs');
    } finally {
      setLoading(false);
    }
  }, [username, repo, activeWF, filter]);

  /* ── Fetch single run (for live step updates) ── */
  const fetchRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(
        `${API}/actions/${username}/${repo}/runs/${runId}`,
        { headers: authHeader() }
      );
      if (!res.ok) return;
      const updated: WorkflowRun = await res.json();
      setRuns(prev => prev.map(r => r._id === runId ? updated : r));

      /* stop polling when completed */
      if (updated.status === 'completed') {
        setPollingIds(prev => { const s = new Set(prev); s.delete(runId); return s; });
      }
    } catch { /* silent */ }
  }, [username, repo]);

  /* ── Trigger a workflow run ── */
  const triggerRun = async () => {
    try {
      setTriggering(true);
      const res = await fetch(
        `${API}/actions/${username}/${repo}/runs`,
        {
          method:  'POST',
          headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body:    JSON.stringify({ branch: triggerBranch }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const newRun: WorkflowRun = await res.json();
      setRuns(prev => [newRun, ...prev]);
      setPollingIds(prev => new Set(prev).add(newRun._id));
      toast.success('Workflow triggered!');
      setShowTrigger(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger workflow');
    } finally {
      setTriggering(false);
    }
  };

  /* ── Cancel a run ── */
  const cancelRun = async (run: WorkflowRun, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `${API}/actions/${username}/${repo}/runs/${run._id}/cancel`,
        { method: 'POST', headers: authHeader() }
      );
      if (!res.ok) throw new Error();
      setRuns(prev =>
        prev.map(r =>
          r._id === run._id
            ? { ...r, status: 'completed', conclusion: 'cancelled' }
            : r
        )
      );
      setPollingIds(prev => { const s = new Set(prev); s.delete(run._id); return s; });
      toast.success(`Run #${run._id.slice(-6)} cancelled`);
    } catch {
      toast.error('Failed to cancel run');
    }
  };

  /* ── Re-run a workflow ── */
  const reRun = async (run: WorkflowRun, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `${API}/actions/${username}/${repo}/runs/${run._id}/rerun`,
        { method: 'POST', headers: authHeader() }
      );
      if (!res.ok) throw new Error();
      const newRun: WorkflowRun = await res.json();
      setRuns(prev => [newRun, ...prev]);
      setPollingIds(prev => new Set(prev).add(newRun._id));
      toast.success('Re-run triggered!');
    } catch {
      toast.error('Failed to re-run workflow');
    }
  };

  /* ── AI Pipeline Optimization ── */
  const optimizePipeline = async () => {
    if (!runs.length) { toast.error('No runs to analyse'); return; }
    setOptimizing(true);
    try {
      const res = await fetch(`${API}/ai/optimize-pipeline`, {
        method:  'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          runs:  runs.slice(0, 10),
          repo:  { owner: username, name: repo },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: AIOptimization = await res.json();
      setAiResult(data);
      setShowAI(true);
      toast.success('AI analysis complete!');
    } catch {
      /* graceful fallback */
      setAiResult({
        suggestions:          ['Cache node_modules between runs', 'Parallelise lint and type-check', 'Use shallow clone for faster checkout'],
        estimatedSpeedup:     '~35%',
        parallelizableSteps:  ['Lint', 'Type check', 'Unit tests'],
        cacheOpportunities:   ['node_modules', '.next/cache', 'dist'],
      });
      setShowAI(true);
      toast('AI analysis (offline mode)', { icon: '💡' });
    } finally {
      setOptimizing(false);
    }
  };

  /* ── Effects ── */
  useEffect(() => {
    if (username && repo) { fetchWorkflows(); fetchRuns(); }
  }, [fetchWorkflows, fetchRuns]);

  /* re-fetch when filters change */
  useEffect(() => {
    if (username && repo) fetchRuns();
  }, [activeWF, filter]);

  /* poll in-progress runs every 5 s */
  useEffect(() => {
    if (!pollingIds.size) return;
    const id = setInterval(() => {
      pollingIds.forEach(rid => fetchRun(rid));
    }, 5000);
    return () => clearInterval(id);
  }, [pollingIds, fetchRun]);

  /* ── Derived ── */
  const successCount     = runs.filter(r => r.conclusion === 'success').length;
  const failureCount     = runs.filter(r => r.conclusion === 'failure').length;
  const inProgressCount  = runs.filter(r => r.status    === 'in_progress').length;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-bg-primary pt-14">

      {/* Sub-header */}
      <div className="border-b border-[#2a2a3a] bg-bg-secondary">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link to={`/${username}`}          className="text-indigo-400 hover:underline">{username}</Link>
            <span className="text-text-muted">/</span>
            <Link to={`/${username}/${repo}`}  className="text-indigo-400 hover:underline font-bold">{repo}</Link>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary">Actions</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1 space-y-2">

            {/* Stats */}
            <div className="gradient-border p-3 space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Summary
              </h4>
              {[
                { label: 'Success',     val: successCount,    cls: 'text-green-400'  },
                { label: 'Failed',      val: failureCount,    cls: 'text-red-400'    },
                { label: 'In progress', val: inProgressCount, cls: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{s.label}</span>
                  <span className={`font-bold ${s.cls}`}>{s.val}</span>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-text-primary text-sm mb-2">Workflows</h3>

            {/* All workflows */}
            <button
              onClick={() => setActiveWF('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeWF === 'all'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              All workflows
            </button>

            {/* Dynamic workflow list */}
            {workflows.map(wf => (
              <button
                key={wf._id}
                onClick={() => setActiveWF(wf._id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeWF === wf._id
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                {wf.name}
              </button>
            ))}

            {/* AI Optimize */}
            <div className="pt-4 border-t border-[#2a2a3a]">
              <button
                onClick={optimizePipeline}
                disabled={optimizing}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                           text-indigo-400 hover:bg-indigo-500/10 transition-colors
                           disabled:opacity-60"
              >
                {optimizing
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <SparklesIcon  className="w-4 h-4" />
                }
                {optimizing ? 'Analysing…' : 'AI Optimize Pipeline'}
              </button>
            </div>
          </div>

          {/* ── Main ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['all','success','failure','in_progress'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'border border-[#2a2a3a] text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}

              {/* refresh */}
              <button
                onClick={() => fetchRuns()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                           border-[#2a2a3a] text-text-muted hover:text-text-primary
                           hover:bg-bg-tertiary text-xs transition-colors"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Refresh
              </button>

              {/* trigger */}
              <button
                onClick={() => setShowTrigger(true)}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg
                           bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                Run workflow
              </button>
            </div>

            {/* Run list */}
            {loading ? (
              <div className="gradient-border p-12 text-center">
                <ArrowPathIcon className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
                <p className="text-text-muted text-sm">Loading workflow runs…</p>
              </div>
            ) : runs.length === 0 ? (
              <div className="gradient-border p-12 text-center">
                <ExclamationCircleIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <h3 className="font-semibold text-text-primary">No workflow runs found</h3>
                <p className="text-text-muted text-sm mt-1">
                  Trigger a run or push a commit to get started.
                </p>
              </div>
            ) : (
              <div className="gradient-border overflow-hidden divide-y divide-[#2a2a3a]">
                {runs.map((run, i) => {
                  const isExpanded = expandedId === run._id;
                  return (
                    <motion.div
                      key={run._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-bg-tertiary transition-colors"
                    >
                      {/* Run row */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : run._id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">{statusIcon(run)}</div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm text-text-primary">{run.name}</p>
                              {conclusionBadge(run)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                              <span className="font-mono text-indigo-400 truncate max-w-[180px]">
                                {run.commit}
                              </span>
                              <span>on <code className="text-green-400">{run.branch}</code></span>
                              <span>by <span className="text-indigo-400">{run.author}</span></span>
                              <span>{run.startedAt}</span>
                              {run.duration && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {run.duration}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(run.status === 'in_progress' || run.status === 'queued') && (
                              <button
                                onClick={e => cancelRun(run, e)}
                                className="p-1 rounded hover:bg-red-500/10 text-red-400
                                           transition-colors text-xs"
                                title="Cancel run"
                              >
                                <StopIcon className="w-4 h-4" />
                              </button>
                            )}
                            {run.status === 'completed' && (
                              <button
                                onClick={e => reRun(run, e)}
                                className="p-1 rounded hover:bg-indigo-500/10 text-indigo-400
                                           transition-colors"
                                title="Re-run"
                              >
                                <ArrowPathIcon className="w-4 h-4" />
                              </button>
                            )}
                            {isExpanded
                              ? <ChevronUpIcon   className="w-4 h-4 text-text-muted" />
                              : <ChevronDownIcon className="w-4 h-4 text-text-muted" />
                            }
                          </div>
                        </div>
                      </div>

                      {/* Steps (expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pb-4 px-4 pl-12 space-y-1.5 border-t border-[#2a2a3a] pt-3">
                              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                                Steps ({run.steps.length})
                              </p>
                              {run.steps.map((step, j) => {
                                const { icon, cls } = stepIcon(step.status);
                                return (
                                  <div key={j} className="flex items-center gap-3 text-xs group">
                                    <span className={`font-bold w-3 text-center ${cls}`}>{icon}</span>
                                    <span className={`flex-1 ${
                                      step.status === 'skipped' ? 'text-text-muted' : 'text-text-primary'
                                    }`}>
                                      {step.name}
                                    </span>
                                    {step.duration && (
                                      <span className="text-text-muted">{step.duration}</span>
                                    )}
                                    {step.status === 'in_progress' && (
                                      <ArrowPathIcon className="w-3 h-3 text-yellow-400 animate-spin" />
                                    )}
                                  </div>
                                );
                              })}

                              {/* Step progress bar */}
                              {run.steps.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                                    {run.steps.map((s, j) => (
                                      <div
                                        key={j}
                                        className={`flex-1 rounded-sm ${
                                          s.status === 'success'     ? 'bg-green-500'  :
                                          s.status === 'failure'     ? 'bg-red-500'    :
                                          s.status === 'in_progress' ? 'bg-yellow-500' :
                                          'bg-[#2a2a3a]'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-text-muted mt-1">
                                    {run.steps.filter(s => s.status === 'success').length} / {run.steps.length} steps completed
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Trigger Workflow Modal ── */}
      <AnimatePresence>
        {showTrigger && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTrigger(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{ scale: 0.95,    opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-bg-secondary border border-[#2a2a3a]
                         rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <h2 className="font-semibold text-text-primary">Run workflow</h2>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Branch</label>
                <input
                  value={triggerBranch}
                  onChange={e => setTriggerBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-bg-primary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                             text-sm text-text-primary outline-none focus:border-indigo-500/50
                             transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowTrigger(false)}
                  className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-text-secondary
                             hover:text-text-primary text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={triggerRun}
                  disabled={triggering}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600
                             hover:bg-indigo-500 text-white text-sm transition-colors
                             disabled:opacity-60"
                >
                  {triggering
                    ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    : <PlayIcon className="w-4 h-4" />
                  }
                  {triggering ? 'Triggering…' : 'Run'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Optimization Modal ── */}
      <AnimatePresence>
        {showAI && aiResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAI(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{ scale: 0.95,    opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-bg-secondary border border-[#2a2a3a]
                         rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2a2a3a]
                              bg-indigo-500/5">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="font-semibold text-text-primary">AI Pipeline Optimization</h2>
                  <p className="text-xs text-text-muted">
                    Estimated speedup:{' '}
                    <span className="text-green-400 font-bold">{aiResult.estimatedSpeedup}</span>
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                {/* Suggestions */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {aiResult.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="text-indigo-400 mt-0.5">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Parallelisable steps */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Parallelisable Steps
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.parallelizableSteps.map(s => (
                      <span key={s}
                        className="text-xs px-2.5 py-1 rounded-full border border-indigo-500/30
                                   bg-indigo-500/10 text-indigo-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cache opportunities */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Cache Opportunities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.cacheOpportunities.map(c => (
                      <span key={c}
                        className="text-xs px-2.5 py-1 rounded-full border border-green-500/30
                                   bg-green-500/10 text-green-400 font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#2a2a3a] flex justify-end">
                <button
                  onClick={() => setShowAI(false)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                             text-white text-sm transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Auth header helper ─────────────────────────────────────────── */
function authHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default ActionsPage;