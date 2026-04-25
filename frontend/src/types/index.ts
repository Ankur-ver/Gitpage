// =============================================================================
// types/index.ts  —  GitPage Frontend Unified Type Definitions
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Utility / Primitive types
// ─────────────────────────────────────────────────────────────────────────────

/** ISO 8601 date string — e.g. "2024-01-01T00:00:00.000Z" */
export type ISODateString = string;

/** MongoDB ObjectId as string (from API responses) */
export type ObjectIdString = string;

/** Hex color string — e.g. "#ff0000" */
export type HexColor = string;

// ─────────────────────────────────────────────────────────────────────────────
// Enum / Union types
// ─────────────────────────────────────────────────────────────────────────────

export type UserPlan             = 'free' | 'pro' | 'enterprise';
export type RepositoryVisibility = 'public' | 'private';
export type RepositoryStatus     = 'creating' | 'ready' | 'failed';
export type CollaboratorRole     = 'read' | 'write' | 'admin';
export type IssueState           = 'open' | 'closed';
export type PullRequestState     = 'open' | 'closed' | 'merged';
export type WorkflowStatus       = 'queued' | 'in_progress' | 'completed';
export type WorkflowConclusion   = 'success' | 'failure' | 'cancelled' | 'skipped';
export type FileNodeType         = 'file' | 'dir';
export type AIAnalysisType       = 'bug' | 'security' | 'performance' | 'style' | 'suggestion';
export type AIAnalysisSeverity   = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type ChatRole             = 'user' | 'assistant';
export type NotificationType     = 'star' | 'fork' | 'issue' | 'pull_request' | 'mention' | 'review';
export type SortOrder            = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// Generic API Response types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success : boolean;
  data    : T;
  message?: string;
  error  ?: string;
}

export interface PaginatedResponse<T> {
  success   : boolean;
  data      : T[];
  error    ?: string;
  pagination: Pagination;
}

export interface Pagination {
  page : number;
  limit: number;
  total: number;
  pages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id          : ObjectIdString;
  username    : string;
  email       : string;
  avatarUrl  ?: string;
  bio        ?: string;
  location   ?: string;
  website    ?: string;
  company    ?: string;
  followers   : number;
  following   : number;
  publicRepos : number;
  createdAt   : ISODateString;
  plan        : UserPlan;
}

/**
 * Minimal user shape returned in nested objects
 * e.g. commit author, issue author, repo owner
 */
export interface UserSummary {
  id       : ObjectIdString;
  username : string;
  avatarUrl?: string;
  bio      ?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository sub-document types
// ─────────────────────────────────────────────────────────────────────────────

export interface ICollaborator {
  user: ObjectIdString | UserSummary;
  role: CollaboratorRole;
}

export interface IInitOptions {
  initializeWithReadme : boolean;
  gitignoreTemplate    : string;
  licenseTemplate      : string;
}

export interface ICloneUrls {
  http: string;
  ssh : string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export interface Repository {
  // ── Identity ──────────────────────────────────────────────────────────────
  id           : ObjectIdString;
  name         : string;
  fullName     : string;               // "ownerUsername/repoName"
  description  : string;
  owner        : User | UserSummary;
  ownerUsername: string;

  // ── Visibility & lifecycle ────────────────────────────────────────────────
  private    : boolean;                // mirrors visibility === 'private'
  visibility : RepositoryVisibility;
  archived   : boolean;
  disabled   : boolean;
  status     : RepositoryStatus;

  // ── Fork ──────────────────────────────────────────────────────────────────
  fork       : boolean;
  forkedFrom?: ObjectIdString;

  // ── Social — UI uses counts, not arrays ───────────────────────────────────
  stars   : number;
  forks   : number;
  watchers: number;

  // ── Metadata ──────────────────────────────────────────────────────────────
  language     ?: string;
  topics        : string[];
  defaultBranch : string;
  size          : number;              // in bytes
  openIssues    : number;
  license      ?: string;
  homepage     ?: string;

  // ── Git internals ─────────────────────────────────────────────────────────
  cloneUrls    : ICloneUrls;
  isInitialized: boolean;
  initOptions  : IInitOptions;

  // ── Collaborators ─────────────────────────────────────────────────────────
  collaborators: ICollaborator[];

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Raw repository shape returned directly from MongoDB API
 * before normalization — stars/forks/watchers are ObjectId arrays
 * and virtual count fields are separate.
 * Used in hooks/services before transforming to Repository.
 */
export interface RawRepository
  extends Omit<Repository, 'stars' | 'forks' | 'watchers'> {
  stars       : ObjectIdString[];
  forks       : ObjectIdString[];
  watchers    : ObjectIdString[];
  starCount   : number;                // virtual from backend
  forkCount   : number;                // virtual from backend
  watcherCount: number;                // virtual from backend
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Stats  (used in Insights tab)
// ─────────────────────────────────────────────────────────────────────────────

export interface RepoStats {
  totalCommits: number;
  contributors: number;
  branches    : number;
  releases    : number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch
// ─────────────────────────────────────────────────────────────────────────────

export interface Branch {
  name     : string;
  commit   : { sha: string; url: string };
  protected: boolean;
  isDefault: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commit
// ─────────────────────────────────────────────────────────────────────────────

export interface CommitAuthor {
  name : string;
  email: string;
  date : ISODateString;
}

export interface Commit {
  sha      : string;
  message  : string;
  author   : CommitAuthor;
  committer: CommitAuthor;
  url      : string;
  stats   ?: {
    additions: number;
    deletions: number;
    total    : number;
  };
}

/**
 * Simplified commit shape used in:
 * - CommitHistory component
 * - File explorer last-commit column
 * - Repo header last-commit bar
 */
export interface CommitSummary {
  sha      : string;
  message  : string;
  author   : string;
  date     : ISODateString;
  additions: number;
  deletions: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// File System
// ─────────────────────────────────────────────────────────────────────────────

export interface FileNode {
  name      : string;
  path      : string;
  type      : FileNodeType;
  size     ?: number;
  sha       : string;
  lastCommit?: {
    message: string;
    date   : ISODateString;
    author : string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Label
// ─────────────────────────────────────────────────────────────────────────────

export interface Label {
  id          : ObjectIdString;
  name        : string;
  color       : HexColor;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comment
// ─────────────────────────────────────────────────────────────────────────────

export interface Comment {
  id        : ObjectIdString;
  body      : string;
  author    : UserSummary;
  createdAt : ISODateString;
  updatedAt : ISODateString;
  reactions : CommentReactions;
  edited    : boolean;
}

export interface CommentReactions {
  '👍'?: number;
  '👎'?: number;
  '😄'?: number;
  '🎉'?: number;
  '😕'?: number;
  '❤️'?: number;
  '🚀'?: number;
  '👀'?: number;
  [key: string]: number | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Issue
// ─────────────────────────────────────────────────────────────────────────────

export interface Issue {
  id        : ObjectIdString;
  number    : number;
  title     : string;
  body      : string;
  state     : IssueState;
  author    : UserSummary;
  labels    : Label[];
  assignees : UserSummary[];
  comments  : number;
  reactions : CommentReactions;
  milestone?: Milestone;
  locked    : boolean;
  createdAt : ISODateString;
  updatedAt : ISODateString;
  closedAt ?: ISODateString;
  closedBy ?: UserSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pull Request
// ─────────────────────────────────────────────────────────────────────────────

export interface PullRequest {
  id          : ObjectIdString;
  number      : number;
  title       : string;
  body        : string;
  state       : PullRequestState;
  author      : UserSummary;
  labels      : Label[];
  assignees   : UserSummary[];
  reviewers   : UserSummary[];
  comments    : number;
  commits     : number;
  additions   : number;
  deletions   : number;
  changedFiles: number;
  baseBranch  : string;
  headBranch  : string;
  draft       : boolean;
  mergeable  ?: boolean;
  milestone  ?: Milestone;
  createdAt   : ISODateString;
  updatedAt   : ISODateString;
  mergedAt   ?: ISODateString;
  mergedBy   ?: UserSummary;
  closedAt   ?: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone
// ─────────────────────────────────────────────────────────────────────────────

export interface Milestone {
  id          : ObjectIdString;
  number      : number;
  title       : string;
  description?: string;
  state       : 'open' | 'closed';
  dueOn      ?: ISODateString;
  openIssues  : number;
  closedIssues: number;
  createdAt   : ISODateString;
  updatedAt   : ISODateString;
  closedAt   ?: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Release
// ─────────────────────────────────────────────────────────────────────────────

export interface Release {
  id         : ObjectIdString;
  tagName    : string;
  name       : string;
  body       : string;
  draft      : boolean;
  prerelease : boolean;
  author     : UserSummary;
  assets     : ReleaseAsset[];
  createdAt  : ISODateString;
  publishedAt: ISODateString;
}

export interface ReleaseAsset {
  id             : ObjectIdString;
  name           : string;
  size           : number;
  downloadCount  : number;
  contentType    : string;
  downloadUrl    : string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow / Actions
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowRun {
  id          : ObjectIdString;
  name        : string;
  status      : WorkflowStatus;
  conclusion ?: WorkflowConclusion;
  branch      : string;
  commit      : string;
  triggeredBy : string;
  startedAt   : ISODateString;
  completedAt?: ISODateString;
  duration   ?: number;            // seconds
}

export interface WorkflowJob {
  id         : ObjectIdString;
  name       : string;
  status     : WorkflowStatus;
  conclusion?: WorkflowConclusion;
  startedAt  : ISODateString;
  completedAt: ISODateString;
  steps      : WorkflowStep[];
}

export interface WorkflowStep {
  name       : string;
  status     : WorkflowStatus;
  conclusion?: WorkflowConclusion;
  number     : number;
  startedAt  : ISODateString;
  completedAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export interface AIAnalysis {
  id        : ObjectIdString;
  type      : AIAnalysisType;
  severity  : AIAnalysisSeverity;
  file      : string;
  line     ?: number;
  message   : string;
  suggestion?: string;
  autoFix  ?: string;
}

export interface ChatMessage {
  role     : ChatRole;
  content  : string;
  timestamp: ISODateString;
}

export interface AICodeReviewResult {
  summary  : string;
  analyses : AIAnalysis[];
  score    : number;           // 0–100
  createdAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id        : ObjectIdString;
  type      : NotificationType;
  read      : boolean;
  actor     : UserSummary;
  repository: Pick<Repository, 'id' | 'name' | 'fullName' | 'ownerUsername'>;
  subject  ?: string;
  url       : string;
  createdAt : ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchResults {
  repositories: Repository[];
  users       : User[];
  issues      : Issue[];
  total       : number;
}

export interface SearchFilters {
  query   : string;
  language: string;
  sort    : 'stars' | 'forks' | 'updated' | 'created';
  order   : SortOrder;
  page    : number;
  limit   : number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form / Input types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRepositoryForm {
  name               : string;
  description        : string;
  visibility         : RepositoryVisibility;
  initializeWithReadme: boolean;
  gitignoreTemplate  : string;
  licenseTemplate    : string;
}

export interface CreateIssueForm {
  title    : string;
  body     : string;
  labels   : ObjectIdString[];
  assignees: ObjectIdString[];
  milestone: ObjectIdString | null;
}

export interface CreatePullRequestForm {
  title     : string;
  body      : string;
  baseBranch: string;
  headBranch: string;
  draft     : boolean;
  labels    : ObjectIdString[];
  assignees : ObjectIdString[];
  reviewers : ObjectIdString[];
}

export interface UpdateProfileForm {
  bio     : string;
  location: string;
  website : string;
  company : string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redux State slices
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean;
  user           : User | null;
  token          : string | null;
  loading        : boolean;
  error          : string | null;
}

export interface RepoState {
  repositories : Repository[];
  currentRepo  : Repository | null;
  branches     : Branch[];
  currentBranch: string;
  files        : FileNode[];
  commits      : CommitSummary[];
  stats        : RepoStats | null;
  loading      : boolean;
  error        : string | null;
}

export interface IssueStateSlice {
  issues      : Issue[];
  currentIssue: Issue | null;
  comments    : Comment[];
  labels      : Label[];
  milestones  : Milestone[];
  loading     : boolean;
  error       : string | null;
  pagination  : Pagination;
}

export interface PullRequestStateSlice {
  pullRequests    : PullRequest[];
  currentPR       : PullRequest | null;
  comments        : Comment[];
  loading         : boolean;
  error           : string | null;
  pagination      : Pagination;
}

export interface AIState {
  analyses    : AIAnalysis[];
  chatHistory : ChatMessage[];
  reviewResult: AICodeReviewResult | null;
  loading     : boolean;
  error       : string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount  : number;
  loading      : boolean;
  error        : string | null;
}

export interface UIState {
  theme      : 'light' | 'dark';
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  modal      : ModalState | null;
}

export interface ModalState {
  type   : string;
  payload: Record<string, unknown>;
}

export interface SearchState {
  results : SearchResults | null;
  filters : SearchFilters;
  loading : boolean;
  error   : string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redux Root State
// ─────────────────────────────────────────────────────────────────────────────

export interface RootState {
  auth        : AuthState;
  repo        : RepoState;
  issues      : IssueStateSlice;
  pullRequests: PullRequestStateSlice;
  ai          : AIState;
  notifications: NotificationState;
  ui          : UIState;
  search      : SearchState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component prop helper types
// ─────────────────────────────────────────────────────────────────────────────

/** Any component that accepts a className override */
export interface WithClassName {
  className?: string;
}

/** Any component that accepts children */
export interface WithChildren {
  children: React.ReactNode;
}

/** Loading + error state used across all async components */
export interface AsyncComponentState {
  loading: boolean;
  error  : string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab types used in RepositoryPage
// ─────────────────────────────────────────────────────────────────────────────

export type RepositoryTab =
  | 'code'
  | 'issues'
  | 'pulls'
  | 'actions'
  | 'projects'
  | 'wiki'
  | 'security'
  | 'insights'
  | 'ai'
  | 'settings';

export type CodeView = 'files' | 'code' | 'commits';

export interface RepositoryTabConfig {
  id    : RepositoryTab;
  label : string;
  icon  : React.ReactNode;
  count?: number;
}