import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  parentType: 'issue'|'pull_request'|'commit';
  parentId:   mongoose.Types.ObjectId;
  body:       string;
  author:     mongoose.Types.ObjectId;
  reactions:  Record<string, string[]>;
  createdAt:  Date;
  updatedAt:  Date;
}

const CommentSchema = new Schema<IComment>({
  parentType: { type: String, enum: ['issue','pull_request','commit'], required: true },
  parentId:   { type: Schema.Types.ObjectId, required: true },
  body:       { type: String, required: true },
  author:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reactions:  { type: Map, of: [String], default: {} },
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', CommentSchema);