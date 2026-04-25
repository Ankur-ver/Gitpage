import mongoose, { Document, Schema, Model } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export type RepositoryStatus     = 'creating' | 'ready' | 'failed';
export type CollaboratorRole     = 'read' | 'write' | 'admin';
export type RepositoryVisibility = 'public' | 'private';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-document interfaces
// ─────────────────────────────────────────────────────────────────────────────
export interface ICollaborator {
  user : mongoose.Types.ObjectId;
  role : CollaboratorRole;
}

export interface IInitOptions {
  initializeWithReadme : boolean;
  gitignoreTemplate    : string;
  licenseTemplate      : string;
}

export interface ICloneUrls {
  http : string;
  ssh  : string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Repository document interface
// ─────────────────────────────────────────────────────────────────────────────
export interface IRepository extends Document {
  _id : mongoose.Types.ObjectId;

  // ── Core identity ──────────────────────────────────────────────────────────
  name         : string;
  fullName     : string;           // auto-set as "ownerUsername/name"
  description  : string;
  owner        : mongoose.Types.ObjectId;
  ownerUsername: string;

  // ── Visibility & state ─────────────────────────────────────────────────────
  private     : boolean;           // kept from your original schema
  visibility  : RepositoryVisibility; // "public" | "private" (mirrors private field)
  archived    : boolean;
  disabled    : boolean;
  status      : RepositoryStatus;  // "creating" | "ready" | "failed"

  // ── Fork info ──────────────────────────────────────────────────────────────
  fork       : boolean;
  forkedFrom?: mongoose.Types.ObjectId;

  // ── Social counts ──────────────────────────────────────────────────────────
  stars   : mongoose.Types.ObjectId[];
  forks   : mongoose.Types.ObjectId[];
  watchers: mongoose.Types.ObjectId[];

  // ── Metadata ───────────────────────────────────────────────────────────────
  language?     : string;
  topics        : string[];
  defaultBranch : string;
  size          : number;
  openIssues    : number;
  license?      : string;
  homepage?     : string;

  // ── Git internals ──────────────────────────────────────────────────────────
  gitPath      : string;
  cloneUrls    : ICloneUrls;
  isInitialized: boolean;
  initOptions  : IInitOptions;

  // ── Collaborators ──────────────────────────────────────────────────────────
  collaborators: ICollaborator[];

  // ── Timestamps (from mongoose { timestamps: true }) ────────────────────────
  createdAt: Date;
  updatedAt: Date;

  // ── Virtuals ───────────────────────────────────────────────────────────────
  starCount : number;
  forkCount : number;
  watcherCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository model interface (for statics if needed later)
// ─────────────────────────────────────────────────────────────────────────────
export interface IRepositoryModel extends Model<IRepository> {}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-document schemas
// ─────────────────────────────────────────────────────────────────────────────
const CollaboratorSchema = new Schema<ICollaborator>(
  {
    user: {
      type     : Schema.Types.ObjectId,
      ref      : 'User',
      required : true,
    },
    role: {
      type    : String,
      enum    : {
        values  : ['read', 'write', 'admin'] as CollaboratorRole[],
        message : 'Role must be read, write, or admin',
      },
      default : 'read',
    },
  },
  { _id: false }  // no separate _id for sub-docs
);

const InitOptionsSchema = new Schema<IInitOptions>(
  {
    initializeWithReadme : { type: Boolean, default: false },
    gitignoreTemplate    : { type: String,  default: ''    },
    licenseTemplate      : { type: String,  default: ''    },
  },
  { _id: false }
);

const CloneUrlsSchema = new Schema<ICloneUrls>(
  {
    http : { type: String, default: '' },
    ssh  : { type: String, default: '' },
  },
  { _id: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Repository Schema
// ─────────────────────────────────────────────────────────────────────────────
const RepoSchema = new Schema<IRepository, IRepositoryModel>(
  {
    // ── Core identity ────────────────────────────────────────────────────────
    name: {
      type      : String,
      required  : [true, 'Repository name is required'],
      trim      : true,
      minlength : [1,   'Repository name must be at least 1 character'],
      maxlength : [100, 'Repository name cannot exceed 100 characters'],
      match     : [
        /^[a-zA-Z0-9._-]+$/,
        'Repository name can only contain letters, numbers, dots, hyphens and underscores',
      ],
    },

    fullName: {
      type     : String,
      required : true,
      unique   : true,
      trim     : true,
    },

    description: {
      type      : String,
      default   : '',
      trim      : true,
      maxlength : [500, 'Description cannot exceed 500 characters'],
    },

    owner: {
      type     : Schema.Types.ObjectId,
      ref      : 'User',
      required : [true, 'Owner is required'],
    },

    ownerUsername: {
      type     : String,
      required : [true, 'Owner username is required'],
      trim     : true,
      lowercase: true,
    },

    // ── Visibility & state ───────────────────────────────────────────────────

    // Original boolean field — kept for backwards compatibility
    private: {
      type    : Boolean,
      default : false,
    },

    // New string-based visibility field
    visibility: {
      type    : String,
      enum    : {
        values  : ['public', 'private'] as RepositoryVisibility[],
        message : 'Visibility must be public or private',
      },
      default : 'public',
    },

    archived: {
      type    : Boolean,
      default : false,
    },

    disabled: {
      type    : Boolean,
      default : false,
    },

    status: {
      type    : String,
      enum    : {
        values  : ['creating', 'ready', 'failed'] as RepositoryStatus[],
        message : 'Status must be creating, ready, or failed',
      },
      default : 'creating',
    },

    // ── Fork info ────────────────────────────────────────────────────────────
    fork: {
      type    : Boolean,
      default : false,
    },

    forkedFrom: {
      type    : Schema.Types.ObjectId,
      ref     : 'Repository',
      default : null,
    },

    // ── Social counts ────────────────────────────────────────────────────────
    stars: [
      {
        type : Schema.Types.ObjectId,
        ref  : 'User',
      },
    ],

    forks: [
      {
        type : Schema.Types.ObjectId,
        ref  : 'Repository',
      },
    ],

    watchers: [
      {
        type : Schema.Types.ObjectId,
        ref  : 'User',
      },
    ],

    // ── Metadata ─────────────────────────────────────────────────────────────
    language: {
      type    : String,
      default : 'none',
      trim    : true,
    },

    topics: [
      {
        type : String,
        trim : true,
      },
    ],

    defaultBranch: {
      type    : String,
      default : 'main',
      trim    : true,
    },

    size: {
      type    : Number,
      default : 0,
      min     : [0, 'Size cannot be negative'],
    },

    openIssues: {
      type    : Number,
      default : 0,
      min     : [0, 'Open issues cannot be negative'],
    },

    license: {
      type    : String,
      default : '',
      trim    : true,
    },

    homepage: {
      type    : String,
      default : '',
      trim    : true,
    },

    // ── Git internals ────────────────────────────────────────────────────────
    gitPath: {
      type     : String,
      required : [true, 'Git storage path is required'],
    },

    cloneUrls: {
      type    : CloneUrlsSchema,
      default : () => ({ http: '', ssh: '' }),
    },

    isInitialized: {
      type    : Boolean,
      default : false,
    },

    initOptions: {
      type    : InitOptionsSchema,
      default : () => ({
        initializeWithReadme : false,
        gitignoreTemplate    : '',
        licenseTemplate      : '',
      }),
    },

    // ── Collaborators ────────────────────────────────────────────────────────
    collaborators: {
      type    : [CollaboratorSchema],
      default : [],
    },
  },
  {
    timestamps : true,
    toJSON     : { virtuals: true },
    toObject   : { virtuals: true },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Pre-save middleware
// ─────────────────────────────────────────────────────────────────────────────

// Auto-sync `private` boolean with `visibility` string
// so both fields are always consistent
RepoSchema.pre<IRepository>('save', function (next) {
  // If visibility was changed, sync private field
  if (this.isModified('visibility')) {
    this.private = this.visibility === 'private';
  }

  // If private was changed, sync visibility field
  if (this.isModified('private') && !this.isModified('visibility')) {
    this.visibility = this.private ? 'private' : 'public';
  }

  // Auto-set fullName if name or ownerUsername changed
  if (this.isModified('name') || this.isModified('ownerUsername')) {
    this.fullName = `${this.ownerUsername}/${this.name}`;
  }

  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Virtuals
// ─────────────────────────────────────────────────────────────────────────────
RepoSchema.virtual('starCount').get(function (this: IRepository): number {
  return this.stars.length;
});

RepoSchema.virtual('forkCount').get(function (this: IRepository): number {
  return this.forks.length;
});

RepoSchema.virtual('watcherCount').get(function (this: IRepository): number {
  return this.watchers.length;
});

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// From your original schema
RepoSchema.index({ fullName: 1 });
RepoSchema.index({ owner: 1 });
RepoSchema.index({ name: 'text', description: 'text' });   // full-text search

// New indexes
RepoSchema.index({ owner: 1, name: 1 },           { unique: true });  // no duplicate repo names per owner
RepoSchema.index({ ownerUsername: 1, name: 1 },   { unique: true });  // lookup by username/repo
RepoSchema.index({ visibility: 1, status: 1 });                       // filter public + ready repos
RepoSchema.index({ status: 1 });                                       // filter by status
RepoSchema.index({ createdAt: -1 });                                   // sort newest first
RepoSchema.index({ 'stars': 1 });                                      // star-based queries
RepoSchema.index({ topics: 1 });                                       // topic filtering
RepoSchema.index({ language: 1 });                                     // language filtering

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
export default mongoose.model<IRepository, IRepositoryModel>(
  'Repository',
  RepoSchema
);