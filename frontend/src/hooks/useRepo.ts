import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useReducer,
} from 'react';

import { repositoryService, CommitsResult, RepoListFilters, StarActionResult, WatchActionResult } from '../services/repoService';

import {
  Repository,
  Branch,
  Commit,
  CommitSummary,
  FileNode,
  RepoStats,
  Pagination,
  ObjectIdString,
  CollaboratorRole,
  CreateRepositoryForm,
} from '../types';

// =============================================================================
// Generic async state
// =============================================================================

interface AsyncState<T> {
  data   : T | null;
  loading: boolean;
  error  : string | null;
}

type AsyncAction<T> =
  | { type: 'LOADING'                    }
  | { type: 'SUCCESS'; payload: T        }
  | { type: 'ERROR';   payload: string   }
  | { type: 'RESET'                      };

// Generic reducer — avoids repeating useState triads everywhere
function asyncReducer<T>(
  state : AsyncState<T>,
  action: AsyncAction<T>
): AsyncState<T> {
  switch (action.type) {
    case 'LOADING': return { data: state.data, loading: true,  error: null              };
    case 'SUCCESS': return { data: action.payload,  loading: false, error: null         };
    case 'ERROR'  : return { data: null,        loading: false, error: action.payload   };
    case 'RESET'  : return { data: null,        loading: false, error: null             };
    default       : return state;
  }
}

// Factory so every hook gets a correctly typed reducer
function useAsyncReducer<T>(initial: T | null = null) {
  return useReducer(asyncReducer<T>, {
    data   : initial,
    loading: false,
    error  : null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancellable-fetch helper
// Runs `fn`, writes result into dispatch, handles cleanup flag.
// ─────────────────────────────────────────────────────────────────────────────
function useCancellableFetch<T>(
  dispatch: React.Dispatch<AsyncAction<T>>,
  fn      : () => Promise<T>
) {
  return useCallback(() => {
    let cancelled = false;

    const run = async () => {
      dispatch({ type: 'LOADING' });
      try {
        const result = await fn();
        if (!cancelled) dispatch({ type: 'SUCCESS', payload: result });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type   : 'ERROR',
            payload: (err as Error).message ?? 'Unknown error',
          });
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [dispatch, fn]);
}

// =============================================================================
// 1. useRepository
//    Fetch a single repository by owner + name.
// =============================================================================

export interface UseRepositoryReturn extends AsyncState<Repository> {
  refetch: () => void;
}

export const useRepository = (
  username: string,
  repoName: string
): UseRepositoryReturn => {
  const [state, dispatch] = useAsyncReducer<Repository>();

  const fetch = useCallback(async () => {
    if (!username || !repoName) return;
    dispatch({ type: 'LOADING' });
    try {
      const repo = await repositoryService.getRepository(username, repoName);
      dispatch({ type: 'SUCCESS', payload: repo });
    } catch (err) {
      dispatch({
        type   : 'ERROR',
        payload: (err as Error).message,
      });
    }
  }, [username, repoName]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch };
};

// =============================================================================
// 2. useRepositories
//    Fetch paginated public repositories.
// =============================================================================

export interface UseRepositoriesReturn {
  repositories: Repository[];
  pagination  : Pagination | null;
  loading     : boolean;
  error       : string | null;
  refetch     : () => void;
}

export const useRepositories = (
  filters: RepoListFilters = {}
): UseRepositoriesReturn => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pagination,   setPagination  ] = useState<Pagination | null>(null);
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState<string | null>(null);

  // Stable reference to filters to avoid infinite loops
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await repositoryService.getRepositories(filtersRef.current);
      setRepositories(result.repositories);
      setPagination(result.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { repositories, pagination, loading, error, refetch: fetch };
};

// =============================================================================
// 3. useMyRepositories
//    Fetch authenticated user's own repositories.
// =============================================================================

export interface UseMyRepositoriesReturn {
  repositories: Repository[];
  pagination  : Pagination | null;
  loading     : boolean;
  error       : string | null;
  refetch     : () => void;
}

export const useMyRepositories = (
  page : number = 1,
  limit: number = 10
): UseMyRepositoriesReturn => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pagination,   setPagination  ] = useState<Pagination | null>(null);
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await repositoryService.getMyRepositories({ page, limit });
      setRepositories(result.repositories);
      setPagination(result.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { repositories, pagination, loading, error, refetch: fetch };
};

// =============================================================================
// 4. useUserRepositories
//    Fetch repositories for any given username.
// =============================================================================

export interface UseUserRepositoriesReturn {
  repositories: Repository[];
  pagination  : Pagination | null;
  loading     : boolean;
  error       : string | null;
  refetch     : () => void;
}

export const useUserRepositories = (
  username: string,
  filters : RepoListFilters = {}
): UseUserRepositoriesReturn => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pagination,   setPagination  ] = useState<Pagination | null>(null);
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const result = await repositoryService.getUserRepositories(
        username,
        filtersRef.current
      );
      setRepositories(result.repositories);
      setPagination(result.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { fetch(); }, [fetch]);

  return { repositories, pagination, loading, error, refetch: fetch };
};

// =============================================================================
// 5. useCreateRepository
//    Create a new repository.
// =============================================================================

export interface UseCreateRepositoryReturn {
  create  : (form: CreateRepositoryForm) => Promise<Repository | null>;
  loading : boolean;
  error   : string | null;
  data    : Repository | null;
  reset   : () => void;
}

export const useCreateRepository = (): UseCreateRepositoryReturn => {
  const [state, dispatch] = useAsyncReducer<Repository>();

  const create = useCallback(
    async (form: CreateRepositoryForm): Promise<Repository | null> => {
      dispatch({ type: 'LOADING' });
      try {
        const repo = await repositoryService.createRepository(form);
        dispatch({ type: 'SUCCESS', payload: repo });
        return repo;
      } catch (err) {
        dispatch({
          type   : 'ERROR',
          payload: (err as Error).message,
        });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { create, loading: state.loading, error: state.error, data: state.data, reset };
};

// =============================================================================
// 6. useDeleteRepository
//    Delete a repository.
// =============================================================================

export interface UseDeleteRepositoryReturn {
  deleteRepo: (username: string, repoName: string) => Promise<boolean>;
  loading   : boolean;
  error     : string | null;
}

export const useDeleteRepository = (): UseDeleteRepositoryReturn => {
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  const deleteRepo = useCallback(
    async (username: string, repoName: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await repositoryService.deleteRepository(username, repoName);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { deleteRepo, loading, error };
};

// =============================================================================
// 7. useBranches
//    Fetch all branches for a repository.
// =============================================================================

export interface UseBranchesReturn extends AsyncState<Branch[]> {
  branchNames: string[];
}

export const useBranches = (
  username: string,
  repoName: string
): UseBranchesReturn => {
  const [state, dispatch] = useAsyncReducer<Branch[]>();

  useEffect(() => {
    if (!username || !repoName) return;
    let cancelled = false;

    const fetch = async () => {
      dispatch({ type: 'LOADING' });
      try {
        const branches = await repositoryService.getBranches(username, repoName);
        if (!cancelled) dispatch({ type: 'SUCCESS', payload: branches });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type   : 'ERROR',
            payload: (err as Error).message,
          });
        }
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [username, repoName]);

  return {
    ...state,
    branchNames: state.data?.map((b) => b.name) ?? [],
  };
};

// =============================================================================
// 8. useCommits
//    Fetch commits with infinite-scroll / load-more pagination.
// =============================================================================

export interface UseCommitsReturn {
  commits   : CommitSummary[];
  pagination: Pagination | null;
  loading   : boolean;
  error     : string | null;
  loadMore  : () => void;
  hasMore   : boolean;
  reset     : () => void;
  refetch   : () => void;
}

export const useCommits = (
  username: string,
  repoName: string,
  branch  : string,
  limit   : number = 20
): UseCommitsReturn => {
  const [commits,    setCommits   ] = useState<CommitSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading   ] = useState(false);
  const [error,      setError     ] = useState<string | null>(null);
  const [page,       setPage      ] = useState(1);

  const hasMore = pagination
    ? pagination.page < pagination.pages
    : false;

  // Reset when branch changes
  const reset = useCallback(() => {
    setCommits([]);
    setPagination(null);
    setPage(1);
    setError(null);
  }, []);

  const cancelledRef = useRef(false);

  const fetchCommits = useCallback(async () => {
    console.log('useCommits - fetchCommits called with:', { username, repoName, branch, limit });

    if (!username || !repoName || !branch) {
      console.log('useCommits - missing required params, returning early');
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    setError(null);
    setCommits([]);
    setPagination(null);

    try {
      console.log('useCommits - calling repositoryService.getCommits');
      const result: CommitsResult = await repositoryService.getCommits(
        username, repoName, branch, 1, limit
      );
      console.log('useCommits - received result:', result);

      if (!cancelledRef.current) {
        setCommits(result.commits);
        setPagination(result.pagination);
        setPage(1);
        console.log('useCommits - set commits:', result.commits);
      }
    } catch (err) {
      console.log('useCommits - error:', err);
      if (!cancelledRef.current) setError((err as Error).message);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [username, repoName, branch, limit]);

  // Initial load + branch change
  useEffect(() => {
    if (!username || !repoName || !branch) return;
    cancelledRef.current = false;
    fetchCommits();
    return () => { cancelledRef.current = true; };
  }, [fetchCommits]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;
    setLoading(true);

    try {
      const result: CommitsResult = await repositoryService.getCommits(
        username, repoName, branch, nextPage, limit
      );
      setCommits((prev) => [...prev, ...result.commits]);
      setPagination(result.pagination);
      setPage(nextPage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, username, repoName, branch, limit]);

  return { commits, pagination, loading, error, loadMore, hasMore, reset, refetch: fetchCommits };
};

// =============================================================================
// 9. useSingleCommit
//    Fetch a single commit by SHA.
// =============================================================================

export interface UseSingleCommitReturn extends AsyncState<Commit> {}

export const useSingleCommit = (
  username: string,
  repoName: string,
  sha     : string
): UseSingleCommitReturn => {
  const [state, dispatch] = useAsyncReducer<Commit>();

  useEffect(() => {
    if (!username || !repoName || !sha) return;
    let cancelled = false;

    const fetch = async () => {
      dispatch({ type: 'LOADING' });
      try {
        const commit = await repositoryService.getCommit(username, repoName, sha);
        if (!cancelled) dispatch({ type: 'SUCCESS', payload: commit });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type   : 'ERROR',
            payload: (err as Error).message,
          });
        }
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [username, repoName, sha]);

  return state;
};

// =============================================================================
// 10. useRepoFiles
//     Fetch directory listing for a branch + path.
// =============================================================================

export interface UseRepoFilesReturn extends AsyncState<FileNode[]> {
  refetch: () => void;
}

export const useRepoFiles = (
  username: string,
  repoName: string,
  branch  : string,
  path    : string = ''
): UseRepoFilesReturn => {
  const [state, dispatch] = useAsyncReducer<FileNode[]>();

  const fetch = useCallback(async () => {
    if (!username || !repoName || !branch) return;
    dispatch({ type: 'LOADING' });
    try {
      const files = await repositoryService.getRepositoryFiles(
        username, repoName, branch, path
      );
      dispatch({ type: 'SUCCESS', payload: files });
    } catch (err) {
      dispatch({
        type   : 'ERROR',
        payload: (err as Error).message,
      });
    }
  }, [username, repoName, branch, path]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch };
};

// =============================================================================
// 11. useFileContent
//     Fetch raw content of a single file.
// =============================================================================

export interface FileContentData {
  content : string;
  encoding: string;
  size    : number;
}

export interface UseFileContentReturn extends AsyncState<FileContentData> {
  refetch: () => void;
}

export const useFileContent = (
  username: string,
  repoName: string,
  branch  : string,
  filePath: string
): UseFileContentReturn => {
  const [state, dispatch] = useAsyncReducer<FileContentData>();

  const fetch = useCallback(async () => {
    if (!username || !repoName || !branch || !filePath) return;
    dispatch({ type: 'LOADING' });
    try {
      const result = await repositoryService.getFileContent(
        username, repoName, branch, filePath
      );
      dispatch({ type: 'SUCCESS', payload: result });
    } catch (err) {
      dispatch({
        type   : 'ERROR',
        payload: (err as Error).message,
      });
    }
  }, [username, repoName, branch, filePath]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...state, refetch: fetch };
};

// =============================================================================
// 12. useRepoStats
//     Fetch repository statistics for the Insights tab.
// =============================================================================

export interface UseRepoStatsReturn extends AsyncState<RepoStats> {}

export const useRepoStats = (
  username: string,
  repoName: string
): UseRepoStatsReturn => {
  const [state, dispatch] = useAsyncReducer<RepoStats>();

  useEffect(() => {
    if (!username || !repoName) return;
    let cancelled = false;

    const fetch = async () => {
      dispatch({ type: 'LOADING' });
      try {
        const stats = await repositoryService.getRepositoryStats(username, repoName);
        if (!cancelled) dispatch({ type: 'SUCCESS', payload: stats });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type   : 'ERROR',
            payload: (err as Error).message,
          });
        }
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [username, repoName]);

  return state;
};

// =============================================================================
// 13. useStarRepo
//     Star / unstar with optimistic UI update + rollback on error.
// =============================================================================

export interface UseStarRepoReturn {
  starred  : boolean;
  starCount: number;
  loading  : boolean;
  error    : string | null;
  toggle   : () => Promise<void>;
}

export const useStarRepo = (
  username    : string,
  repoName    : string,
  initialStar : boolean,
  initialCount: number
): UseStarRepoReturn => {
  const [starred,   setStarred  ] = useState(initialStar);
  const [starCount, setStarCount] = useState(initialCount);
  const [loading,   setLoading  ] = useState(false);
  const [error,     setError    ] = useState<string | null>(null);

  // Sync when parent refreshes repo data
  useEffect(() => setStarred(initialStar),   [initialStar]);
  useEffect(() => setStarCount(initialCount), [initialCount]);

  const toggle = useCallback(async (): Promise<void> => {
    if (loading) return;

    // ── Optimistic update ──────────────────────────────────────────────────
    const prevStarred   = starred;
    const prevStarCount = starCount;
    setStarred((s) => !s);
    setStarCount((c) => (starred ? c - 1 : c + 1));
    setLoading(true);
    setError(null);

    try {
      const result: StarActionResult = starred
        ? await repositoryService.unstarRepository(username, repoName)
        : await repositoryService.starRepository(username, repoName);

      // Reconcile with server values
      setStarred(result.starred);
      setStarCount(result.starCount);
    } catch (err) {
      // ── Rollback ───────────────────────────────────────────────────────────
      setStarred(prevStarred);
      setStarCount(prevStarCount);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loading, starred, starCount, username, repoName]);

  return { starred, starCount, loading, error, toggle };
};

// =============================================================================
// 14. useWatchRepo
//     Watch / unwatch with optimistic UI update + rollback on error.
// =============================================================================

export interface UseWatchRepoReturn {
  watching    : boolean;
  watcherCount: number;
  loading     : boolean;
  error       : string | null;
  toggle      : () => Promise<void>;
}

export const useWatchRepo = (
  username    : string,
  repoName    : string,
  initialWatch: boolean,
  initialCount: number
): UseWatchRepoReturn => {
  const [watching,     setWatching    ] = useState(initialWatch);
  const [watcherCount, setWatcherCount] = useState(initialCount);
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState<string | null>(null);

  useEffect(() => setWatching(initialWatch),      [initialWatch]);
  useEffect(() => setWatcherCount(initialCount),  [initialCount]);

  const toggle = useCallback(async (): Promise<void> => {
    if (loading) return;

    const prevWatching     = watching;
    const prevWatcherCount = watcherCount;
    setWatching((w) => !w);
    setWatcherCount((c) => (watching ? c - 1 : c + 1));
    setLoading(true);
    setError(null);

    try {
      const result: WatchActionResult = watching
        ? await repositoryService.unwatchRepository(username, repoName)
        : await repositoryService.watchRepository(username, repoName);

      setWatching(result.watching);
      setWatcherCount(result.watcherCount);
    } catch (err) {
      setWatching(prevWatching);
      setWatcherCount(prevWatcherCount);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loading, watching, watcherCount, username, repoName]);

  return { watching, watcherCount, loading, error, toggle };
};

// =============================================================================
// 15. useForkRepo
//     Fork a repository.
// =============================================================================

export interface UseForkRepoReturn {
  fork     : () => Promise<Repository | null>;
  loading  : boolean;
  error    : string | null;
  forkCount: number;
}

export const useForkRepo = (
  username          : string,
  repoName          : string,
  initialForkCount  : number
): UseForkRepoReturn => {
  const [loading,   setLoading  ] = useState(false);
  const [error,     setError    ] = useState<string | null>(null);
  const [forkCount, setForkCount] = useState(initialForkCount);

  useEffect(() => setForkCount(initialForkCount), [initialForkCount]);

  const fork = useCallback(async (): Promise<Repository | null> => {
    if (loading) return null;
    setLoading(true);
    setError(null);

    try {
      const result = await repositoryService.forkRepository(username, repoName);
      setForkCount(result.forkCount);
      return result.repository;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading, username, repoName]);

  return { fork, loading, error, forkCount };
};

// =============================================================================
// 16. useUpdateRepository
//     Update repository metadata.
// =============================================================================

export interface UseUpdateRepositoryReturn {
  update : (
    updates: Partial<
      Pick<
        Repository,
        | 'description'
        | 'visibility'
        | 'topics'
        | 'homepage'
        | 'defaultBranch'
        | 'archived'
      >
    >
  ) => Promise<Repository | null>;
  loading: boolean;
  error  : string | null;
}

export const useUpdateRepository = (
  username: string,
  repoName: string
): UseUpdateRepositoryReturn => {
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  const update = useCallback(
    async (
      updates: Partial<
        Pick<
          Repository,
          | 'description'
          | 'visibility'
          | 'topics'
          | 'homepage'
          | 'defaultBranch'
          | 'archived'
        >
      >
    ): Promise<Repository | null> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await repositoryService.updateRepository(
          username,
          repoName,
          updates
        );
        return updated;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [username, repoName]
  );

  return { update, loading, error };
};

// =============================================================================
// 17. useTopics
//     Update repository topics.
// =============================================================================

export interface UseTopicsReturn {
  topics      : string[];
  updateTopics: (newTopics: string[]) => Promise<boolean>;
  loading     : boolean;
  error       : string | null;
}

export const useTopics = (
  username     : string,
  repoName     : string,
  initialTopics: string[] = []
): UseTopicsReturn => {
  const [topics,  setTopics ] = useState<string[]>(initialTopics);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  useEffect(() => setTopics(initialTopics), [initialTopics]);

  const updateTopics = useCallback(
    async (newTopics: string[]): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await repositoryService.updateTopics(
          username,
          repoName,
          newTopics
        );
        setTopics(updated);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [username, repoName]
  );

  return { topics, updateTopics, loading, error };
};

// =============================================================================
// 18. useCollaborators
//     Add / remove collaborators.
// =============================================================================

export interface UseCollaboratorsReturn {
  addCollaborator   : (userId: ObjectIdString, role: CollaboratorRole) => Promise<boolean>;
  removeCollaborator: (userId: ObjectIdString) => Promise<boolean>;
  loading           : boolean;
  error             : string | null;
}

export const useCollaborators = (
  username: string,
  repoName: string
): UseCollaboratorsReturn => {
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  const addCollaborator = useCallback(
    async (userId: ObjectIdString, role: CollaboratorRole): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await repositoryService.addCollaborator(username, repoName, userId, role);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [username, repoName]
  );

  const removeCollaborator = useCallback(
    async (userId: ObjectIdString): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await repositoryService.removeCollaborator(username, repoName, userId);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [username, repoName]
  );

  return { addCollaborator, removeCollaborator, loading, error };
};

// =============================================================================
// 19. useSearchRepositories
//     Search public repositories with filters.
// =============================================================================

export interface UseSearchRepositoriesReturn {
  repositories: Repository[];
  pagination  : Pagination | null;
  loading     : boolean;
  error       : string | null;
  search      : (query: string, filters?: RepoListFilters) => void;
  reset       : () => void;
}

export const useSearchRepositories = (): UseSearchRepositoriesReturn => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pagination,   setPagination  ] = useState<Pagination | null>(null);
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRepositories([]);
    setPagination(null);
    setError(null);
  }, []);

  const search = useCallback(
    async (query: string, filters: RepoListFilters = {}) => {
      if (!query.trim()) {
        reset();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await repositoryService.searchRepositories(query, filters);
        setRepositories(result.repositories);
        setPagination(result.pagination);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [reset]
  );

  return { repositories, pagination, loading, error, search, reset };
};

// =============================================================================
// 20. useRepoPageData
//     Composite hook — loads everything needed for RepositoryPage in one call.
//     Avoids prop-drilling by co-locating all repo-page data fetching.
// =============================================================================

export interface UseRepoPageDataReturn {
  // Core data
  repository  : Repository | null;
  branches    : Branch[];
  branchNames : string[];
  files       : FileNode[];
  commits     : CommitSummary[];
  stats       : RepoStats | null;

  // Loading states (granular)
  repoLoading   : boolean;
  branchLoading : boolean;
  filesLoading  : boolean;
  commitsLoading: boolean;
  statsLoading  : boolean;

  // Errors (granular)
  repoError   : string | null;
  filesError  : string | null;
  commitsError: string | null;

  // Actions
  refetchCommits: () => void;

  // Pagination
  commitPagination: Pagination | null;
  hasMoreCommits  : boolean;

  // Actions
  refetchRepo: () => void;
  loadMoreCommits: () => void;
  resetCommits   : () => void;
}

export const useRepoPageData = (
  username    : string,
  repoName    : string,
  activeBranch: string,
  currentPath : string = ''
): UseRepoPageDataReturn => {
  const {
    data    : repository,
    loading : repoLoading,
    error   : repoError,
    refetch : refetchRepo,
  } = useRepository(username, repoName);

  const {
    data        : branchData,
    loading     : branchLoading,
    branchNames,
  } = useBranches(username, repoName);

  const {
    data   : files,
    loading: filesLoading,
    error  : filesError,
  } = useRepoFiles(username, repoName, activeBranch, currentPath);

  const {
    commits,
    pagination : commitPagination,
    loading    : commitsLoading,
    error      : commitsError,
    loadMore   : loadMoreCommits,
    hasMore    : hasMoreCommits,
    reset      : resetCommits,
    refetch    : refetchCommits,
  } = useCommits(username, repoName, activeBranch);

  const {
    data   : stats,
    loading: statsLoading,
  } = useRepoStats(username, repoName);

  return {
    // Data
    repository,
    branches    : branchData ?? [],
    branchNames,
    files       : files   ?? [],
    commits     : commits ?? [],
    stats,

    // Loadings
    repoLoading,
    branchLoading,
    filesLoading,
    commitsLoading,
    statsLoading,

    // Errors
    repoError,
    filesError,
    commitsError,

    // Pagination
    commitPagination,
    hasMoreCommits,

    // Actions
    refetchRepo,
    refetchCommits,
    loadMoreCommits,
    resetCommits,
  };
};