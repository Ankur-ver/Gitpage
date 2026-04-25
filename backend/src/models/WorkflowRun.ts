import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflowRun extends Document {
  repoId:      mongoose.Types.ObjectId;
  workflowId?: mongoose.Types.ObjectId;
  name:        string;
  status:      'completed' | 'in_progress' | 'queued';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  branch:      string;
  commit:      string;
  commitSha?:  string;
  author:      string;
  startedAt:   string;
  duration?:   string;
  steps: {
    name:      string;
    status:    'success' | 'failure' | 'in_progress' | 'skipped' | 'queued';
    duration?: string;
    log?:      string;
  }[];
}

const StepSchema = new Schema({
  name:     { type: String, required: true },
  status:   { type: String, enum: ['success','failure','in_progress','skipped','queued'], default: 'queued' },
  duration: String,
  log:      String,
}, { _id: false });

const WorkflowRunSchema = new Schema<IWorkflowRun>({
  repoId:     { type: Schema.Types.ObjectId, ref: 'Repo', required: true, index: true },
  workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow' },
  name:       { type: String, required: true },
  status:     { type: String, enum: ['completed','in_progress','queued'], default: 'queued' },
  conclusion: { type: String, enum: ['success','failure','cancelled','skipped'] },
  branch:     { type: String, required: true },
  commit:     { type: String, required: true },
  commitSha:  String,
  author:     { type: String, required: true },
  startedAt:  { type: String, required: true },
  duration:   String,
  steps:      [StepSchema],
}, { timestamps: true });

export default mongoose.model<IWorkflowRun>('WorkflowRun', WorkflowRunSchema);