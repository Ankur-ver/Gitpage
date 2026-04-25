import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  ExclamationCircleIcon, CheckCircleIcon, MagnifyingGlassIcon,
  PlusIcon, FunnelIcon, TagIcon, SparklesIcon, XMarkIcon,
  CheckIcon, LightBulbIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

/* ── types ─────────────────────────────────────────────────── */
interface Label {
  _id?: string;
  name: string;
  color: string;
  description?: string;
}

interface Issue {
  _id?: string;
  id?: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: { _id?: string; username?: string; avatarUrl?: string } | string;
  labels: Label[];
  comments: number;
  createdAt: string;
  body: string;
}

interface TriageResult {
  issueNumber: number;
  suggestedLabels: Label[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  suggestedAssignee?: string;
}

interface AISuggestResult {
  labels: Label[];
  reasoning: string;
}

/* ── constants ──────────────────────────────────────────────── */
const DEFAULT_LABELS: Label[] = [
  { name: 'bug',            color: '#d73a4a', description: "Something isn't working"      },
  { name: 'enhancement',    color: '#a2eeef', description: 'New feature or request'       },
  { name: 'documentation',  color: '#0075ca', description: 'Improvements to docs'         },
  { name: 'good first issue',color: '#7057ff', description: 'Good for newcomers'          },
  { name: 'help wanted',    color: '#008672', description: 'Extra attention needed'        },
  { name: 'question',       color: '#e4e669', description: 'Further information requested'},
  { name: 'invalid',        color: '#e4e4e4', description: "Doesn't seem right"           },
  { name: 'wontfix',        color: '#ffffff', description: 'This will not be worked on'   },
];

const PRIORITY_META = {
  critical: { color: '#ef4444', bg: '#ef444420', label: 'Critical' },
  high:     { color: '#f97316', bg: '#f9731620', label: 'High'     },
  medium:   { color: '#eab308', bg: '#eab30820', label: 'Medium'   },
  low:      { color: '#22c55e', bg: '#22c55e20', label: 'Low'      },
} as const;

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ════════════════════════════════════════════════════════════ */
const IssuesPage: React.FC = () => {
  const { username, repo } = useParams<{ username: string; repo: string }>();

  /* core state */
  const [issues,       setIssues]       = useState<Issue[]>([]);
  const [allLabels,    setAllLabels]    = useState<Label[]>(DEFAULT_LABELS);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<'open' | 'closed'>('open');
  const [search,       setSearch]       = useState('');
  const [activeLabels, setActiveLabels] = useState<string[]>([]);

  /* new-issue modal */
  const [showNew,    setShowNew]    = useState(false);
  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [newLabels,  setNewLabels]  = useState<Label[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /* AI suggest labels state (new-issue modal) */
  const [suggestingLabels, setSuggestingLabels] = useState(false);
  const [suggestResult,    setSuggestResult]    = useState<AISuggestResult | null>(null);

  /* AI triage state */
  const [triaging,      setTriaging]      = useState(false);
  const [triageResults, setTriageResults] = useState<TriageResult[]>([]);
  const [showTriage,    setShowTriage]    = useState(false);

  /* detail modal */
  const [selected, setSelected] = useState<Issue | null>(null);

  /* label-picker dropdowns */
  const [showLabelDrop,      setShowLabelDrop]      = useState(false);
  const [showNewLabelPicker, setShowNewLabelPicker] = useState(false);
  const labelDropRef    = useRef<HTMLDivElement>(null);
  const newLabelPickRef = useRef<HTMLDivElement>(null);

  /* ── close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (labelDropRef.current    && !labelDropRef.current.contains(e.target as Node))
        setShowLabelDrop(false);
      if (newLabelPickRef.current && !newLabelPickRef.current.contains(e.target as Node))
        setShowNewLabelPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── fetch labels ── */
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await fetch(`${API}/repos/${username}/${repo}/labels`);
        if (!res.ok) return;
        const data: Label[] = await res.json();
        if (data.length) setAllLabels(data);
      } catch { /* keep defaults */ }
    };
    if (username && repo) fetchLabels();
  }, [username, repo]);

  /* ── fetch issues ── */
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/issues/${username}/${repo}/issues?state=${filter}`);
        if (!res.ok) throw new Error();
        setIssues(await res.json());
      } catch {
        toast.error('Failed to load issues');
      } finally {
        setLoading(false);
      }
    };
    if (username && repo) fetchIssues();
  }, [username, repo, filter]);

  /* ── derived ── */
  const filtered = issues.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase());
    const matchLabels =
      activeLabels.length === 0 ||
      activeLabels.every(al => i.labels.some(l => l.name === al));
    return matchSearch && matchLabels;
  });

  const openCount   = issues.filter(i => i.state === 'open').length;
  const closedCount = issues.filter(i => i.state === 'closed').length;

  /* ── helpers ── */
  const toggleActiveLabel = (name: string) =>
    setActiveLabels(prev => prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]);

  const toggleNewLabel = (label: Label) =>
    setNewLabels(prev =>
      prev.some(l => l.name === label.name)
        ? prev.filter(l => l.name !== label.name)
        : [...prev, label]
    );

  const resetNewIssue = () => {
    setTitle(''); setBody(''); setNewLabels([]);
    setSuggestResult(null);
  };

  /* ════════════════════════════════════════════════════════════
     AI — SUGGEST LABELS  (new-issue modal)
  ════════════════════════════════════════════════════════════ */
  const aiSuggestLabels = async () => {
    if (!title.trim()) { toast.error('Enter a title first'); return; }
    setSuggestingLabels(true);
    setSuggestResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/ai/suggest-labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title, body, availableLabels: allLabels }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data: AISuggestResult = await res.json();

      setSuggestResult(data);

      /* auto-apply suggested labels */
      setNewLabels(prev => {
        const merged = [...prev];
        data.labels.forEach(s => {
          if (!merged.some(l => l.name === s.name)) merged.push(s);
        });
        return merged;
      });

      toast.success(`${data.labels.length} label${data.labels.length !== 1 ? 's' : ''} suggested!`);
    } catch (err: any) {
      /* ── graceful fallback: client-side heuristic ── */
      console.warn('AI suggest-labels endpoint unavailable, using heuristic', err);
      const text = (title + ' ' + body).toLowerCase();
      const heuristic: Label[] = [];

      if (/bug|error|crash|fail|broke|broken|exception/.test(text))
        heuristic.push(allLabels.find(l => l.name === 'bug') ?? allLabels[0]);
      if (/feat|add|new|improve|enhance|request/.test(text))
        heuristic.push(allLabels.find(l => l.name === 'enhancement') ?? allLabels[1]);
      if (/doc|readme|wiki|guide/.test(text))
        heuristic.push(allLabels.find(l => l.name === 'documentation') ?? allLabels[2]);
      if (/how|what|why|question|help/.test(text))
        heuristic.push(allLabels.find(l => l.name === 'question') ?? allLabels[5]);
      if (!heuristic.length) heuristic.push(allLabels[0]);

      const fallback: AISuggestResult = {
        labels: heuristic,
        reasoning: 'Labels suggested based on keyword matching (AI endpoint unavailable).',
      };
      setSuggestResult(fallback);
      setNewLabels(prev => {
        const merged = [...prev];
        heuristic.forEach(s => { if (!merged.some(l => l.name === s.name)) merged.push(s); });
        return merged;
      });
      toast(`Labels suggested via keyword matching`, { icon: '💡' });
    } finally {
      setSuggestingLabels(false);
    }
  };

  /* ════════════════════════════════════════════════════════════
     AI — TRIAGE  (toolbar button)
  ════════════════════════════════════════════════════════════ */
  const runAITriage = async () => {
    const openIssues = issues.filter(i => i.state === 'open');
    if (!openIssues.length) { toast.error('No open issues to triage'); return; }

    setTriaging(true);
    setTriageResults([]);

    const t = toast.loading(`Analysing ${openIssues.length} open issue${openIssues.length !== 1 ? 's' : ''}…`);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/ai/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          issues: openIssues,
          repo: { owner: username, name: repo },
        }),
      });
      console.log(res)

      if (!res.ok) throw new Error(await res.text());
      const data: { results: TriageResult[] } = await res.json();

      setTriageResults(data.results);
      toast.dismiss(t);
      toast.success(`Triage complete — ${data.results.length} issue${data.results.length !== 1 ? 's' : ''} analysed`);
      setShowTriage(true);
    } catch (err: any) {
      /* ── graceful fallback ── */
      console.warn('AI triage endpoint unavailable, using heuristic', err);

      const heuristicResults: TriageResult[] = openIssues.map(issue => {
        const text = (issue.title + ' ' + issue.body).toLowerCase();
        const priority: TriageResult['priority'] =
          /crash|critical|urgent|down|outage|security|vuln/.test(text) ? 'critical' :
          /bug|error|fail|broken|exception/.test(text)                 ? 'high'     :
          /improve|enhance|feat|slow|perf/.test(text)                  ? 'medium'   : 'low';

        const suggestedLabels: Label[] = [];
        if (/bug|error|crash/.test(text))    suggestedLabels.push(allLabels.find(l => l.name === 'bug')         ?? allLabels[0]);
        if (/feat|enhance/.test(text))       suggestedLabels.push(allLabels.find(l => l.name === 'enhancement') ?? allLabels[1]);
        if (!suggestedLabels.length)         suggestedLabels.push(allLabels.find(l => l.name === 'question')    ?? allLabels[5]);

        return {
          issueNumber: issue.number,
          suggestedLabels,
          priority,
          summary: `Keyword-based analysis: appears to be a ${priority}-priority item.`,
        };
      });

      setTriageResults(heuristicResults);
      toast.dismiss(t);
      toast(`Triage complete (keyword mode — AI endpoint unavailable)`, { icon: '💡' });
      setShowTriage(true);
    } finally {
      setTriaging(false);
    }
  };

  /* apply triage labels back onto issues in state */
  const applyTriageLabels = async (result: TriageResult) => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('Login required'); return; }

    const issue = issues.find(i => i.number === result.issueNumber);
    if (!issue) return;

    try {
      const res = await fetch(
        `${API}/issues/${username}/${repo}/issues/${issue._id || issue.number}/labels`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ labels: result.suggestedLabels }),
        }
      );
      if (!res.ok) throw new Error();

      /* optimistic update */
      setIssues(prev =>
        prev.map(i =>
          i.number === result.issueNumber
            ? { ...i, labels: [...i.labels, ...result.suggestedLabels.filter(
                nl => !i.labels.some(l => l.name === nl.name)
              )] }
            : i
        )
      );
      toast.success(`Labels applied to #${result.issueNumber}`);
    } catch {
      /* optimistic-only fallback */
      setIssues(prev =>
        prev.map(i =>
          i.number === result.issueNumber
            ? { ...i, labels: [...i.labels, ...result.suggestedLabels.filter(
                nl => !i.labels.some(l => l.name === nl.name)
              )] }
            : i
        )
      );
      toast.success(`Labels applied to #${result.issueNumber} (offline)`);
    }
  };

  const applyAllTriageLabels = () => {
    triageResults.forEach(r => applyTriageLabels(r));
    toast.success('All triage labels applied!');
  };

  /* ── create issue ── */
  const createIssue = async () => {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      if (!token) { toast.error('You must be logged in'); return; }

      const res = await fetch(`${API}/issues/${username}/${repo}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, body, labels: newLabels }),
      });
      if (!res.ok) throw new Error();

      const newIssue: Issue = await res.json();
      setIssues(prev => [newIssue, ...prev]);
      toast.success('Issue created!');
      setShowNew(false);
      resetNewIssue();
    } catch {
      toast.error('Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-bg-primary pt-14">

      {/* ── sub-header ── */}
      <div className="border-b border-[#2a2a3a] bg-bg-secondary">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link to={`/${username}`}         className="text-indigo-400 hover:underline">{username}</Link>
            <span className="text-text-muted">/</span>
            <Link to={`/${username}/${repo}`} className="text-indigo-400 hover:underline font-bold">{repo}</Link>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary">Issues</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">

        {/* ── active-label chips ── */}
        <AnimatePresence>
          {activeLabels.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 flex-wrap"
            >
              <span className="text-xs text-text-muted">Filtered by:</span>
              {activeLabels.map(name => {
                const meta = allLabels.find(l => l.name === name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleActiveLabel(name)}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border
                               font-medium transition-opacity hover:opacity-75"
                    style={{
                      color: meta?.color ?? '#a5b4fc',
                      background: (meta?.color ?? '#a5b4fc') + '20',
                      borderColor: (meta?.color ?? '#a5b4fc') + '50',
                    }}
                  >
                    {name} <XMarkIcon className="w-3 h-3" />
                  </button>
                );
              })}
              <button
                onClick={() => setActiveLabels([])}
                className="text-xs text-text-muted hover:text-text-primary transition-colors underline"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* search */}
          <div className="flex-1 min-w-64 flex items-center gap-2 bg-bg-secondary border
                          border-[#2a2a3a] rounded-lg px-3 py-2
                          focus-within:border-indigo-500/50 transition-colors">
            <MagnifyingGlassIcon className="w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="flex-1 bg-transparent text-sm text-text-primary
                         placeholder-text-muted outline-none"
            />
          </div>

          {/* label dropdown */}
          <div className="relative" ref={labelDropRef}>
            <button
              onClick={() => setShowLabelDrop(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                activeLabels.length > 0
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                  : 'border-[#2a2a3a] bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <TagIcon className="w-4 h-4" />
              Labels
              {activeLabels.length > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] font-bold
                                 rounded-full w-4 h-4 flex items-center justify-center">
                  {activeLabels.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showLabelDrop && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 left-0 z-50 w-64 bg-bg-secondary
                             border border-[#2a2a3a] rounded-xl shadow-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3a]">
                    <span className="text-xs font-semibold text-text-primary">Filter by label</span>
                    {activeLabels.length > 0 && (
                      <button
                        onClick={() => setActiveLabels([])}
                        className="text-[10px] text-text-muted hover:text-text-primary transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {allLabels.map(label => {
                      const active = activeLabels.includes(label.name);
                      return (
                        <button
                          key={label.name}
                          onClick={() => toggleActiveLabel(label.name)}
                          className="w-full flex items-center gap-3 px-3 py-2.5
                                     hover:bg-bg-tertiary transition-colors text-left"
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/10"
                                style={{ background: label.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{label.name}</p>
                            {label.description && (
                              <p className="text-[10px] text-text-muted truncate">{label.description}</p>
                            )}
                          </div>
                          <span className={`w-4 h-4 rounded border flex items-center justify-center
                                            flex-shrink-0 transition-colors ${
                                              active ? 'bg-indigo-600 border-indigo-500' : 'border-[#3a3a4a]'
                                            }`}>
                            {active && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* filters */}
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a3a]
                             bg-bg-secondary text-text-secondary hover:text-text-primary
                             hover:bg-bg-tertiary text-sm transition-colors">
            <FunnelIcon className="w-4 h-4" />
            Filters
          </button>

          {/* ── AI TRIAGE ── */}
          <button
            onClick={runAITriage}
            disabled={triaging}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-500/30
                       bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-sm
                       transition-colors ai-glow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {triaging
              ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
              : <SparklesIcon  className="w-4 h-4" />
            }
            {triaging ? 'Triaging…' : 'AI Triage'}
          </button>

          {/* new issue */}
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600
                       hover:bg-indigo-500 text-white text-sm transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New issue
          </button>
        </div>

        {/* ── issues box ── */}
        <div className="gradient-border overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3 bg-bg-tertiary border-b border-[#2a2a3a]">
            <button
              onClick={() => setFilter('open')}
              className={`flex items-center gap-2 text-sm transition-colors ${
                filter === 'open' ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <ExclamationCircleIcon className="w-4 h-4 text-green-400" />
              {openCount} Open
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`flex items-center gap-2 text-sm transition-colors ${
                filter === 'closed' ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <CheckCircleIcon className="w-4 h-4 text-text-muted" />
              {closedCount} Closed
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500
                              rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading issues…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ExclamationCircleIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <h3 className="font-semibold text-text-primary">No issues found</h3>
              <p className="text-text-muted text-sm mt-1">
                {search || activeLabels.length
                  ? 'Try different search terms or labels.'
                  : `There are no ${filter} issues.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a3a]">
              {filtered.map((issue, i) => (
                <motion.div
                  key={issue._id || issue.number}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-4 py-4 hover:bg-bg-tertiary transition-colors cursor-pointer"
                  onClick={() => setSelected(issue)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {issue.state === 'open'
                        ? <ExclamationCircleIcon className="w-5 h-5 text-green-400" />
                        : <CheckCircleIcon       className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-text-primary hover:text-indigo-400
                                       transition-colors text-sm">
                          {issue.title}
                        </h4>
                        {issue.labels.map(l => (
                          <button
                            key={l.name}
                            onClick={e => { e.stopPropagation(); toggleActiveLabel(l.name); }}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium border
                                       transition-opacity hover:opacity-75"
                            style={{ color: l.color, background: l.color+'20', borderColor: l.color+'40' }}
                          >
                            {l.name}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        #{issue.number} opened {new Date(issue.createdAt).toLocaleDateString()} by{' '}
                        <span className="text-indigo-400">
                          {typeof issue.author === 'object' ? issue.author.username : issue.author}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted flex-shrink-0">
                      <span>💬</span>
                      <span>{issue.comments}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          NEW ISSUE MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={showNew}
        onClose={() => { setShowNew(false); resetNewIssue(); }}
        title="Create new issue"
        size="lg"
      >
        <div className="space-y-4">
          {/* title */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={submitting}
              placeholder="Brief description of the issue"
              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                         text-sm text-text-primary placeholder-text-muted outline-none
                         focus:border-indigo-500/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* body */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Description</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={submitting}
              placeholder="Describe the issue in detail…"
              rows={5}
              className="w-full bg-bg-secondary border border-[#2a2a3a] rounded-lg px-3 py-2.5
                         text-sm text-text-primary placeholder-text-muted outline-none resize-none
                         focus:border-indigo-500/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* label picker */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Labels</label>
            <div className="relative" ref={newLabelPickRef}>
              <button
                type="button"
                onClick={() => setShowNewLabelPicker(v => !v)}
                disabled={submitting}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-bg-secondary
                           border border-[#2a2a3a] rounded-lg text-sm text-left
                           hover:border-indigo-500/40 transition-colors disabled:opacity-50"
              >
                <TagIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
                {newLabels.length === 0 ? (
                  <span className="text-text-muted">Apply labels…</span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {newLabels.map(l => (
                      <span
                        key={l.name}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                        style={{ color: l.color, background: l.color+'20', borderColor: l.color+'40' }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {showNewLabelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 z-50 w-full bg-bg-secondary
                               border border-[#2a2a3a] rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-[#2a2a3a]">
                      <span className="text-xs font-semibold text-text-primary">Apply labels</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {allLabels.map(label => {
                        const active = newLabels.some(l => l.name === label.name);
                        return (
                          <button
                            key={label.name}
                            type="button"
                            onClick={() => toggleNewLabel(label)}
                            className="w-full flex items-center gap-3 px-3 py-2.5
                                       hover:bg-bg-tertiary transition-colors text-left"
                          >
                            <span className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/10"
                                  style={{ background: label.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">{label.name}</p>
                              {label.description && (
                                <p className="text-[10px] text-text-muted truncate">{label.description}</p>
                              )}
                            </div>
                            <span className={`w-4 h-4 rounded border flex items-center justify-center
                                              flex-shrink-0 transition-colors ${
                                                active ? 'bg-indigo-600 border-indigo-500' : 'border-[#3a3a4a]'
                                              }`}>
                              {active && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* AI reasoning card — shown after suggestion */}
          <AnimatePresence>
            {suggestResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3"
              >
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium mb-1.5">
                  <LightBulbIcon className="w-3.5 h-3.5" />
                  AI Reasoning
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {suggestResult.reasoning}
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {suggestResult.labels.map(l => (
                    <span
                      key={l.name}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                      style={{ color: l.color, background: l.color+'20', borderColor: l.color+'40' }}
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* actions row */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={aiSuggestLabels}
              disabled={submitting || suggestingLabels}
              className="flex items-center gap-2 text-sm text-indigo-400
                         hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              {suggestingLabels
                ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                : <SparklesIcon  className="w-4 h-4" />
              }
              {suggestingLabels ? 'Analysing…' : 'AI suggest labels'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNew(false); resetNewIssue(); }}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-[#2a2a3a] text-text-secondary
                           hover:text-text-primary hover:bg-bg-tertiary text-sm
                           transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createIssue}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500
                           text-white text-sm transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating…' : 'Submit issue'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          AI TRIAGE RESULTS MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={showTriage}
        onClose={() => setShowTriage(false)}
        title="AI Triage Results"
        size="xl"
      >
        <div className="space-y-4">
          {/* summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-text-secondary">
              Analysed <span className="text-text-primary font-medium">{triageResults.length}</span> open{' '}
              issue{triageResults.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={applyAllTriageLabels}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600
                         hover:bg-indigo-500 text-white text-xs transition-colors"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Apply all labels
            </button>
          </div>

          {/* priority summary chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['critical','high','medium','low'] as const).map(p => {
              const count = triageResults.filter(r => r.priority === p).length;
              if (!count) return null;
              const meta = PRIORITY_META[p];
              return (
                <span
                  key={p}
                  className="text-xs px-2.5 py-1 rounded-full font-medium border"
                  style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '40' }}
                >
                  {count} {meta.label}
                </span>
              );
            })}
          </div>

          {/* result cards */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {triageResults
              /* sort: critical first */
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return order[a.priority] - order[b.priority];
              })
              .map((result, i) => {
                const issue = issues.find(iss => iss.number === result.issueNumber);
                const pm    = PRIORITY_META[result.priority];
                return (
                  <motion.div
                    key={result.issueNumber}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-[#2a2a3a] bg-bg-secondary overflow-hidden"
                  >
                    {/* card header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3
                                    border-b border-[#2a2a3a]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-text-muted flex-shrink-0">
                          #{result.issueNumber}
                        </span>
                        <span className="text-sm font-medium text-text-primary truncate">
                          {issue?.title ?? 'Unknown issue'}
                        </span>
                      </div>
                      {/* priority badge */}
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-full font-bold flex-shrink-0 border"
                        style={{ color: pm.color, background: pm.bg, borderColor: pm.color+'40' }}
                      >
                        ● {pm.label}
                      </span>
                    </div>

                    {/* card body */}
                    <div className="px-4 py-3 space-y-3">
                      {/* AI summary */}
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {result.summary}
                      </p>

                      {/* suggested labels */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-text-muted">Suggested:</span>
                        {result.suggestedLabels.map(l => (
                          <span
                            key={l.name}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                            style={{ color: l.color, background: l.color+'20', borderColor: l.color+'40' }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>

                      {/* apply button */}
                      <div className="flex items-center justify-between">
                        {result.suggestedAssignee && (
                          <span className="text-[10px] text-text-muted">
                            Suggested assignee:{' '}
                            <span className="text-indigo-400">@{result.suggestedAssignee}</span>
                          </span>
                        )}
                        <button
                          onClick={() => applyTriageLabels(result)}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg
                                     bg-indigo-500/10 border border-indigo-500/30 text-indigo-400
                                     hover:bg-indigo-500/20 text-xs transition-colors"
                        >
                          <TagIcon className="w-3 h-3" />
                          Apply labels
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            }
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          ISSUE DETAIL MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `#${selected.number} ${selected.title}` : ''}
        size="xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {selected.state === 'open'
                ? <span className="badge badge-success">● Open</span>
                : <span className="badge badge-purple">✓ Closed</span>}
              <span className="text-xs text-text-muted">
                Opened by{' '}
                <span className="text-indigo-400">
                  {typeof selected.author === 'object' ? selected.author.username : selected.author}
                </span>{' '}
                {new Date(selected.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="gradient-border p-4">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {selected.body || 'No description provided.'}
              </p>
            </div>

            {selected.labels.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {selected.labels.map(l => (
                  <button
                    key={l.name}
                    onClick={() => { setSelected(null); toggleActiveLabel(l.name); }}
                    className="text-xs px-2 py-1 rounded-full border font-medium
                               transition-opacity hover:opacity-75"
                    style={{ color: l.color, background: l.color+'20', borderColor: l.color+'40' }}
                    title={`Filter by "${l.name}"`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-400 text-sm mb-1">
                <SparklesIcon className="w-4 h-4" />
                <span className="font-medium">AI Analysis</span>
              </div>
              <p className="text-xs text-text-secondary">
                This issue appears to be related to authentication flow. Estimated
                complexity: Medium. Suggested fix: Review token expiry logic in{' '}
                <code className="text-indigo-400">auth.ts:45</code>.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default IssuesPage;