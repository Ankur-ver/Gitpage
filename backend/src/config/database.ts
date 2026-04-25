import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gitpage';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => console.warn('⚠ MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => console.log('♻ MongoDB reconnected'));