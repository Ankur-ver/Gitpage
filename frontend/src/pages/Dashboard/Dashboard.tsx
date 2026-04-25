import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  StarIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  FolderIcon,
  LockClosedIcon,
  GlobeAltIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  FunnelIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import ContributionGraph from '../../components/Dashboard/ContributionGraph';
import ActivityFeed from '../../components/Dashboard/ActivityFeed';
import api from '../../services/api';
import { AIAnalysis, Repository } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getLanguageColor } from '../../utils/helpers';
import { timeAgo } from '../../utils/formatDate';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

type Tab = 'overview' | 'repositories' | 'projects' | 'packages' | 'stars';

interface RepoItem {
  _id: string;
  name: string;
  fullName?: string;
  description: string;
  language: string | null;
  stars: number | any[];
  forks: number | any[];
  private: boolean;
  fork: boolean;
  archived: boolean;
  topics: string[];
  updatedAt: string;
  createdAt: string;
  openIssues: number;
  size: number;
  owner: string | { username?: string; _id?: string };
  ownerUsername: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'open' | 'closed';
  updatedAt: string;
  items: number;
  repo?: string;
}

type DashboardAnalysisState = {
  analyses: AIAnalysis[];
  loading: boolean;
  error: string;
};

type DashboardStats = {
  commits: number;
  prsMerged: number;
  issuesClosed: number;
  codeReviews: number;
};
interface ProfileInsight {
  id: string;
  category: 'profile' | 'project' | 'techstack' | 'activity' | 'collaboration';
  severity: 'info' | 'suggestion' | 'improvement' | 'critical';
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
  tags?: string[];
  icon?: string;
}

interface AIInsightsData {
  insights: ProfileInsight[];
  profileScore: number;
  generatedAt: string;
  cached: boolean;
}

type SortKey = 'updated' | 'name' | 'stars' | 'forks' | 'created';

// =============================================================================
// Helpers
// =============================================================================

const countVal = (val: number | any[]): number =>
  Array.isArray(val) ? val.length : (val ?? 0);

const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// =============================================================================
// Skeleton helpers
// =============================================================================

const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#2a2a3a] rounded ${className}`} />
);

// =============================================================================
// Sub-components
// =============================================================================

// ── RepoCard (shared by Overview / Repositories / Stars) ──────────────────────

const RepoCard: React.FC<{
  repo: RepoItem;
  username: string;
  showOwner?: boolean;
}> = ({ repo, username, showOwner = false }) => {
  const stars = countVal(repo.stars);
  const forks = countVal(repo.forks);
  const owner = showOwner
    ? (typeof repo.owner === 'string' ? repo.owner : repo.owner?.username ?? repo.ownerUsername ?? username)
    : username;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="gradient-border p-4 hover:border-indigo-500/30 transition-colors group"
    >
      {/* Title */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpenIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <Link
            to={`/${owner}/${repo.name}`}
            className="font-semibold text-indigo-400 hover:underline text-sm truncate"
          >
            {showOwner ? `${owner}/${repo.name}` : repo.name}
          </Link>
          <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border shrink-0 ${repo.private
              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              : 'bg-blue-500/10  border-blue-500/20  text-blue-400'
            }`}>
            {repo.private
              ? <><LockClosedIcon className="w-2.5 h-2.5" />Private</>
              : <><GlobeAltIcon className="w-2.5 h-2.5" />Public</>}
          </span>
          {repo.fork && <span className="badge badge-secondary text-[10px] shrink-0">Fork</span>}
          {repo.archived && <span className="badge badge-error text-[10px] shrink-0">Archived</span>}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-text-muted mb-2 line-clamp-2">
        {repo.description || 'No description provided.'}
      </p>

      {/* Topics */}
      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {repo.topics.slice(0, 4).map((t) => (
            <span key={t} className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {t}
            </span>
          ))}
          {repo.topics.length > 4 && (
            <span className="text-[10px] text-text-muted self-center">+{repo.topics.length - 4}</span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: getLanguageColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <StarIcon className="w-3 h-3" />{stars.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <ArrowPathIcon className="w-3 h-3" />{forks.toLocaleString()}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />Updated {timeAgo(repo.updatedAt)}
        </span>
      </div>
    </motion.div>
  );
};

// ── ProjectCard ───────────────────────────────────────────────────────────────

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="gradient-border p-4 hover:border-indigo-500/30 transition-colors"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <FolderIcon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-text-primary text-sm">{project.name}</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full border capitalize ${project.status === 'open'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-[#2a2a3a] border-[#3a3a4a] text-text-muted'
              }`}>
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-text-muted line-clamp-1 mb-1">{project.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{project.items} items</span>
            {project.repo && (
              <Link to={`/${project.repo}`} className="text-indigo-400 hover:underline">{project.repo}</Link>
            )}
            <span>Updated {timeAgo(project.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}> = ({ icon, title, message, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="gradient-border p-12 text-center col-span-full"
  >
    <div className="flex justify-center mb-3 text-text-muted">{icon}</div>
    <h3 className="text-text-primary font-semibold mb-1">{title}</h3>
    <p className="text-text-muted text-sm mb-4">{message}</p>
    {action}
  </motion.div>
);

// =============================================================================
// Dashboard
// =============================================================================

const Dashboard: React.FC = () => {
  const { user } = useSelector((s: RootState) => s.auth);
  const username = user?.username ?? '';

  const [tab, setTab] = useState<Tab>('overview');
  const [contributionCount, setContributionCount] = useState<number | null>(null);

  // ── repos ──────────────────────────────────────────────────────────────────
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState('');

  // ── starred repos ──────────────────────────────────────────────────────────
  const [stars, setStars] = useState<RepoItem[]>([]);
  const [starsLoading, setStarsLoading] = useState(false);
  const [starsError, setStarsError] = useState('');
  const [starsFetched, setStarsFetched] = useState(false);

  // ── projects ───────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [projectsFetched, setProjectsFetched] = useState(false);

  // ── AI insights ────────────────────────────────────────────────────────────
  const [insightsData, setInsightsData] = useState<AIInsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [insightsFetched, setInsightsFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)

  // ── quick stats ────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats>({ commits: 0, prsMerged: 0, issuesClosed: 0, codeReviews: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  // ── repo filters (for Repositories tab) ───────────────────────────────────
  const [repoSearch, setRepoSearch] = useState('');
  const [repoFilter, setRepoFilter] = useState<'all' | 'public' | 'private' | 'forked' | 'archived'>('all');
  const [repoSort, setRepoSort] = useState<SortKey>('updated');
  const [repoLang, setRepoLang] = useState('');

  // ── star filters ──────────────────────────────────────────────────────────
  const [starSearch, setStarSearch] = useState('');
  const [starSort, setStarSort] = useState<SortKey>('updated');

  // ==========================================================================
  // Fetch functions
  // ==========================================================================

  const fetchRepos = useCallback(async () => {
    setReposLoading(true);
    setReposError('');
    try {
      const { data } = await api.get('/repos/my');
      const list: RepoItem[] = Array.isArray(data) ? data : (data.data ?? []);
      setRepos(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not load repositories.';
      setReposError(msg);
    } finally {
      setReposLoading(false);
    }
  }, []);

  const fetchStars = useCallback(async () => {
    if (starsLoading || starsFetched) return;
    setStarsLoading(true);
    setStarsError('');
    try {
      const { data } = await api.get(`/users/${username}/starred`);
      const list: RepoItem[] = Array.isArray(data) ? data : (data.data ?? []);
      setStars(list);
      setStarsFetched(true);
    } catch (err: any) {
      setStarsError(err?.response?.data?.message ?? 'Could not load starred repos.');
    } finally {
      setStarsLoading(false);
    }
  }, [username, starsLoading, starsFetched]);

  const fetchProjects = useCallback(async () => {
    if (projectsLoading || projectsFetched) return;
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const { data } = await api.get('/projects');
      const list: Project[] = Array.isArray(data) ? data : (data.data ?? []);
      setProjects(list);
      setProjectsFetched(true);
    } catch (err: any) {
      setProjectsError(err?.response?.data?.message ?? 'Could not load projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, [projectsLoading, projectsFetched]);

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    if (!username) return;
    if (insightsFetched && !forceRefresh) return;

    if (forceRefresh) {
      setRefreshing(true);
      try { await api.post('/ai/insights/refresh'); } catch { }
    }

    setInsightsLoading(true);
    setInsightsError('');

    try {
      const { data } = await api.get<AIInsightsData>('/ai/insights/dashboard');
      setInsightsData(data);
      setInsightsFetched(true);
    } catch (err: any) {
      setInsightsError(err?.response?.data?.message ?? 'Could not load AI insights.');
    } finally {
      setInsightsLoading(false);
      setRefreshing(false);
    }
  }, [username, insightsFetched]);

  const fetchStats = useCallback(async () => {
    if (!username) return;
    setStatsLoading(true);
    try {
      const { data } = await api.get<DashboardStats>('/stats/dashboard');
      setStats(data);
    } catch (err: any) {
      setStatsError(err?.response?.data?.message ?? 'Could not load quick stats.');
    } finally {
      setStatsLoading(false);
    }
  }, [username]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Initial load
  useEffect(() => {
    fetchRepos();
    fetchInsights();
    fetchStats();
  }, [fetchRepos, fetchInsights, fetchStats]);

  // Lazy-load tabs
  useEffect(() => {
    if (tab === 'stars' && !starsFetched) fetchStars();
    if (tab === 'projects' && !projectsFetched) fetchProjects();
  }, [tab, starsFetched, projectsFetched, fetchStars, fetchProjects]);

  // ==========================================================================
  // Derived data
  // ==========================================================================

  const repoLanguages = useMemo(() =>
    Array.from(new Set(repos.map((r) => r.language).filter(Boolean) as string[])).sort()
    , [repos]);

  const filteredRepos = useMemo(() => {
    let list = [...repos];
    const q = repoSearch.trim().toLowerCase();
    if (q) list = list.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.topics?.some((t) => t.toLowerCase().includes(q))
    );
    switch (repoFilter) {
      case 'public': list = list.filter((r) => !r.private); break;
      case 'private': list = list.filter((r) => r.private); break;
      case 'forked': list = list.filter((r) => r.fork); break;
      case 'archived': list = list.filter((r) => r.archived); break;
    }
    if (repoLang) list = list.filter((r) => r.language?.toLowerCase() === repoLang.toLowerCase());
    list.sort((a, b) => {
      switch (repoSort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'stars': return countVal(b.stars) - countVal(a.stars);
        case 'forks': return countVal(b.forks) - countVal(a.forks);
        case 'created': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return list;
  }, [repos, repoSearch, repoFilter, repoSort, repoLang]);

  const filteredStars = useMemo(() => {
    let list = [...stars];
    const q = starSearch.trim().toLowerCase();
    if (q) list = list.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
    list.sort((a, b) => {
      switch (starSort) {
        case 'stars': return countVal(b.stars) - countVal(a.stars);
        case 'name': return a.name.localeCompare(b.name);
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return list;
  }, [stars, starSearch, starSort]);

  const repoCount = repos.length || user?.publicRepos || 0;
  const totalStarred = stars.length;
  const followerCount = user?.followers ?? 0;
  const followingCount = user?.following ?? 0;

  const tabDefs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'repositories', label: 'Repositories', count: repoCount },
    { id: 'projects', label: 'Projects', count: projectsFetched ? projects.length : undefined },
    { id: 'packages', label: 'Packages' },
    { id: 'stars', label: 'Stars', count: starsFetched ? totalStarred : undefined },
  ];

  // ==========================================================================
  // Render helpers
  // ==========================================================================

  const renderRepoSkeleton = (n = 4) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="gradient-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skel className="w-4 h-4 rounded" />
            <Skel className="w-32 h-4" />
            <Skel className="w-14 h-4 rounded-full" />
          </div>
          <Skel className="w-3/4 h-3" />
          <div className="flex gap-3">
            <Skel className="w-16 h-3" />
            <Skel className="w-10 h-3" />
            <Skel className="w-10 h-3" />
          </div>
        </div>
      ))}
    </div>
  );

  // ==========================================================================
  // Tab content
  // ==========================================================================

  const tabContent: Record<Tab, React.ReactNode> = {

    // ── Overview ─────────────────────────────────────────────────────────────
    overview: (
      <motion.div
        key="overview"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        {/* Pinned / Popular repos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary text-sm">Popular repositories</h3>
            <Link
              to="/new"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />New
            </Link>
          </div>
          {reposLoading ? renderRepoSkeleton(4)
            : reposError ? (
              <p className="text-sm text-red-400">{reposError}</p>
            ) : repos.length === 0 ? (
              <EmptyState
                icon={<CodeBracketIcon className="w-8 h-8" />}
                title="No repositories yet"
                message="Create your first repository to get started."
                action={
                  <Link to="/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                    <PlusIcon className="w-4 h-4" />Create repository
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...repos]
                  .sort((a, b) => countVal(b.stars) - countVal(a.stars))
                  .slice(0, 6)
                  .map((repo) => (
                    <RepoCard key={repo._id} repo={repo} username={username} />
                  ))}
              </div>
            )}
        </div>

        {/* Activity */}
        <div>
          <h3 className="font-semibold text-text-primary text-sm mb-3">Recent activity</h3>
          <ActivityFeed />
        </div>
      </motion.div>
    ),

    // ── Repositories ─────────────────────────────────────────────────────────
    repositories: (
      <motion.div
        key="repositories"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-4"
      >
        {/* Stats */}
        {!reposLoading && !reposError && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: repos.length, color: 'text-text-primary' },
              { label: 'Public', value: repos.filter((r) => !r.private).length, color: 'text-blue-400' },
              { label: 'Private', value: repos.filter((r) => r.private).length, color: 'text-yellow-400' },
              { label: 'Stars', value: repos.reduce((a, r) => a + countVal(r.stars), 0), color: 'text-yellow-300' },
            ].map((s) => (
              <div key={s.label} className="gradient-border p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Find a repository…"
            value={repoSearch}
            onChange={(e) => setRepoSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-card border border-[#2a2a3a] focus:border-indigo-500/50 text-text-primary text-sm placeholder:text-text-muted outline-none"
          />
          {repoSearch && (
            <button onClick={() => setRepoSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-[#2a2a3a] overflow-hidden text-xs">
            {(['all', 'public', 'private', 'forked', 'archived'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setRepoFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${repoFilter === f ? 'bg-indigo-600 text-white' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
              >{f}</button>
            ))}
          </div>

          {repoLanguages.length > 0 && (
            <select
              value={repoLang}
              onChange={(e) => setRepoLang(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-bg-card text-text-secondary text-xs outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="">All languages</option>
              {repoLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          <select
            value={repoSort}
            onChange={(e) => setRepoSort(e.target.value as SortKey)}
            className="px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-bg-card text-text-secondary text-xs outline-none focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="updated">Last updated</option>
            <option value="created">Newest</option>
            <option value="name">Name</option>
            <option value="stars">Most stars</option>
            <option value="forks">Most forks</option>
          </select>

          <Link
            to="/new"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />New
          </Link>
        </div>

        {/* Active filter chips */}
        {(repoSearch || repoFilter !== 'all' || repoLang) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <FunnelIcon className="w-3 h-3" />{filteredRepos.length} result{filteredRepos.length !== 1 ? 's' : ''}
            </span>
            {repoFilter !== 'all' && (
              <button onClick={() => setRepoFilter('all')} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {repoFilter}<XMarkIcon className="w-3 h-3" />
              </button>
            )}
            {repoLang && (
              <button onClick={() => setRepoLang('')} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {repoLang}<XMarkIcon className="w-3 h-3" />
              </button>
            )}
            {repoSearch && (
              <button onClick={() => setRepoSearch('')} className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                "{repoSearch}"<XMarkIcon className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => { setRepoSearch(''); setRepoFilter('all'); setRepoLang(''); }}
              className="text-xs text-text-muted hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* List */}
        {reposLoading ? renderRepoSkeleton(6)
          : reposError ? (
            <div className="gradient-border p-8 text-center">
              <ExclamationCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-text-muted text-sm mb-3">{reposError}</p>
              <button onClick={fetchRepos} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                Retry
              </button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <EmptyState
              icon={<CodeBracketIcon className="w-8 h-8" />}
              title={repoSearch || repoFilter !== 'all' || repoLang ? 'No matching repositories' : 'No repositories yet'}
              message={repoSearch || repoFilter !== 'all' || repoLang ? 'Try adjusting your filters.' : 'Create your first repository to get started.'}
              action={
                !repoSearch && repoFilter === 'all' && !repoLang
                  ? <Link to="/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"><PlusIcon className="w-4 h-4" />Create repository</Link>
                  : undefined
              }
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filteredRepos.map((repo) => (
                  <RepoCard key={repo._id} repo={repo} username={username} />
                ))}
              </div>
            </AnimatePresence>
          )}
      </motion.div>
    ),

    // ── Projects ─────────────────────────────────────────────────────────────
    projects: (
      <motion.div
        key="projects"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary text-sm">Your Projects</h3>
          <button
            onClick={() => toast('Create project — coming soon!')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />New Project
          </button>
        </div>

        {projectsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="gradient-border p-4 space-y-2">
                <div className="flex items-center gap-2"><Skel className="w-5 h-5 rounded" /><Skel className="w-36 h-4" /><Skel className="w-14 h-4 rounded-full" /></div>
                <Skel className="w-2/3 h-3" />
                <div className="flex gap-3"><Skel className="w-16 h-3" /><Skel className="w-24 h-3" /></div>
              </div>
            ))}
          </div>
        ) : projectsError ? (
          <div className="gradient-border p-8 text-center">
            <ExclamationCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-text-muted text-sm">{projectsError}</p>
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderIcon className="w-8 h-8" />}
            title="No projects yet"
            message="Create a project to plan and track work across your repositories."
            action={
              <button
                onClick={() => toast('Create project — coming soon!')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
              >
                <PlusIcon className="w-4 h-4" />Create your first project
              </button>
            }
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
            </div>
          </AnimatePresence>
        )}
      </motion.div>
    ),

    // ── Packages ─────────────────────────────────────────────────────────────
    packages: (
      <motion.div
        key="packages"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
      >
        <EmptyState
          icon={<ArchiveBoxIcon className="w-8 h-8" />}
          title="No packages published"
          message="Packages you publish will appear here."
        />
      </motion.div>
    ),

    // ── Stars ─────────────────────────────────────────────────────────────────
    stars: (
      <motion.div
        key="stars"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-4"
      >
        {/* Stats */}
        {!starsLoading && !starsError && starsFetched && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total Starred', value: stars.length, color: 'text-yellow-300' },
              { label: 'Languages', value: new Set(stars.map((r) => r.language).filter(Boolean)).size, color: 'text-indigo-400' },
              { label: 'Total Stars', value: stars.reduce((a, r) => a + countVal(r.stars), 0), color: 'text-text-primary' },
            ].map((s) => (
              <div key={s.label} className="gradient-border p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search starred repositories…"
              value={starSearch}
              onChange={(e) => setStarSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-card border border-[#2a2a3a] focus:border-indigo-500/50 text-text-primary text-sm placeholder:text-text-muted outline-none"
            />
            {starSearch && (
              <button onClick={() => setStarSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={starSort}
            onChange={(e) => setStarSort(e.target.value as SortKey)}
            className="px-3 py-2 rounded-xl border border-[#2a2a3a] bg-bg-card text-text-secondary text-xs outline-none focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="updated">Recently starred</option>
            <option value="stars">Most stars</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* List */}
        {starsLoading ? renderRepoSkeleton(4)
          : starsError ? (
            <div className="gradient-border p-8 text-center">
              <ExclamationCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-text-muted text-sm mb-3">{starsError}</p>
              <button onClick={fetchStars} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                Retry
              </button>
            </div>
          ) : filteredStars.length === 0 ? (
            <EmptyState
              icon={<StarSolid className="w-8 h-8 text-text-muted" />}
              title={starSearch ? 'No results found' : "You haven't starred any repositories"}
              message={starSearch ? 'Try a different search.' : 'Star repositories you want to keep track of.'}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filteredStars.map((repo) => (
                  <RepoCard
                    key={repo._id}
                    repo={repo}
                    username={username}
                    showOwner={true}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
      </motion.div>
    ),
  };

  // ==========================================================================
  // Main render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Left Sidebar ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-border p-5"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-glow">
                {username.slice(0, 2).toUpperCase() || 'GP'}
              </div>
              <div>
                <h2 className="font-bold text-lg text-text-primary">{username || 'Developer'}</h2>
                <p className="text-text-muted text-sm">@{username || 'user'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge badge-success">Pro</span>
                  <span className="badge badge-primary">AI Beta</span>
                </div>
              </div>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              {user?.bio || 'Full-stack developer building awesome things ✨'}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Repos', value: repoCount, onClick: () => setTab('repositories') },
                { label: 'Followers', value: followerCount, onClick: undefined },
                { label: 'Following', value: followingCount, onClick: undefined },
              ].map((s) => (
                <div
                  key={s.label}
                  onClick={s.onClick}
                  className={`bg-bg-tertiary rounded-lg p-2 ${s.onClick ? 'cursor-pointer hover:bg-bg-card transition-colors' : ''}`}
                >
                  <p className="font-bold text-text-primary">{s.value}</p>
                  <p className="text-xs text-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <Link
              to="/settings"
              className="mt-4 w-full block text-center py-2 rounded-lg border border-[#2a2a3a] text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Edit profile
            </Link>
          </motion.div>

          {/* AI Insights */}
          {/* ── AI Insights ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="gradient-border overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#2a2a3a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-text-primary text-sm">AI Insights</h3>
                {insightsData?.cached && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-[#2a2a3a]">
                    cached
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {insightsData && (
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${insightsData.profileScore >= 75 ? 'bg-green-400' :
                        insightsData.profileScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                    <span className="text-[10px] text-text-muted font-mono">
                      {insightsData.profileScore}%
                    </span>
                  </div>
                )}
                <button
                  onClick={() => fetchInsights(true)}
                  disabled={refreshing || insightsLoading}
                  className="p-1 rounded text-text-muted hover:text-indigo-400 transition-colors disabled:opacity-50"
                  title="Refresh insights"
                >
                  <ArrowPathIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Profile Score Bar */}
            {insightsData && (
              <div className="px-4 py-2 border-b border-[#2a2a3a] bg-bg-tertiary/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-text-muted">Profile strength</span>
                  <span className="text-[10px] font-semibold text-text-primary">
                    {insightsData.profileScore >= 75 ? 'Strong' :
                      insightsData.profileScore >= 50 ? 'Good' : 'Needs work'}
                  </span>
                </div>
                <div className="h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insightsData.profileScore}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className={`h-full rounded-full ${insightsData.profileScore >= 75 ? 'bg-green-400' :
                        insightsData.profileScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                  />
                </div>
              </div>
            )}

            {/* Insights List */}
            <div className="divide-y divide-[#2a2a3a] max-h-[420px] overflow-y-auto">
              {insightsLoading ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span className="text-xs text-text-muted">Analyzing your profile with AI…</span>
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skel className="w-5 h-5 rounded" />
                        <Skel className="w-28 h-3" />
                        <Skel className="w-14 h-3 rounded-full ml-auto" />
                      </div>
                      <Skel className="w-full h-3" />
                      <Skel className="w-3/4 h-3" />
                    </div>
                  ))}
                </div>
              ) : insightsError ? (
                <div className="p-4 text-center">
                  <ExclamationCircleIcon className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-xs text-red-400 mb-2">{insightsError}</p>
                  <button
                    onClick={() => fetchInsights(true)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : !insightsData || insightsData.insights.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-text-muted">No insights available yet.</p>
                </div>
              ) : (
                insightsData.insights.map((insight) => {
                  const isExpanded = expandedInsight === insight.id;

                  const severityStyle: Record<string, string> = {
                    critical: 'border-l-red-500    bg-red-500/5',
                    improvement: 'border-l-yellow-500 bg-yellow-500/5',
                    suggestion: 'border-l-indigo-500 bg-indigo-500/5',
                    info: 'border-l-blue-500   bg-blue-500/5',
                  };

                  const severityBadge: Record<string, string> = {
                    critical: 'bg-red-500/10    border-red-500/20    text-red-400',
                    improvement: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                    suggestion: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
                    info: 'bg-blue-500/10   border-blue-500/20   text-blue-400',
                  };

                  const categoryIcon: Record<string, string> = {
                    profile: '👤',
                    project: '🚀',
                    techstack: '⚡',
                    activity: '📊',
                    collaboration: '🤝',
                  };

                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 border-l-2 cursor-pointer transition-colors hover:bg-bg-tertiary/50 ${severityStyle[insight.severity] ?? severityStyle.info
                        }`}
                      onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                    >
                      <div className="flex items-start gap-2">
                        {/* Icon */}
                        <span className="text-base shrink-0 mt-0.5">
                          {insight.icon ?? categoryIcon[insight.category] ?? '💡'}
                        </span>

                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-text-primary leading-tight">
                              {insight.title}
                            </p>
                            <span className={`shrink-0 px-1.5 py-0.5 text-[9px] rounded-full border capitalize ${severityBadge[insight.severity] ?? severityBadge.info
                              }`}>
                              {insight.severity}
                            </span>
                          </div>

                          {/* Message — collapsed to 2 lines, expanded on click */}
                          <p className={`text-[11px] text-text-muted leading-relaxed ${isExpanded ? '' : 'line-clamp-2'
                            }`}>
                            {insight.message}
                          </p>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                {/* Tags */}
                                {insight.tags && insight.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {insight.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-1.5 py-0.5 text-[9px] rounded bg-bg-tertiary border border-[#2a2a3a] text-text-muted font-mono"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Action button */}
                                {insight.action && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (insight.actionUrl) {
                                        window.open(insight.actionUrl, '_blank');
                                      } else {
                                        toast(insight.action ?? 'Coming soon!');
                                      }
                                    }}
                                    className="mt-2 flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                  >
                                    <SparklesIcon className="w-3 h-3" />
                                    {insight.action} →
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#2a2a3a] space-y-2">
              {insightsData && (
                <p className="text-[10px] text-text-muted text-center">
                  Generated {new Date(insightsData.generatedAt).toLocaleTimeString()} ·{' '}
                  <button
                    onClick={() => fetchInsights(true)}
                    className="text-indigo-400 hover:underline"
                  >
                    Refresh
                  </button>
                </p>
              )}
              <Link
                to="/ai-dashboard"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
              >
                <SparklesIcon className="w-4 h-4" />
                Open AI Dashboard
              </Link>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="gradient-border p-4"
          >
            <h3 className="font-semibold text-text-primary text-sm mb-3 flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-yellow-400" />This Week
            </h3>
            <div className="space-y-3">
              {statsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skel className="w-24 h-3" /><Skel className="w-16 h-3" />
                    </div>
                  ))}
                </div>
              ) : statsError ? (
                <p className="text-xs text-red-400">{statsError}</p>
              ) : (
                [
                  { label: 'Commits', value: stats.commits, trend: '+12%', up: true },
                  { label: 'PRs merged', value: stats.prsMerged, trend: '+3', up: true },
                  { label: 'Issues closed', value: stats.issuesClosed, trend: '+5', up: true },
                  { label: 'Code reviews', value: stats.codeReviews, trend: '-2', up: false },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{s.value}</span>
                      <span className={`text-xs ${s.up ? 'text-green-400' : 'text-red-400'}`}>{s.trend}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* ─── Right Column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contribution Graph */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="gradient-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">
                <span className="text-indigo-400">{contributionCount ?? 0}</span> contributions in the last year
              </h3>
              <select className="text-xs bg-bg-tertiary border border-[#2a2a3a] rounded-lg px-2 py-1 text-text-secondary outline-none">
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            <ContributionGraph username={username || undefined} onTotalChange={setContributionCount} />
          </motion.div>

          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-[#2a2a3a] overflow-x-auto scrollbar-none">
            {tabDefs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm capitalize whitespace-nowrap border-b-2 transition-all ${tab === t.id
                    ? 'border-indigo-500 text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className="badge badge-primary text-[10px]">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {tabContent[tab]}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;