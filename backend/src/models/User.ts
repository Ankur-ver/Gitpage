import mongoose, { Document, Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username:   string;
  email:      string;
  password:   string;
  displayName?: string;
  avatarUrl?: string;
  bio?:       string;
  location?:  string;
  website?:   string;
  company?:   string;
  followers:  string[];
  following:  string[];
  publicRepos:number;
  plan:       'free'|'pro'|'enterprise';
  aiEnabled:  boolean;
  createdAt:  Date;
  oauth?: {
    github?: { id: string };
    google?: { id: string };
  };
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username:   { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 39 },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:   { type: String, required: true, minlength: 8 },
  avatarUrl:  { type: String, default: '' },
  bio:        { type: String, maxlength: 160, default: '' },
  location:   { type: String, default: '' },
  website:    { type: String, default: '' },
  company:    { type: String, default: '' },
  followers:  [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following:  [{ type: Schema.Types.ObjectId, ref: 'User' }],
  publicRepos:{ type: Number, default: 0 },
  plan:       { type: String, enum: ['free','pro','enterprise'], default: 'free' },
  aiEnabled:  { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if(this.password.startsWith('oauth_') && this.password.length>20){
  this.password = await bcrypt.hash(this.password, 12);
  next();
  }
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = function(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model<IUser>('User', UserSchema);