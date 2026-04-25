import { Document, Types } from 'mongoose';

export type ItemStatus        = 'todo' | 'in_progress' | 'in_review' | 'done';
export type ItemPriority      = 'low' | 'medium' | 'high' | 'critical';
export type ProjectStatus     = 'open' | 'closed';
export type ProjectVisibility = 'private' | 'public';
export type ProjectTemplate   =
  | 'blank'
  | 'backlog'
  | 'feature_releases'
  | 'bug_tracker'
  | 'roadmap'
  | 'sprint';
export type MemberRole = 'viewer' | 'editor' | 'admin';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IProjectItem {
  _id        : Types.ObjectId;
  title      : string;
  body       : string;
  status     : ItemStatus;
  priority   : ItemPriority;
  assignees  : Types.ObjectId[];
  labels     : string[];
  dueDate    : Date | null;
  position   : number;
  linkedIssue: Types.ObjectId | null;
  linkedPR   : Types.ObjectId | null;
  createdAt  : Date;
  updatedAt  : Date;
}

// ✅ Full document shape (what Mongoose stores)
export interface IProjectColumn {
  _id      : Types.ObjectId;
  name     : string;
  color    : string;
  position : number;
  items    : IProjectItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Input shape (what we pass when creating — Mongoose fills the rest)
export interface IProjectColumnInput {
  name    : string;
  color  ?: string;
  position: number;
  items   : IProjectItem[];
}

export interface IProjectMember {
  user   : Types.ObjectId;
  role   : MemberRole;
  addedAt: Date;
}

export interface IProject extends Document {
  name       : string;
  description: string;
  status     : ProjectStatus;
  visibility : ProjectVisibility;
  template   : ProjectTemplate;
  owner      : Types.ObjectId;
  repository : Types.ObjectId | null;
  members    : IProjectMember[];
  columns    : IProjectColumn[];
  itemCount  : number;
  items      : number;
  createdAt  : Date;
  updatedAt  : Date;
}

export interface IProjectModel {
  defaultColumns(template: ProjectTemplate): IProjectColumnInput[];
}

// ── Request body types ────────────────────────────────────────────────────────

export interface CreateProjectBody {
  name        : string;
  description?: string;
  visibility ?: ProjectVisibility;
  template   ?: ProjectTemplate;
  repositoryId?: string;
}

export interface UpdateProjectBody {
  name       ?: string;
  description?: string;
  status     ?: ProjectStatus;
  visibility ?: ProjectVisibility;
}

export interface AddColumnBody {
  name  : string;
  color?: string;
}

export interface UpdateColumnBody {
  name    ?: string;
  color   ?: string;
  position?: number;
}

export interface AddItemBody {
  title    : string;
  body    ?: string;
  priority?: ItemPriority;
  labels  ?: string[];
  dueDate ?: string;
  assignees?: string[];
}

export interface UpdateItemBody {
  title    ?: string;
  body     ?: string;
  status   ?: ItemStatus;
  priority ?: ItemPriority;
  labels   ?: string[];
  dueDate  ?: string | null;
  assignees?: string[];
  position ?: number;
}

export interface MoveItemBody {
  targetColumnId: string;
  position      ?: number;
}

export interface AddMemberBody {
  userId: string;
  role  ?: MemberRole;
}