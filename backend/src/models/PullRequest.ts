import mongoose, { Document, Schema } from 'mongoose';

export interface IPullRequest extends Document {
  repoId:      mongoose.Types.ObjectId;
  number:      number;
  title:       string;
  body:        string;
  state:       'open'|'closed'|'merged';
  author:      mongoose.Types.ObjectId;
  assignees:   mongoose.Types.ObjectId[];
  reviewers:   mongoose.Types.ObjectId[];
  labels:      { name:string; color:string }[];
  headBranch:  string;
  baseBranch:  string;
  commits:     number;
  additions:   number;
  deletions:   number;
  changedFiles:number;
  draft:       boolean;
  mergeable:   boolean;
  mergedAt?:   Date;
  mergedBy?:   mongoose.Types.ObjectId;
  closedAt?:   Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const PRSchema = new Schema<IPullRequest>({
  repoId:      { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  number:      { type: Number, required: true },
  title:       { type: String, required: true, trim: true },
  body:        { type: String, default: '' },
  state:       { type: String, enum: ['open','closed','merged'], default: 'open' },
  author:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignees:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reviewers:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  labels:      [{ name: String, color: String }],
  headBranch:  { type: String, required: true },
  baseBranch:  { type: String, required: true, default: 'main' },
  commits:     { type: Number, default: 0 },
  additions:   { type: Number, default: 0 },
  deletions:   { type: Number, default: 0 },
  changedFiles:{ type: Number, default: 0 },
  draft:       { type: Boolean, default: false },
  mergeable:   { type: Boolean, default: true },
  mergedAt:    { type: Date },
  mergedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  closedAt:    { type: Date },
}, { timestamps: true });

PRSchema.index({ repoId:1, number:1 }, { unique:true });

export default mongoose.model<IPullRequest>('PullRequest', PRSchema);