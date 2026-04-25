import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ArrowPathIcon,
  LockClosedIcon,
  GlobeAltIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  PencilIcon,
  ExclamationCircleIcon,
  CodeBracketIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface Repository {
  _id          : string;
  name         : string;
  description  : string;
  language     : string | null;
  stars        : number | any[];
  forks        : number | any[];
  watchers     : number | any[];
  private      : boolean;
  fork         : boolean;
  archived     : boolean;
  topics       : string[];
  defaultBranch: string;
  updatedAt    : string;
  createdAt    : string;
  size         : number;
  openIssues   : number;
  ownerUsername: string;
}

type SortKey    = 'updated' | 'name' | 'stars' | 'forks' | 'created';
type FilterType = 'all' | 'public' | 'private' | 'forked' | 'archived';
type ViewMode   = 'list' | 'grid';

// =============================================================================
// Helpers
// =============================================================================

const count = (val: number | any[]): number =>
  Array.isArray(val) ? val.length : (val ?? 0);

const formatSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const timeAgo = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  if (days  < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const LANGUAGE_COLORS: Record<string, string> = {
  typescript : '#3178c6',
  javascript : '#f7df1e',
  python     : '#3572a5',
  rust       : '#dea584',
  go         : '#00add8',
  java       : '#b07219',
  kotlin     : '#a97bff',
  cpp        : '#f34b7d',
  c          : '#555555',
  csharp     : '#178600',
  php        : '#4f5d95',
  ruby       : '#701516',
  swift      : '#ffac45',
  html       : '#e34c26',
  css        : '#563d7c',
  vue        : '#41b883',
  dart       : '#00b4ab',
};

const getLangColor = (lang: string | null): string =>
  lang ? (LANGUAGE_COLORS[lang.toLowerCase()] ?? '#6e7681') : '#6e7681';

// =============================================================================
// Skeleton
// =============================================================================

const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#2a2a3a] rounded ${className}`} />
);

const RepoCardSkeleton: React.FC<{ view: ViewMode }> = ({ view }) =>
  view === 'list' ? (
    <div className="gradient-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Skel className="w-40 h-4" />
        <Skel className="w-16 h-5 rounded-full" />
      </div>
      <Skel className="w-3/4 h-3" />
      <div className="flex gap-3">
        <Skel className="w-16 h-3" />
        <Skel className="w-12 h-3" />
        <Skel className="w-20 h-3" />
      </div>
    </div>
  ) : (
    <div className="gradient-border p-4 space-y-3">
      <Skel className="w-32 h-4" />
      <Skel className="w-full h-3" />
      <Skel className="w-2/3 h-3" />
      <div className="flex gap-2">
        <Skel className="w-16 h-3" />
        <Skel className="w-12 h-3" />
      </div>
    </div>
  );

// =============================================================================
// RepoCard
// =============================================================================

interface RepoCardProps {
  repo    : Repository;
  view    : ViewMode;
  onDelete: (repo: Repository) => void;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, view, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const starCount = count(repo.stars);
  const forkCount = count(repo.forks);
  const langColor = getLangColor(repo.language);

  if (view === 'grid') {
    return (
      <motion.div
        layout
        initial   = {{ opacity: 0, scale: 0.97 }}
        animate   = {{ opacity: 1, scale: 1 }}
        exit      = {{ opacity: 0, scale: 0.97 }}
        className = "gradient-border p-4 flex flex-col gap-3 hover:border-indigo-500/30 transition-colors relative group"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpenIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <Link
              to        = {`/${repo.ownerUsername}/${repo.name}`}
              className = "font-semibold text-indigo-400 hover:underline truncate text-sm"
            >
              {repo.name}
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${
              repo.private
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/10  border-blue-500/20  text-blue-400'
            }`}>
              {repo.private
                ? <><LockClosedIcon className="w-2.5 h-2.5" />Private</>
                : <><GlobeAltIcon   className="w-2.5 h-2.5" />Public</>
              }
            </span>
            {/* Menu */}
            <div className="relative">
              <button
                onClick   = {(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className = "p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors opacity-0 group-hover:opacity-100"
              >
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial   = {{ opacity: 0, scale: 0.95, y: -4 }}
                    animate   = {{ opacity: 1, scale: 1,    y: 0  }}
                    exit      = {{ opacity: 0, scale: 0.95, y: -4 }}
                    className = "absolute right-0 top-7 z-50 w-40 bg-bg-card border border-[#2a2a3a] rounded-xl shadow-2xl overflow-hidden"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <Link
                      to        = {`/${repo.ownerUsername}/${repo.name}/settings`}
                      className = "flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                      onClick   = {() => setMenuOpen(false)}
                    >
                      <PencilIcon className="w-3.5 h-3.5" />Edit
                    </Link>
                    <button
                      onClick   = {() => { setMenuOpen(false); onDelete(repo); }}
                      className = "w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-text-muted line-clamp-2 flex-1">
          {repo.description || 'No description provided.'}
        </p>

        {/* Topics */}
        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 3).map((t) => (
              <span key={t} className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {t}
              </span>
            ))}
            {repo.topics.length > 3 && (
              <span className="text-[10px] text-text-muted">+{repo.topics.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 text-xs text-text-muted pt-1 border-t border-[#2a2a3a]">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <StarIcon className="w-3 h-3" />{starCount}
          </span>
          <span className="flex items-center gap-1">
            <ArrowPathIcon className="w-3 h-3" />{forkCount}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />{timeAgo(repo.updatedAt)}
          </span>
        </div>
      </motion.div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      layout
      initial   = {{ opacity: 0, y: 6 }}
      animate   = {{ opacity: 1, y: 0 }}
      exit      = {{ opacity: 0, y: -4 }}
      className = "gradient-border p-4 hover:border-indigo-500/30 transition-colors relative group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <BookOpenIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <Link
              to        = {`/${repo.ownerUsername}/${repo.name}`}
              className = "font-semibold text-indigo-400 hover:underline text-sm"
            >
              {repo.name}
            </Link>
            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${
              repo.private
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/10  border-blue-500/20  text-blue-400'
            }`}>
              {repo.private
                ? <><LockClosedIcon className="w-2.5 h-2.5" />Private</>
                : <><GlobeAltIcon   className="w-2.5 h-2.5" />Public</>
              }
            </span>
            {repo.fork     && <span className="badge badge-secondary text-[10px]">Fork</span>}
            {repo.archived && <span className="badge badge-error     text-[10px]">Archived</span>}
          </div>

          {/* Description */}
          {repo.description && (
            <p className="text-xs text-text-muted mb-2 line-clamp-1 max-w-2xl">
              {repo.description}
            </p>
          )}

          {/* Topics */}
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {repo.topics.slice(0, 5).map((t) => (
                <span key={t} className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  {t}
                </span>
              ))}
              {repo.topics.length > 5 && (
                <span className="text-[10px] text-text-muted self-center">+{repo.topics.length - 5}</span>
              )}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
            {repo.language && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <StarIcon className="w-3 h-3" />{starCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <ArrowPathIcon className="w-3 h-3" />{forkCount.toLocaleString()}
            </span>
            {repo.openIssues > 0 && (
              <span className="flex items-center gap-1">
                <ExclamationCircleIcon className="w-3 h-3" />{repo.openIssues} issues
              </span>
            )}
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />Updated {timeAgo(repo.updatedAt)}
            </span>
            <span className="text-[10px]">{formatSize(repo.size)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            to        = {`/${repo.ownerUsername}/${repo.name}`}
            className = "px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-bg-card hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs transition-colors"
          >
            View
          </Link>
          <div className="relative">
            <button
              onClick   = {(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className = "p-1.5 rounded-lg border border-transparent hover:border-[#2a2a3a] hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial   = {{ opacity: 0, scale: 0.95, y: -4 }}
                  animate   = {{ opacity: 1, scale: 1,    y: 0  }}
                  exit      = {{ opacity: 0, scale: 0.95, y: -4 }}
                  className = "absolute right-0 top-9 z-50 w-40 bg-bg-card border border-[#2a2a3a] rounded-xl shadow-2xl overflow-hidden"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link
                    to        = {`/${repo.ownerUsername}/${repo.name}/settings`}
                    className = "flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                    onClick   = {() => setMenuOpen(false)}
                  >
                    <PencilIcon className="w-3.5 h-3.5" />Settings
                  </Link>
                  <button
                    onClick   = {() => { setMenuOpen(false); onDelete(repo); }}
                    className = "w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// Delete Confirm Modal
// =============================================================================

const DeleteModal: React.FC<{
  repo    : Repository;
  onClose : () => void;
  onConfirm: () => void;
  loading : boolean;
}> = ({ repo, onClose, onConfirm, loading }) => {
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial   = {{ opacity: 0, scale: 0.95 }}
        animate   = {{ opacity: 1, scale: 1 }}
        exit      = {{ opacity: 0, scale: 0.95 }}
        className = "relative w-full max-w-md bg-bg-card border border-red-500/30 rounded-2xl p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <TrashIcon className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Delete repository</h3>
            <p className="text-xs text-text-muted">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          This will permanently delete <span className="font-semibold text-text-primary">{repo.name}</span>,
          its commits, issues, and all related data.
        </p>

        <p className="text-xs text-text-muted mb-2">
          Type <span className="font-mono text-red-400">{repo.name}</span> to confirm:
        </p>
        <input
          type        = "text"
          value       = {confirmText}
          onChange    = {(e) => setConfirmText(e.target.value)}
          placeholder = {repo.name}
          className   = "w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-[#2a2a3a] focus:border-red-500/50 text-text-primary text-sm outline-none mb-4 font-mono"
        />

        <div className="flex gap-2">
          <button
            onClick   = {onClose}
            className = "flex-1 py-2 rounded-lg border border-[#2a2a3a] bg-bg-tertiary text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick   = {onConfirm}
            disabled  = {confirmText !== repo.name || loading}
            className = "flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete repository'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// =============================================================================
// MyRepositoriesPage
// =============================================================================

const MyRepositoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') ?? '';

  // ── data state ──────────────────────────────────────────────────────────────
  const [repos,        setRepos       ] = useState<Repository[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [error,        setError       ] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Repository | null>(null);
  const [deleteLoading,setDeleteLoading] = useState(false);

  // ── filter / sort state ─────────────────────────────────────────────────────
  const [search,   setSearch  ] = useState('');
  const [filter,   setFilter  ] = useState<FilterType>('all');
  const [sort,     setSort    ] = useState<SortKey>('updated');
  const [view,     setView    ] = useState<ViewMode>('list');
  const [langFilter, setLangFilter] = useState<string>('');

  // ── fetch ────────────────────────────────────────────────────────────────────
  const fetchRepos = useCallback(async() => {
    setLoading(true);
    setError(null);
    
        try {
      /* 
        Backend: GET /api/repo/my
        Auth is handled via the JWT token in the request header,
        not via a username URL param — no username needed here.
        The api instance already attaches Authorization: Bearer <token>
        from your axios interceptor.
      */
      const { data } = await api.get(`/repos/my`);
      console.log(data)
      /* handle both shapes:
         { success: true, data: [...] }  ← paginated response
         [...]                           ← plain array          */
      const repos = Array.isArray(data) ? data : (data.data ?? []);
      setRepos(repos);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Could not load repositories.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  // ── delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/repositories/${username}/${deleteTarget.name}`);
      setRepos((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete repository');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, username]);

  // ── derived languages list ───────────────────────────────────────────────────
  const languages = useMemo(() => {
    const langs = new Set(repos.map((r) => r.language).filter(Boolean) as string[]);
    return Array.from(langs).sort();
  }, [repos]);

  // ── filtered + sorted repos ──────────────────────────────────────────────────
  const displayedRepos = useMemo(() => {
    let list = [...repos];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.topics.some((t) => t.toLowerCase().includes(q))
      );
    }

    // type filter
    switch (filter) {
      case 'public':   list = list.filter((r) => !r.private);  break;
      case 'private':  list = list.filter((r) =>  r.private);  break;
      case 'forked':   list = list.filter((r) =>  r.fork);     break;
      case 'archived': list = list.filter((r) =>  r.archived); break;
    }

    // language filter
    if (langFilter) {
      list = list.filter((r) => r.language?.toLowerCase() === langFilter.toLowerCase());
    }

    // sort
    list.sort((a, b) => {
      switch (sort) {
        case 'name':    return a.name.localeCompare(b.name);
        case 'stars':   return count(b.stars)   - count(a.stars);
        case 'forks':   return count(b.forks)   - count(a.forks);
        case 'created': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [repos, search, filter, langFilter, sort]);

  // ── stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total    : repos.length,
    public   : repos.filter((r) => !r.private).length,
    private  : repos.filter((r) =>  r.private).length,
    totalStars: repos.reduce((acc, r) => acc + count(r.stars), 0),
    totalForks: repos.reduce((acc, r) => acc + count(r.forks), 0),
  }), [repos]);

  // =============================================================================

  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <Link to={`/${username}`} className="hover:text-indigo-400 transition-colors">
                {username}
              </Link>
              <span>/</span>
              <span className="text-text-primary font-medium">Repositories</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Your Repositories</h1>
            <p className="text-text-muted text-sm mt-1">
              Manage all your repositories in one place.
            </p>
          </div>
          <Link
            to        = "/new"
            className = "flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Repository
          </Link>
        </div>

        {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
        {!loading && !error && (
          <motion.div
            initial   = {{ opacity: 0, y: 6 }}
            animate   = {{ opacity: 1, y: 0 }}
            className = "grid grid-cols-2 sm:grid-cols-5 gap-3"
          >
            {[
              { label: 'Total',       value: stats.total,       color: 'text-text-primary'  },
              { label: 'Public',      value: stats.public,      color: 'text-blue-400'      },
              { label: 'Private',     value: stats.private,     color: 'text-yellow-400'    },
              { label: 'Total Stars', value: stats.totalStars,  color: 'text-yellow-300'    },
              { label: 'Total Forks', value: stats.totalForks,  color: 'text-indigo-400'    },
            ].map((s) => (
              <div key={s.label} className="gradient-border p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Search + Filters ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type        = "text"
              placeholder = "Find a repository…"
              value       = {search}
              onChange    = {(e) => setSearch(e.target.value)}
              className   = "w-full pl-9 pr-4 py-2 rounded-xl bg-bg-card border border-[#2a2a3a] focus:border-indigo-500/50 text-text-primary text-sm placeholder:text-text-muted outline-none transition-colors"
            />
            {search && (
              <button
                onClick   = {() => setSearch('')}
                className = "absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type filter */}
            <div className="flex rounded-lg border border-[#2a2a3a] overflow-hidden text-xs">
              {(['all', 'public', 'private', 'forked', 'archived'] as FilterType[]).map((f) => (
                <button
                  key       = {f}
                  onClick   = {() => setFilter(f)}
                  className = {`px-3 py-1.5 capitalize transition-colors ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Language filter */}
            {languages.length > 0 && (
              <select
                value     = {langFilter}
                onChange  = {(e) => setLangFilter(e.target.value)}
                className = "px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-bg-card text-text-secondary text-xs focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="">All languages</option>
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value     = {sort}
              onChange  = {(e) => setSort(e.target.value as SortKey)}
              className = "px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-bg-card text-text-secondary text-xs focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="updated">Last updated</option>
              <option value="created">Newest</option>
              <option value="name">Name</option>
              <option value="stars">Most stars</option>
              <option value="forks">Most forks</option>
            </select>

            {/* View toggle */}
            <div className="flex rounded-lg border border-[#2a2a3a] overflow-hidden ml-auto">
              <button
                onClick   = {() => setView('list')}
                className = {`p-1.5 transition-colors ${
                  view === 'list' ? 'bg-indigo-600 text-white' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                }`}
                title="List view"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
              <button
                onClick   = {() => setView('grid')}
                className = {`p-1.5 transition-colors ${
                  view === 'grid' ? 'bg-indigo-600 text-white' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                }`}
                title="Grid view"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active filters */}
          {(search || filter !== 'all' || langFilter) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted flex items-center gap-1">
                <FunnelIcon className="w-3 h-3" />
                {displayedRepos.length} result{displayedRepos.length !== 1 ? 's' : ''}
              </span>
              {filter !== 'all' && (
                <button
                  onClick   = {() => setFilter('all')}
                  className = "flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                >
                  {filter}<XMarkIcon className="w-3 h-3" />
                </button>
              )}
              {langFilter && (
                <button
                  onClick   = {() => setLangFilter('')}
                  className = "flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                >
                  {langFilter}<XMarkIcon className="w-3 h-3" />
                </button>
              )}
              {search && (
                <button
                  onClick   = {() => setSearch('')}
                  className = "flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                >
                  "{search}"<XMarkIcon className="w-3 h-3" />
                </button>
              )}
              <button
                onClick   = {() => { setSearch(''); setFilter('all'); setLangFilter(''); }}
                className = "text-xs text-text-muted hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {Array.from({ length: 8 }).map((_, i) => (
              <RepoCardSkeleton key={i} view={view} />
            ))}
          </div>
        ) : error ? (
          <div className="gradient-border p-12 text-center">
            <ExclamationCircleIcon className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-text-primary font-semibold mb-1">Failed to load repositories</h3>
            <p className="text-text-muted text-sm mb-4">{error}</p>
            <button
              onClick   = {fetchRepos}
              className = "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        ) : displayedRepos.length === 0 ? (
          <motion.div
            initial   = {{ opacity: 0, y: 8 }}
            animate   = {{ opacity: 1, y: 0 }}
            className = "gradient-border p-12 text-center"
          >
            <CodeBracketIcon className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="text-text-primary font-semibold mb-1">
              {search || filter !== 'all' || langFilter
                ? 'No repositories match your filters'
                : "You don't have any repositories yet"
              }
            </h3>
            <p className="text-text-muted text-sm mb-4">
              {search || filter !== 'all' || langFilter
                ? 'Try adjusting your search or filters.'
                : 'Create your first repository to get started.'
              }
            </p>
            {!search && filter === 'all' && !langFilter && (
              <Link
                to        = "/new"
                className = "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Create repository
              </Link>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div className={
              view === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }>
              {displayedRepos.map((repo) => (
                <RepoCard
                  key      = {repo._id}
                  repo     = {repo}
                  view     = {view}
                  onDelete = {setDeleteTarget}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Delete Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            repo      = {deleteTarget}
            onClose   = {() => setDeleteTarget(null)}
            onConfirm = {handleDelete}
            loading   = {deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyRepositoriesPage;