import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  // Core entities
  Repository,
  RawRepository,
  Branch,
  Commit,
  CommitSummary,
  FileNode,
  RepoStats,
  // Forms
  CreateRepositoryForm,
  // API response wrappers
  ApiResponse,
  PaginatedResponse,
  Pagination,
  // Primitives
  ObjectIdString,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL        : import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  withCredentials: true,
});

// ── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 globally ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stale token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Error extractor
// ─────────────────────────────────────────────────────────────────────────────
const extractError = (err: unknown): string => {
  if (err instanceof AxiosError) {
    // Use backend error message if available
    const backendError = (err.response?.data as { error?: string })?.error;
    return backendError ?? err.message ?? 'An unexpected error occurred';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalizer — converts RawRepository (ObjectId arrays) → Repository (counts)
// ─────────────────────────────────────────────────────────────────────────────
const normalizeRepository = (raw: RawRepository): Repository => ({
  ...raw,
  stars   : raw.starCount,
  forks   : raw.forkCount,
  watchers: raw.watcherCount,
});

// ─────────────────────────────────────────────────────────────────────────────
// Return types for social actions
// ─────────────────────────────────────────────────────────────────────────────
export interface StarActionResult {
  starCount: number;
  starred  : boolean;
}

export interface WatchActionResult {
  watcherCount: number;
  watching    : boolean;
}

export interface ForkActionResult {
  repository: Repository;
  forkCount : number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginated commits result
// ─────────────────────────────────────────────────────────────────────────────
export interface CommitsResult {
  commits   : CommitSummary[];
  pagination: Pagination;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository list filters
// ─────────────────────────────────────────────────────────────────────────────
export interface RepoListFilters {
  page    ?: number;
  limit   ?: number;
  sort    ?: 'createdAt' | 'updatedAt' | 'name' | 'stars';
  order   ?: 'asc' | 'desc';
  language?: string;
  topic   ?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Service
// ─────────────────────────────────────────────────────────────────────────────
export const repositoryService = {

  // ───────────────────────────────────────────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a new repository
   * POST /repositories
   */
  async createRepository(
    form: CreateRepositoryForm
  ): Promise<Repository> {
    try {
      const { data } = await api.post<ApiResponse<RawRepository>>(
        '/repos',
        form
      );
      return normalizeRepository(data.data);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Fetch a single repository by owner username + repo name
   * GET /repositories/:username/:repoName
   */
  async getRepository(
    username: string,
    repoName: string
  ): Promise<Repository> {
    try {
      const { data } = await api.get<ApiResponse<RawRepository>>(
        `/repos/${username}/${repoName}`
      );
      return normalizeRepository(data.data);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Fetch all public repositories (paginated)
   * GET /repositories
   */
  async getRepositories(
    filters: RepoListFilters = {}
  ): Promise<{ repositories: Repository[]; pagination: Pagination }> {
    try {
      const { data } = await api.get<PaginatedResponse<RawRepository>>(
        '/repos',
        { params: filters }
      );
      return {
        repositories: data.data.map(normalizeRepository),
        pagination  : data.pagination,
      };
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Fetch authenticated user's own repositories (paginated)
   * GET /repositories/my
   */
  async getMyRepositories(
    filters: Pick<RepoListFilters, 'page' | 'limit'> = {}
  ): Promise<{ repositories: Repository[]; pagination: Pagination }> {
    try {
      const { data } = await api.get<PaginatedResponse<RawRepository>>(
        '/repositories/my',
        { params: filters }
      );
      return {
        repositories: data.data.map(normalizeRepository),
        pagination  : data.pagination,
      };
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Fetch all repositories for a specific user
   * GET /repositories/user/:username
   */
  async getUserRepositories(
    username: string,
    filters : RepoListFilters = {}
  ): Promise<{ repositories: Repository[]; pagination: Pagination }> {
    try {
      const { data } = await api.get<PaginatedResponse<RawRepository>>(
        `/repositories/user/${username}`,
        { params: filters }
      );
      return {
        repositories: data.data.map(normalizeRepository),
        pagination  : data.pagination,
      };
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Delete a repository
   * DELETE /repositories/:username/:repoName
   */
  async deleteRepository(
    username: string,
    repoName: string
  ): Promise<void> {
    try {
      await api.delete(`/repositories/${username}/${repoName}`);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Update repository metadata (description, topics, homepage, etc.)
   * PATCH /repositories/:username/:repoName
   */
  async updateRepository(
    username: string,
    repoName: string,
    updates : Partial<
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
  ): Promise<Repository> {
    try {
      const { data } = await api.patch<ApiResponse<RawRepository>>(
        `/repositories/${username}/${repoName}`,
        updates
      );
      return normalizeRepository(data.data);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Branches
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Fetch all branches for a repository
   * GET /repositories/:username/:repoName/branches
   */
  async getBranches(
    username: string,
    repoName: string
  ): Promise<Branch[]> {
    try {
      const { data } = await api.get<ApiResponse<Branch[]>>(
        `/repositories/${username}/${repoName}/branches`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Get a single branch
   * GET /repositories/:username/:repoName/branches/:branch
   */
  async getBranch(
    username  : string,
    repoName  : string,
    branchName: string
  ): Promise<Branch> {
    try {
      const { data } = await api.get<ApiResponse<Branch>>(
        `/repositories/${username}/${repoName}/branches/${branchName}`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Commits
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Fetch commits (paginated) for a branch
   * GET /repositories/:username/:repoName/commits
   */
  async getCommits(
    username: string,
    repoName: string,
    branch  : string,
    page    : number = 1,
    limit   : number = 20
  ): Promise<CommitsResult> {
    console.log('repoService.getCommits - called with:', { username, repoName, branch, page, limit });

    try {
      const url = `/repositories/${username}/${repoName}/commits`;
      const params = { branch, page, limit };
      console.log('repoService.getCommits - making API call:', { url, params });

      const { data } = await api.get<PaginatedResponse<CommitSummary>>(
        url,
        { params }
      );

      console.log('repoService.getCommits - API response:', data);

      const result = {
        commits   : data.data,
        pagination: data.pagination,
      };

      console.log('repoService.getCommits - returning:', result);

      return result;
    } catch (err) {
      console.error('repoService.getCommits - error:', err);
      throw new Error(extractError(err));
    }
  },

  /**
   * Fetch a single commit by SHA
   * GET /repositories/:username/:repoName/commits/:sha
   */
  async getCommit(
    username: string,
    repoName: string,
    sha     : string
  ): Promise<Commit> {
    try {
      const { data } = await api.get<ApiResponse<Commit>>(
        `/repositories/${username}/${repoName}/commits/${sha}`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // File system
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Fetch file/directory listing for a branch + path
   * GET /repositories/:username/:repoName/files
   */
  async getRepositoryFiles(
    username: string,
    repoName: string,
    branch  : string,
    dirPath : string = ''
  ): Promise<FileNode[]> {
    try {
      const { data } = await api.get<ApiResponse<FileNode[]>>(
        `/repositories/${username}/${repoName}/files`,
        { params: { branch, path: dirPath } }
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Fetch raw file content (decoded string)
   * GET /repositories/:username/:repoName/contents
   */
  async getFileContent(
    username: string,
    repoName: string,
    branch  : string,
    filePath: string
  ): Promise<{ content: string; encoding: string; size: number }> {
    try {
      const { data } = await api.get<
        ApiResponse<{ content: string; encoding: string; size: number }>
      >(
        `/repositories/${username}/${repoName}/contents`,
        { params: { branch, path: filePath } }
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Social actions — Star
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check if the current authenticated user has starred the repo
   * GET /repositories/:username/:repoName/star
   */
  async checkStarred(
    username: string,
    repoName: string
  ): Promise<boolean> {
    try {
      await api.get(`/repositories/${username}/${repoName}/star`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Star a repository
   * POST /repositories/:username/:repoName/star
   */
  async starRepository(
    username: string,
    repoName: string
  ): Promise<StarActionResult> {
    try {
      const { data } = await api.post<ApiResponse<StarActionResult>>(
        `/repositories/${username}/${repoName}/star`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Unstar a repository
   * DELETE /repositories/:username/:repoName/star
   */
  async unstarRepository(
    username: string,
    repoName: string
  ): Promise<StarActionResult> {
    try {
      const { data } = await api.delete<ApiResponse<StarActionResult>>(
        `/repositories/${username}/${repoName}/star`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Social actions — Watch
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check if the current authenticated user is watching the repo
   * GET /repositories/:username/:repoName/watch
   */
  async checkWatching(
    username: string,
    repoName: string
  ): Promise<boolean> {
    try {
      await api.get(`/repositories/${username}/${repoName}/watch`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Watch a repository
   * POST /repositories/:username/:repoName/watch
   */
  async watchRepository(
    username: string,
    repoName: string
  ): Promise<WatchActionResult> {
    try {
      const { data } = await api.post<ApiResponse<WatchActionResult>>(
        `/repositories/${username}/${repoName}/watch`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Unwatch a repository
   * DELETE /repositories/:username/:repoName/watch
   */
  async unwatchRepository(
    username: string,
    repoName: string
  ): Promise<WatchActionResult> {
    try {
      const { data } = await api.delete<ApiResponse<WatchActionResult>>(
        `/repositories/${username}/${repoName}/watch`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Social actions — Fork
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Fork a repository into the authenticated user's account
   * POST /repositories/:username/:repoName/fork
   */
  async forkRepository(
    username: string,
    repoName: string
  ): Promise<ForkActionResult> {
    try {
      const { data } = await api.post<ApiResponse<{
        repository: RawRepository;
        forkCount : number;
      }>>(
        `/repositories/${username}/${repoName}/fork`
      );
      return {
        repository: normalizeRepository(data.data.repository),
        forkCount : data.data.forkCount,
      };
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Stats
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Fetch repository stats (commits, contributors, branches, releases)
   * GET /repositories/:username/:repoName/stats
   */
  async getRepositoryStats(
    username: string,
    repoName: string
  ): Promise<RepoStats> {
    try {
      const { data } = await api.get<ApiResponse<RepoStats>>(
        `/repositories/${username}/${repoName}/stats`
      );
      return data.data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Collaborators
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Add a collaborator to a repository
   * POST /repositories/:username/:repoName/collaborators
   */
  async addCollaborator(
    username      : string,
    repoName      : string,
    collaboratorId: ObjectIdString,
    role          : 'read' | 'write' | 'admin' = 'read'
  ): Promise<Repository> {
    try {
      const { data } = await api.post<ApiResponse<RawRepository>>(
        `/repositories/${username}/${repoName}/collaborators`,
        { userId: collaboratorId, role }
      );
      return normalizeRepository(data.data);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  /**
   * Remove a collaborator from a repository
   * DELETE /repositories/:username/:repoName/collaborators/:userId
   */
  async removeCollaborator(
    username      : string,
    repoName      : string,
    collaboratorId: ObjectIdString
  ): Promise<Repository> {
    try {
      const { data } = await api.delete<ApiResponse<RawRepository>>(
        `/repositories/${username}/${repoName}/collaborators/${collaboratorId}`
      );
      return normalizeRepository(data.data);
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Topics
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Replace all topics on a repository
   * PUT /repositories/:username/:repoName/topics
   */
  async updateTopics(
    username: string,
    repoName: string,
    topics  : string[]
  ): Promise<string[]> {
    try {
      const { data } = await api.put<ApiResponse<{ topics: string[] }>>(
        `/repositories/${username}/${repoName}/topics`,
        { topics }
      );
      return data.data.topics;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Search
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Search public repositories
   * GET /repositories/search
   */
  async searchRepositories(
    query  : string,
    filters: RepoListFilters = {}
  ): Promise<{ repositories: Repository[]; pagination: Pagination }> {
    try {
      const { data } = await api.get<PaginatedResponse<RawRepository>>(
        '/repositories/search',
        { params: { q: query, ...filters } }
      );
      return {
        repositories: data.data.map(normalizeRepository),
        pagination  : data.pagination,
      };
    } catch (err) {
      throw new Error(extractError(err));
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Export api instance for use in other services (authService, issueService…)
// ─────────────────────────────────────────────────────────────────────────────
export { api };