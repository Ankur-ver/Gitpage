import { Document, Types } from "mongoose";
import { Request } from "express";

// ─────────────────────────────────────────────────────────────────────────────
// User types
// ─────────────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  avatar: string;
  bio: string;
  repositories: Types.ObjectId[];
  comparePassword(enteredPassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository types
// ─────────────────────────────────────────────────────────────────────────────
export type RepositoryVisibility = "public" | "private";
export type RepositoryStatus = "creating" | "ready" | "failed";
export type CollaboratorRole = "read" | "write" | "admin";

export interface ICollaborator {
  user: Types.ObjectId;
  role: CollaboratorRole;
}

export interface IInitOptions {
  initializeWithReadme: boolean;
  gitignoreTemplate: string;
  licenseTemplate: string;
}

export interface ICloneUrls {
  http: string;
  ssh: string;
}

export interface IRepository extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  owner: Types.ObjectId | IUser;
  ownerUsername: string;
  visibility: RepositoryVisibility;
  defaultBranch: string;
  isInitialized: boolean;
  status: RepositoryStatus;
  initOptions: IInitOptions;
  storageSize: number;
  stars: Types.ObjectId[];
  forks: Types.ObjectId[];
  forkedFrom: Types.ObjectId | null;
  topics: string[];
  collaborators: ICollaborator[];
  gitPath: string;
  cloneUrls: ICloneUrls;
  fullName: string;     // virtual
  starCount: number;    // virtual
  forkCount: number;    // virtual
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request body types
// ─────────────────────────────────────────────────────────────────────────────
export interface CreateRepositoryBody {
  name: string;
  description?: string;
  visibility?: RepositoryVisibility;
  initializeWithReadme?: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: "asc" | "desc";
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended Express Request with authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user: IUser;
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT payload type
// ─────────────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Git operations return types
// ─────────────────────────────────────────────────────────────────────────────
export interface GitOperationResult {
  success: boolean;
  path?: string;
}

export interface InitRepositoryOptions {
  initializeWithReadme: boolean;
  gitignoreTemplate: string;
  licenseTemplate: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response types
// ─────────────────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  details?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RepositoryResponseData {
  id: Types.ObjectId;
  name: string;
  fullName: string;
  description: string;
  visibility: RepositoryVisibility;
  owner: {
    id: Types.ObjectId;
    username: string;
  };
  defaultBranch: string;
  isInitialized: boolean;
  status: RepositoryStatus;
  cloneUrls: ICloneUrls;
  starCount: number;
  forkCount: number;
  createdAt: Date;
  htmlUrl: string;
}