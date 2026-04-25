import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflow extends Document {
  repoId: mongoose.Types.ObjectId;
  name:   string;
  path:   string;
  steps:  string[];
}

const WorkflowSchema = new Schema<IWorkflow>({
  repoId: { type: Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
  name:   { type: String, required: true },
  path:   { type: String, required: true },
  steps:  [String],
}, { timestamps: true });

export default mongoose.model<IWorkflow>('Workflow', WorkflowSchema);