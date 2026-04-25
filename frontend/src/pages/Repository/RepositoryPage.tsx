import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence }                from 'framer-motion';
import { useParams, Link, useNavigate }           from 'react-router-dom';
import {
  StarIcon,
  EyeIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  BoltIcon,
  ArrowDownTrayIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ScaleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

import FileExplorer   from '../../components/Repository/FileExplorer';
import CodeViewer     from '../../components/Repository/CodeViewer';
import CommitHistory  from '../../components/Repository/CommitHistory';
import BranchSelector from '../../components/Repository/BranchSelector';
import AIInsights     from '../../components/AI/AIInsights';
import AIAssistant    from '../../components/AI/AIAssistant';
import AICodeReview   from '../../components/AI/AICodeReview';

import { useRepoPageData, useFileContent } from '../../hooks/useRepo';
import api from '../../services/api';

import {
  RepositoryTab,
  CodeView,
  RepositoryTabConfig,
  UserSummary,
  Repository,
  FileNode,
} from '../../types';

import toast from 'react-hot-toast';

// =============================================================================
// Sub-components (UNCHANGED)
// =============================================================================

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#2a2a3a] rounded ${className}`} />
);

const RepositorySkeleton: React.FC = () => (
  <div className="min-h-screen bg-bg-primary pt-14">
    <div className="border-b border-[#2a2a3a] bg-bg-secondary">
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="w-4 h-4" />
            <SkeletonBlock className="w-24 h-4" />
            <SkeletonBlock className="w-2 h-4" />
            <SkeletonBlock className="w-32 h-5" />
            <SkeletonBlock className="w-16 h-5 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="w-24 h-8 rounded-lg" />
            ))}
          </div>
        </div>
        <SkeletonBlock className="w-96 h-4" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="w-16 h-5 rounded-full" />
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="w-24 h-9 rounded" />
          ))}
        </div>
      </div>
    </div>
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <SkeletonBlock className="w-32 h-8 rounded-lg" />
          <SkeletonBlock className="w-40 h-8 rounded-lg" />
        </div>
        <SkeletonBlock className="w-24 h-8 rounded-lg" />
      </div>
      <SkeletonBlock className="w-full h-12 rounded-xl" />
      <div className="space-y-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} className="w-full h-10 rounded" />
        ))}
      </div>
    </div>
  </div>
);

interface RepositoryErrorProps {
  message  : string;
  username?: string;
  onRetry  : () => void;
}

const RepositoryError: React.FC<RepositoryErrorProps> = ({ message, username, onRetry }) => (
  <div className="min-h-screen bg-bg-primary pt-14 flex items-center justify-center">
    <div className="text-center max-w-md px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20
                      flex items-center justify-center mx-auto mb-4">
        <ExclamationCircleIcon className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Repository not found</h2>
      <p className="text-text-muted text-sm mb-6">{message}</p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to        = {username ? `/${username}` : '/'}
          className = "flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-card border border-[#2a2a3a] text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          {username ? `← Back to ${username}` : '← Go Home'}
        </Link>
        <button
          onClick   = {onRetry}
          className = "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

interface CloneUrlBoxProps { httpUrl: string; sshUrl: string; }

const CloneUrlBox: React.FC<CloneUrlBoxProps> = ({ httpUrl, sshUrl }) => {
  const [copied,   setCopied  ] = useState(false);
  const [protocol, setProtocol] = useState<'http' | 'ssh'>('http');
  const activeUrl = protocol === 'http' ? httpUrl : sshUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="absolute top-10 right-0 z-50 w-80 bg-bg-card border border-[#2a2a3a]
                    rounded-xl shadow-2xl p-3 space-y-2">
      <div className="flex rounded-lg border border-[#2a2a3a] overflow-hidden text-xs">
        {(['http', 'ssh'] as const).map((p) => (
          <button
            key       = {p}
            onClick   = {() => setProtocol(p)}
            className = {`flex-1 py-1.5 uppercase font-medium transition-colors ${
              protocol === p ? 'bg-indigo-600 text-white' : 'text-text-muted hover:bg-bg-tertiary'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-3 py-2 border border-[#2a2a3a]">
        <span className="flex-1 text-xs font-mono text-text-muted truncate">{activeUrl}</span>
        <button onClick={handleCopy} className="shrink-0 text-text-muted hover:text-text-primary transition-colors">
          {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
        </button>
      </div>
      {copied && <p className="text-xs text-green-400 text-center">Copied to clipboard!</p>}
    </div>
  );
};

interface MetaRowProps { icon: React.ReactNode; children: React.ReactNode; }
const MetaItem: React.FC<MetaRowProps> = ({ icon, children }) => (
  <span className="flex items-center gap-1 text-xs text-text-muted">{icon}{children}</span>
);

const SecurityOverview: React.FC = () => (
  <div className="space-y-4">
    <div className="gradient-border p-6">
      <h3 className="font-bold text-text-primary mb-1 flex items-center gap-2">
        <ShieldCheckIcon className="w-5 h-5 text-green-400" />
        Security Overview
      </h3>
      <p className="text-text-muted text-sm mb-6">AI-powered security scanning and vulnerability detection.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Vulnerabilities',  value: '2', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
          { label: 'Security Alerts',  value: '5', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { label: 'Secrets Detected', value: '0', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
        ].map((item) => (
          <div key={item.label} className={`p-4 rounded-xl ${item.bg} border ${item.border} text-center`}>
            <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
            <p className="text-xs text-text-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
    <AIInsights analyses={[]} />
  </div>
);

// =============================================================================
// Helpers (UNCHANGED)
// =============================================================================

const formatSize = (bytes: number): string => {
  if (bytes === 0)         return '0 B';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const resolveOwner = (owner: Repository['owner']): UserSummary | null => {
  if (!owner)                    return null;
  if (typeof owner === 'string') return null;
  return owner as UserSummary;
};

const detectLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts : 'typescript', tsx: 'typescript',
    js : 'javascript', jsx: 'javascript',
    py : 'python',     rb : 'ruby',
    go : 'go',         rs : 'rust',
    java: 'java',      kt : 'kotlin',
    cpp : 'cpp',       c  : 'c',
    cs  : 'csharp',    php: 'php',
    html: 'html',      css: 'css',
    scss: 'scss',      json: 'json',
    md  : 'markdown',  yml: 'yaml',
    yaml: 'yaml',      sh : 'bash',
    sql : 'sql',       xml: 'xml',
    toml: 'toml',      env: 'bash',
  };
  return map[ext] ?? 'text';
};

// =============================================================================
// ✅ NEW: Inline dynamic hooks replacing the broken imported ones
// =============================================================================

// ============================================================
// Replace all three hooks
// ============================================================

function useStarRepo(
  username      : string,
  repoName      : string,
  initialStarred: boolean,
  initialCount  : number,
  repoLoaded    : boolean,   // ← new
) {
  const [starred,   setStarred  ] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [loading,   setLoading  ] = useState(false);
  const [error,     setError    ] = useState<string | null>(null);
  const didInit = React.useRef(false);

  // ✅ Only initialise ONCE, only when real data has arrived
  React.useEffect(() => {
    if (!repoLoaded || didInit.current) return;
    didInit.current = true;
    setStarCount(initialCount);
    setStarred(initialStarred);
  }, [repoLoaded, initialCount, initialStarred]);

  // ✅ Reset when navigating to a different repo
  React.useEffect(() => {
    didInit.current = false;
    setStarred(false);
    setStarCount(0);
  }, [username, repoName]);

  const toggle = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      toast.error('Sign in to star repositories');
      return;
    }
    const prev      = starred;
    const prevCount = starCount;

    // ✅ Clamp: count can never go below 0
    setStarred(!prev);
    setStarCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    setLoading(true);
    setError(null);

    try {
      if (prev) {
        await api.delete(`/repositories/${username}/${repoName}/star`);
        toast.success('Unstarred');
      } else {
        await api.post(`/repositories/${username}/${repoName}/star`);
        toast.success('Starred! ⭐');
      }
    } catch (err: any) {
      setStarred(prev);
      setStarCount(prevCount);
      const msg = err?.response?.data?.message || 'Failed to update star';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [starred, starCount, username, repoName]);

  return { starred, starCount, loading, error, toggle };
}

function useWatchRepo(
  username       : string,
  repoName       : string,
  initialWatching: boolean,
  initialCount   : number,
  repoLoaded     : boolean,   // ← new
) {
  const [watching,     setWatching    ] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [loading,      setLoading     ] = useState(false);
  const didInit = React.useRef(false);

  React.useEffect(() => {
    if (!repoLoaded || didInit.current) return;
    didInit.current = true;
    setWatcherCount(initialCount);
    setWatching(initialWatching);
  }, [repoLoaded, initialCount, initialWatching]);

  React.useEffect(() => {
    didInit.current = false;
    setWatching(false);
    setWatcherCount(0);
  }, [username, repoName]);

  const toggle = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      toast.error('Sign in to watch repositories');
      return;
    }
    const prev      = watching;
    const prevCount = watcherCount;

    setWatching(!prev);
    setWatcherCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    setLoading(true);

    try {
      if (prev) {
        await api.delete(`/repositories/${username}/${repoName}/watch`);
        toast.success('Unwatched');
      } else {
        await api.post(`/repositories/${username}/${repoName}/watch`);
        toast.success('Watching 👁');
      }
    } catch (err: any) {
      setWatching(prev);
      setWatcherCount(prevCount);
      toast.error(err?.response?.data?.message || 'Failed to update watch');
    } finally {
      setLoading(false);
    }
  }, [watching, watcherCount, username, repoName]);

  return { watching, watcherCount, loading, toggle };
}

function useForkRepo(
  username    : string,
  repoName    : string,
  initialCount: number,
  repoLoaded  : boolean,   // ← new
) {
  const [forkCount, setForkCount] = useState(0);
  const [loading,   setLoading  ] = useState(false);
  const [error,     setError    ] = useState<string | null>(null);
  const didInit = React.useRef(false);

  React.useEffect(() => {
    if (!repoLoaded || didInit.current) return;
    didInit.current = true;
    setForkCount(initialCount);
  }, [repoLoaded, initialCount]);

  React.useEffect(() => {
    didInit.current = false;
    setForkCount(0);
  }, [username, repoName]);

  const fork = useCallback(async (): Promise<Repository | null> => {
    if (!localStorage.getItem('token')) {
      toast.error('Sign in to fork repositories');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<Repository>(
        `/repositories/${username}/${repoName}/fork`
      );
      setForkCount((c) => c + 1);
      toast.success('Repository forked! 🍴');
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to fork repository';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [username, repoName]);

  return { fork, forkCount, loading, error };
}
// =============================================================================
// RepositoryPage
// =============================================================================
const RepositoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    username = '',
    repo: repoName = '',
  } = useParams<{ username: string; repo: string }>();

  const [tab,          setTab         ] = useState<RepositoryTab>('code');
  const [branch,       setBranch      ] = useState<string>('');
  const [codeView,     setCodeView    ] = useState<CodeView>('files');
  const [aiPanel,      setAiPanel     ] = useState(false);
  const [showCloneBox, setShowCloneBox] = useState(false);
  const [currentPath,  setCurrentPath ] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const {
    repository,
    branchNames,
    files,
    commits,
    stats,
    repoLoading,
    branchLoading,
    filesLoading,
    commitsLoading,
    statsLoading,
    repoError,
    filesError,
    commitsError,
    commitPagination,
    hasMoreCommits,
    refetchRepo,
    refetchCommits,
    loadMoreCommits,
  } = useRepoPageData(username, repoName, branch || 'main', currentPath);

  const repo         = repository as Repository;
  const latestCommit = commits[0] ?? null;
  const activeBranch = branch || repository?.defaultBranch || 'main';

  const {
    data    : fileContent,
    loading : fileContentLoading,
    error   : fileContentError,
  } = useFileContent(
    username,
    repoName,
    activeBranch,
    selectedFile?.path ?? ''
  );

  /* ── resolve initial star / watch state from repo data ── */
  const currentUserId = localStorage.getItem('userId') ?? '';

// AFTER - derive from server data when available, fall back to localStorage
// ============================================================
// In RepositoryPage — remove localStorage from initial state
// ============================================================

const repoStarCount = Math.max(0,
  Array.isArray(repository?.stars)
    ? (repository!.stars as any[]).length
    : (repository?.stars as number) ?? 0
);

const repoWatchCount = Math.max(0,
  Array.isArray(repository?.watchers)
    ? (repository!.watchers as any[]).length
    : (repository?.watchers as number) ?? 0
);

const repoForkCount = Math.max(0,
  Array.isArray(repository?.forks)
    ? (repository!.forks as any[]).length
    : (repository?.forks as number) ?? 0
);

// ✅ Trust server, not localStorage
const initialStarred  = !!(repository as any)?.isStarredByCurrentUser;
const initialWatching = !!(repository as any)?.isWatchedByCurrentUser;

  /* ── ✅ DYNAMIC hooks ── */
  const repoLoaded = !repoLoading && !!repository;

const { starred, starCount, loading: starLoading, error: starError, toggle: toggleStar } =
  useStarRepo(username, repoName, initialStarred, repoStarCount, repoLoaded);

const { watching, watcherCount, loading: watchLoading, toggle: toggleWatch } =
  useWatchRepo(username, repoName, initialWatching, repoWatchCount, repoLoaded);

const { fork: forkRepo, loading: forkLoading, error: forkError, forkCount } =
  useForkRepo(username, repoName, repoForkCount, repoLoaded);

  /* ── handlers ── */
  const handleFork = useCallback(async () => {
    const forked = await forkRepo();
    if (forked) navigate(`/${currentUserId}/${forked.name}`);
  }, [forkRepo, navigate, currentUserId]);

  const handleBranchChange = useCallback((newBranch: string) => {
    setBranch(newBranch);
    setCurrentPath('');
    setSelectedFile(null);
    setCodeView('files');
  }, []);

  const handlePathChange = useCallback((newPath: string) => {
    setCurrentPath(newPath);
    setSelectedFile(null);
  }, []);

  const handleFileOpen = useCallback((file: FileNode) => {
    setSelectedFile(file);
    setCodeView('code');
  }, []);

  const handleBackToFiles = useCallback(() => {
    setSelectedFile(null);
    setCodeView('files');
  }, []);

  type RepositoryTabConfigWithRender = RepositoryTabConfig & {
    render: () => React.ReactNode;
  };

  const tabConfigs = useMemo<RepositoryTabConfigWithRender[]>(() => {
    if (!repository) return [];
    return [
    {
      id: 'code',
      label: 'Code',
      icon: <CodeBracketIcon className="w-4 h-4" />,
      render: () => (
        <motion.div
          key="code-tab"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {branchLoading ? (
                <SkeletonBlock className="w-32 h-8 rounded-lg" />
              ) : (
                <BranchSelector
                  branches={branchNames}
                  current={activeBranch}
                  onChange={handleBranchChange}
                />
              )}
              <div className="flex rounded-lg border border-[#2a2a3a] overflow-hidden">
                {(['files', 'code', 'commits'] as CodeView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setCodeView(v);
                      if (v === 'files') setSelectedFile(null);
                    }}
                    className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                      codeView === v ? 'bg-indigo-600 text-white' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setShowCloneBox((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Code
              </button>
              <AnimatePresence>
                {showCloneBox && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CloneUrlBox httpUrl={repo.cloneUrls.http} sshUrl={repo.cloneUrls.ssh} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {commitsLoading && !latestCommit ? (
            <SkeletonBlock className="w-full h-12 rounded-xl" />
          ) : latestCommit ? (
            <div className="gradient-border px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {latestCommit.author.charAt(0).toUpperCase()}
              </div>
              <Link to={`/${latestCommit.author}`} className="text-sm text-text-primary font-medium hover:underline shrink-0">
                {latestCommit.author}
              </Link>
              <span className="text-sm text-text-muted flex-1 truncate min-w-0">{latestCommit.message}</span>
              <code className="text-xs text-text-muted font-mono bg-bg-tertiary border border-[#2a2a3a] rounded px-2 py-0.5 shrink-0">
                {latestCommit.sha.slice(0, 7)}
              </code>
              <span className="text-xs text-text-muted shrink-0">{latestCommit.date}</span>
              {commitPagination && (
                <span className="text-xs text-text-muted shrink-0">
                  {commitPagination.total.toLocaleString()} commits
                </span>
              )}
            </div>
          ) : null}

          {codeView === 'files' && (
            <>
              {filesLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <SkeletonBlock key={i} className="w-full h-10 rounded" />
                  ))}
                </div>
              ) : filesError ? (
                <div className="gradient-border p-8 text-center">
                  <ExclamationCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-text-muted text-sm">{filesError}</p>
                </div>
              ) : (
                <FileExplorer
                  files={files}
                  owner={username}
                  repo={repoName}
                  branch={activeBranch}
                  path={currentPath}
                  onNavigate={handlePathChange}
                  onFileOpen={handleFileOpen}
                />
              )}

              {/* <div className="gradient-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#2a2a3a] bg-bg-tertiary flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">Recent commits</span>
                  <button
                    onClick={refetchCommits}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <div className="p-4">
                  {commitsLoading && commits.length === 0 ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonBlock key={i} className="w-full h-4 rounded" />
                      ))}
                    </div>
                  ) : commits.length === 0 ? (
                    <div className="text-sm text-text-muted">No commits yet.</div>
                  ) : (
                    <CommitHistory commits={commits.slice(0, 5)} />
                  )}
                </div>
              </div> */}

              <div className="gradient-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#2a2a3a] bg-bg-tertiary flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-secondary font-medium">README.md</span>
                </div>
                <div className="p-6 prose prose-invert max-w-none">
                  <h1 className="text-2xl font-bold text-text-primary mb-2">🚀 {repo.name}</h1>
                  <p className="text-text-secondary mb-4">{repo.description || 'No description provided.'}</p>
                  {repo.topics.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-4">
                      {repo.topics.map((tag) => (
                        <span key={tag} className="badge badge-primary">{tag}</span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-text-primary mb-2">Getting Started</h2>
                  <pre className="bg-[#0d0d14] border border-[#2a2a3a] rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
{`# Clone the repository
git clone ${repo.cloneUrls.http}

# Install dependencies
npm install

# Start development server
npm run dev`}
                  </pre>
                  {owner && (
                    <>
                      <h2 className="text-lg font-bold text-text-primary mt-6 mb-2">Contributing</h2>
                      <p className="text-text-secondary text-sm">
                        Pull requests are welcome. Maintained by{' '}
                        <Link to={`/${repo.ownerUsername}`} className="text-indigo-400 hover:underline">
                          @{repo.ownerUsername}
                        </Link>.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {codeView === 'code' && (
            <div className="space-y-3">
              {selectedFile && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleBackToFiles}
                    className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Back to files
                  </button>
                  <span className="text-text-muted text-sm">/</span>
                  {selectedFile.path.split('/').map((segment, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span
                        className={`text-sm font-mono ${
                          idx === arr.length - 1
                            ? 'text-text-primary font-medium'
                            : 'text-indigo-400 hover:underline cursor-pointer'
                        }`}
                        onClick={() => {
                          if (idx < arr.length - 1) {
                            const dirPath = arr.slice(0, idx + 1).join('/');
                            handlePathChange(dirPath);
                            setSelectedFile(null);
                            setCodeView('files');
                          }
                        }}
                      >
                        {segment}
                      </span>
                      {idx < arr.length - 1 && <span className="text-text-muted text-sm">/</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {fileContentLoading ? (
                <div className="gradient-border overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#2a2a3a] bg-bg-tertiary">
                    <SkeletonBlock className="w-48 h-4" />
                  </div>
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <SkeletonBlock
                        key={i}
                        className={`h-4 rounded ${
                          i % 3 === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-full' : 'w-1/2'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : fileContentError ? (
                <div className="gradient-border p-8 text-center">
                  <ExclamationCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-text-muted text-sm">{fileContentError}</p>
                  <button
                    onClick={handleBackToFiles}
                    className="mt-4 text-indigo-400 hover:underline text-sm"
                  >
                    ← Back to files
                  </button>
                </div>
              ) : (
                <CodeViewer
                  code={fileContent?.content ?? ''}
                  language={selectedFile ? detectLanguage(selectedFile.name) : repo.language ?? 'text'}
                  filename={selectedFile?.name ?? repo.name}
                />
              )}
            </div>
          )}

          {codeView === 'commits' && (
            <div className="space-y-3">
              {commitsLoading && commits.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock key={i} className="w-full h-16 rounded-xl" />
                ))
              ) : commitsError ? (
                <div className="gradient-border p-8 text-center">
                  <ExclamationCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-text-muted text-sm">{commitsError}</p>
                </div>
              ) : (
                <>
                  <CommitHistory commits={commits} />
                  {hasMoreCommits && (
                    <button
                      onClick={loadMoreCommits}
                      disabled={commitsLoading}
                      className="w-full py-2.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors border border-[#2a2a3a] rounded-xl bg-bg-card hover:bg-bg-tertiary disabled:opacity-60"
                    >
                      {commitsLoading ? 'Loading…' : 'Load more commits'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      ),
    },
    {
      id: 'issues',
      label: 'Issues',
      icon: <ExclamationCircleIcon className="w-4 h-4" />,
      count: repo.openIssues,
      render: () => (
        <motion.div key="issues-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/${username}/${repoName}/issues`} className="text-indigo-400 hover:underline text-sm">
            → Open Issues Page
          </Link>
        </motion.div>
      ),
    },
    {
      id: 'pulls',
      label: 'Pull Requests',
      icon: <ArrowPathIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="pulls-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/${username}/${repoName}/pulls`} className="text-indigo-400 hover:underline text-sm">
            → Open Pull Requests Page
          </Link>
        </motion.div>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: <BoltIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="actions-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/${username}/${repoName}/actions`} className="text-indigo-400 hover:underline text-sm">
            → Open Actions Page
          </Link>
        </motion.div>
      ),
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <BookOpenIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="projects-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/${username}/${repoName}/projects`} className="text-indigo-400 hover:underline text-sm">
            → Open Projects Page
          </Link>
        </motion.div>
      ),
    },
    {
      id: 'wiki',
      label: 'Wiki',
      icon: <BookOpenIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="wiki-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/${username}/${repoName}/wiki`} className="text-indigo-400 hover:underline text-sm">
            → Open Wiki Page
          </Link>
        </motion.div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="security-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <SecurityOverview />
        </motion.div>
      ),
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: <EyeIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="insights-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="gradient-border p-5">
            <h3 className="font-bold text-text-primary mb-4">Repository Insights</h3>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Commits', value: stats?.totalCommits.toLocaleString() ?? '—' },
                  { label: 'Contributors', value: stats?.contributors.toLocaleString() ?? '—' },
                  { label: 'Branches', value: stats?.branches.toString() ?? '—' },
                  { label: 'Releases', value: stats?.releases.toString() ?? '—' },
                ].map((s) => (
                  <div key={s.label} className="bg-bg-tertiary rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-400">{s.value}</p>
                    <p className="text-xs text-text-muted mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="gradient-border p-4">
              <h4 className="font-semibold text-text-primary mb-3 text-sm">Repository Info</h4>
              <div className="space-y-2">
                {[
                  { label: 'Default Branch', value: repo.defaultBranch },
                  { label: 'Language',       value: repo.language ?? 'None' },
                  { label: 'Size',           value: formatSize(repo.size) },
                  { label: 'Open Issues',    value: repo.openIssues.toString() },
                  { label: 'License',        value: repo.license ?? 'None' },
                  { label: 'Created',        value: new Date(repo.createdAt).toLocaleDateString() },
                  { label: 'Last Updated',   value: new Date(repo.updatedAt).toLocaleDateString() },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-xs py-1 border-b border-[#2a2a3a] last:border-0">
                    <span className="text-text-muted">{row.label}</span>
                    <span className="text-text-primary font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="gradient-border p-4">
              <h4 className="font-semibold text-text-primary mb-3 text-sm">Social</h4>
              <div className="space-y-2">
                {[
                  { label: 'Stars',          value: starCount.toLocaleString()    },
                  { label: 'Forks',          value: forkCount.toLocaleString()    },
                  { label: 'Watchers',       value: watcherCount.toLocaleString() },
                  { label: 'Collaborators',  value: repo.collaborators.length.toString() },
                  { label: 'Topics',         value: repo.topics.length.toString() },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-xs py-1 border-b border-[#2a2a3a] last:border-0">
                    <span className="text-text-muted">{row.label}</span>
                    <span className="text-text-primary font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ),
    },
    {
      id: 'ai',
      label: 'AI',
      icon: <SparklesIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="ai-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-400" />AI Insights
              </h3>
              <AIInsights analyses={[]} />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-indigo-400" />AI Code Review
              </h3>
              <AICodeReview />
            </div>
          </div>
        </motion.div>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Cog6ToothIcon className="w-4 h-4" />,
      render: () => (
        <motion.div key="settings-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={`/${username}/${repoName}/settings`} className="text-indigo-400 hover:underline text-sm">
            → Open Settings Page
          </Link>
        </motion.div>
      ),
    },
  ];
  }, [
    activeBranch, branchLoading, branchNames, codeView, commits, commitsError,
    commitsLoading, commitPagination, currentPath, fileContent, fileContentError,
    fileContentLoading, files, filesError, filesLoading, forkCount, handleBackToFiles,
    handleBranchChange, handleFileOpen, handlePathChange, latestCommit, refetchCommits,
    repository, repoName, setCodeView, setSelectedFile, showCloneBox, starCount,
    watcherCount, stats, statsLoading, username,
  ]);

  const activeTab = useMemo(
    () => tabConfigs.find((t) => t.id === tab) ?? tabConfigs[0],
    [tabConfigs, tab]
  );

  if (repoLoading) return <RepositorySkeleton />;

  if (repoError || !repository) {
    return (
      <RepositoryError
        message  = {repoError ?? 'Repository not found'}
        username = {username}
        onRetry  = {refetchRepo}
      />
    );
  }

  const owner = resolveOwner(repository.owner);

  return (
    <div className="min-h-screen bg-bg-primary pt-14">
      <div className="border-b border-[#2a2a3a] bg-bg-secondary">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <CodeBracketIcon className="w-4 h-4 text-text-muted" />
              <Link to={`/${username}`} className="text-indigo-400 hover:underline font-medium">
                {username}
              </Link>
              <span className="text-text-muted">/</span>
              <span className="text-text-primary font-bold text-base">{repository.name}</span>
              <span className={`badge ${repository.private ? 'badge-warning' : 'badge-info'}`}>
                {repository.private
                  ? <span className="flex items-center gap-1"><LockClosedIcon className="w-3 h-3" />Private</span>
                  : 'Public'}
              </span>
              {repository.fork     && <span className="badge badge-secondary text-[10px]">Forked</span>}
              {repository.archived && (
                <span className="flex items-center gap-1 badge badge-error text-[10px]">
                  <ArchiveBoxIcon className="w-3 h-3" />Archived
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* ── Watch ── */}
              <motion.button
                whileTap  = {{ scale: 0.95 }}
                onClick   = {toggleWatch}
                disabled  = {watchLoading}
                className = {`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all disabled:opacity-60 ${
                  watching
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                    : 'border-[#2a2a3a] bg-bg-card text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                <EyeIcon className="w-4 h-4" />
                <span>{watching ? 'Watching' : 'Watch'}</span>
                <span className={`badge ${watching ? 'badge-info' : 'badge-primary'}`}>
                  {watcherCount.toLocaleString()}
                </span>
              </motion.button>

              {/* ── Star ── */}
              <motion.button
                whileTap  = {{ scale: 0.95 }}
                onClick   = {toggleStar}
                disabled  = {starLoading}
                title     = {starError ?? undefined}
                className = {`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all disabled:opacity-60 ${
                  starred
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                    : 'border-[#2a2a3a] bg-bg-card text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {starred
                  ? <StarSolid className="w-4 h-4 text-yellow-400" />
                  : <StarIcon  className="w-4 h-4" />
                }
                <span>{starred ? 'Starred' : 'Star'}</span>
                <span className={`badge ${starred ? 'badge-warning' : 'badge-primary'}`}>
                  {starCount.toLocaleString()}
                </span>
              </motion.button>

              {/* ── Fork ── */}
              <motion.button
                whileTap  = {{ scale: 0.95 }}
                onClick   = {handleFork}
                disabled  = {forkLoading}
                title     = {forkError ?? undefined}
                className = "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-bg-card text-text-secondary hover:bg-bg-tertiary text-sm transition-colors disabled:opacity-60"
              >
                <ArrowPathIcon className={`w-4 h-4 ${forkLoading ? 'animate-spin' : ''}`} />
                <span>{forkLoading ? 'Forking…' : 'Fork'}</span>
                <span className="badge badge-primary">{forkCount.toLocaleString()}</span>
              </motion.button>

              {/* ── AI Panel ── */}
              <button
                onClick   = {() => setAiPanel((v) => !v)}
                className = {`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ai-glow ${
                  aiPanel
                    ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-300'
                    : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                <span>AI</span>
              </button>
            </div>
          </div>

          {repository.description && (
            <p className="text-text-muted text-sm mb-3 max-w-2xl leading-relaxed">
              {repository.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-text-muted mb-3 flex-wrap">
            {repository.language && repository.language !== 'none' && (
              <MetaItem icon={<span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />}>
                {repository.language}
              </MetaItem>
            )}
            <MetaItem icon={<StarIcon    className="w-3.5 h-3.5" />}>{starCount.toLocaleString()} stars</MetaItem>
            <MetaItem icon={<EyeIcon     className="w-3.5 h-3.5" />}>{watcherCount.toLocaleString()} watching</MetaItem>
            <MetaItem icon={<ArrowPathIcon className="w-3.5 h-3.5" />}>{forkCount.toLocaleString()} forks</MetaItem>
            {repository.collaborators.length > 0 && (
              <MetaItem icon={<UserGroupIcon className="w-3.5 h-3.5" />}>
                {repository.collaborators.length} collaborator{repository.collaborators.length !== 1 ? 's' : ''}
              </MetaItem>
            )}
            {repository.license  && <MetaItem icon={<ScaleIcon className="w-3.5 h-3.5" />}>{repository.license}</MetaItem>}
            {repository.homepage && (
              <a href={repository.homepage} target="_blank" rel="noreferrer"
                 className="flex items-center gap-1 text-indigo-400 hover:underline">
                🌐 {repository.homepage}
              </a>
            )}
            <span>{formatSize(repository.size)}</span>
          </div>

          {repository.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {repository.topics.map((topic) => (
                <Link
                  key       = {topic}
                  to        = {`/explore?topic=${topic}`}
                  className = "px-2.5 py-0.5 text-xs rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                >
                  {topic}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
            {tabConfigs.map((t) => (
              <button
                key       = {t.id}
                onClick   = {() => setTab(t.id)}
                className = {`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-all ${
                  tab === t.id
                    ? 'border-indigo-500 text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-[#2a2a3a]'
                } ${t.id === 'ai' ? 'text-indigo-400' : ''}`}
              >
                {t.icon}{t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="badge badge-primary text-[10px]">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className={`grid gap-6 transition-all ${aiPanel ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={aiPanel ? 'lg:col-span-2' : ''}>
            {activeTab?.render()}
          </div>
          <AnimatePresence>
            {aiPanel && (
              <motion.div
                key       = "ai-panel"
                initial   = {{ opacity: 0, x: 24 }}
                animate   = {{ opacity: 1, x: 0  }}
                exit      = {{ opacity: 0, x: 24 }}
                transition= {{ duration: 0.25 }}
                className = "lg:col-span-1 h-[700px] sticky top-20"
              >
                <AIAssistant onClose={() => setAiPanel(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RepositoryPage;