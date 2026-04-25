import mongoose, { Schema, Model } from 'mongoose';
import {
  IProject,
  IProjectModel,
  IProjectColumnInput,
  ProjectTemplate,
} from '../types/project';

const projectItemSchema = new Schema(
  {
    title      : { type: String, required: true, trim: true },
    body       : { type: String, default: '' },
    status     : {
      type   : String,
      enum   : ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    priority   : {
      type   : String,
      enum   : ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignees  : [{ type: Schema.Types.ObjectId, ref: 'User' }],
    labels     : [{ type: String, trim: true }],
    dueDate    : { type: Date, default: null },
    position   : { type: Number, default: 0 },
    linkedIssue: { type: Schema.Types.ObjectId, ref: 'Issue',       default: null },
    linkedPR   : { type: Schema.Types.ObjectId, ref: 'PullRequest', default: null },
  },
  { timestamps: true }
);

const projectColumnSchema = new Schema(
  {
    name    : { type: String, required: true, trim: true },
    color   : { type: String, default: '#6366f1' },
    position: { type: Number, default: 0 },
    items   : [projectItemSchema],
  },
  { timestamps: true }
);

const projectSchema = new Schema<IProject>(
  {
    name       : { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    status     : { type: String, enum: ['open', 'closed'],    default: 'open'    },
    visibility : { type: String, enum: ['private', 'public'], default: 'private' },
    template   : {
      type   : String,
      enum   : ['blank', 'backlog', 'feature_releases', 'bug_tracker', 'roadmap', 'sprint'],
      default: 'blank',
    },
    owner      : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    repository : { type: Schema.Types.ObjectId, ref: 'Repository', default: null },
    members    : [
      {
        user   : { type: Schema.Types.ObjectId, ref: 'User' },
        role   : { type: String, enum: ['viewer', 'editor', 'admin'], default: 'editor' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    columns  : [projectColumnSchema],
    itemCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON    : { virtuals: true },
    toObject  : { virtuals: true },
  }
);

// ── Virtual ───────────────────────────────────────────────────────────────────

projectSchema.virtual('items').get(function (this: IProject) {
  return this.columns.reduce((sum, col) => sum + col.items.length, 0);
});

// ── Pre-save ──────────────────────────────────────────────────────────────────

projectSchema.pre('save', function (this: IProject, next) {
  this.itemCount = this.columns.reduce((sum, col) => sum + col.items.length, 0);
  next();
});

// ── Static ────────────────────────────────────────────────────────────────────

const COLUMN_SETS: Record<ProjectTemplate, string[]> = {
  blank            : ['To Do', 'In Progress', 'Done'],
  backlog          : ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done'],
  feature_releases : ['Planned', 'In Development', 'In Review', 'Released'],
  bug_tracker      : ['New', 'Triaged', 'In Progress', 'Fixed', 'Closed'],
  roadmap          : ['Now', 'Next', 'Later', 'Completed'],
  sprint           : ['Sprint Backlog', 'In Progress', 'Testing', 'Done'],
};

// ✅ Returns IProjectColumnInput — no _id / timestamps required
projectSchema.statics.defaultColumns = function (
  template: ProjectTemplate
): IProjectColumnInput[] {
  const names = COLUMN_SETS[template] ?? COLUMN_SETS.blank;
  return names.map((name, position) => ({
    name,
    color   : '#6366f1',
    position,
    items   : [],
  }));
};

type ProjectModel = Model<IProject> & IProjectModel;

const Project = mongoose.model<IProject, ProjectModel>('Project', projectSchema);

export default Project;