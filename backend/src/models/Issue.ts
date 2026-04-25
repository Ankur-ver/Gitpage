import mongoose, { Document, Schema } from 'mongoose';

export interface IIssue extends Document {
  repoId:     mongoose.Types.ObjectId;
  number:     number;
  title:      string;
  body:       string;
  state:      'open'|'closed';
  author:     mongoose.Types.ObjectId;
  assignees:  mongoose.Types.ObjectId[];
  labels:     { name:string; color:string; description?:string }[];
  milestone?: mongoose.Types.ObjectId;
  comments:   number;
  locked:     boolean;
  closedAt?:  Date;
  createdAt:  Date;
  updatedAt:  Date;
}

const IssueSchema = new Schema<IIssue>({
  repoId:   { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  number:   { type: Number, required: true },
  title:    { type: String, required: true, trim: true },
  body:     { type: String, default: '' },
  state:    { type: String, enum: ['open','closed'], default: 'open' },
  author:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignees:[{ type: Schema.Types.ObjectId, ref: 'User' }],
  labels:   [{
    name:        { type: String, required: true },
    color:       { type: String, required: true },
    description: { type: String, default: '' },
  }],
  comments: { type: Number, default: 0 },
  locked:   { type: Boolean, default: false },
  closedAt: { type: Date },
}, { timestamps: true });

IssueSchema.index({ repoId:1, number:1 }, { unique:true });
IssueSchema.index({ repoId:1, state:1 });

export default mongoose.model<IIssue>('Issue', IssueSchema);