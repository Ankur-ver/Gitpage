import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import compression  from 'compression';
import { createServer } from 'http';
import { Server }   from 'socket.io';
import dotenv       from 'dotenv';
import { connectDB } from './src/config/database';
import authRoutes   from './src/routes/auth';
import repoRoutes   from './src/routes/repos';
import repositoryroutes from './src/routes/repository';
import issueRoutes  from './src/routes/issues';
import actions from './src/routes/actions'
import prRoutes     from './src/routes/pullRequests';
import activityRoutes from './src/routes/activity';
import contributionsRoutes from './src/routes/contributions';
import statsRoutes from './src/routes/stats';
import gitRoutes from './src/routes/git'
import aiRoutes     from './src/routes/ai';
import { errorHandler } from './src/middleware/errorHandler';
import rateLimit    from 'express-rate-limit';
import projectRoutes from './src/routes/projectRoutes'
dotenv.config();

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST'] },
});

/* ── Middleware ─────────────────────────────────────────────────── */
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));

/* ── Git Smart HTTP — BEFORE express.json() and rate limiter ────── */
// Regex matches: /username/reponame.git  and  /username/reponame.git/info/refs etc.
app.use(
  /^\/[^/]+\/[^/]+\.git(\/.*)?$/,
  express.raw({ type: '*/*', limit: '500mb' }),
  gitRoutes
);

/* ── JSON body parser ───────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Rate limiting ──────────────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Too many requests, please try again later.' },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      20,
  message:  { error: 'AI rate limit exceeded. Please wait.' },
});

app.use('/api/', limiter);
app.use('/api/ai', aiLimiter);

/* ── Routes ─────────────────────────────────────────────────────── */
app.use('/api/auth',          authRoutes);
app.use('/api/repos',         repoRoutes);
app.use('/api/repositories', repositoryroutes);
app.use('/api/issues',        issueRoutes);
app.use('/api/actions',         actions)
app.use('/api/pulls',         prRoutes);
app.use('/api/activity',      activityRoutes);
app.use('/api/contributions', contributionsRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/projects',projectRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

/* ── Socket.IO ──────────────────────────────────────────────────── */
io.on('connection', socket => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-repo', (repoId: string) => socket.join(`repo:${repoId}`));
  socket.on('leave-repo', (repoId: string) => socket.leave(`repo:${repoId}`));

  socket.on('code-change', (data: { repoId:string; file:string; content:string }) => {
    socket.to(`repo:${data.repoId}`).emit('code-change', data);
  });

  socket.on('cursor-move', (data: { repoId:string; userId:string; position:any }) => {
    socket.to(`repo:${data.repoId}`).emit('cursor-move', data);
  });

  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
});

/* ── Error handler ──────────────────────────────────────────────── */
app.use(errorHandler);

/* ── Start ──────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`🚀 GitPage server running on http://localhost:${PORT}`);
    console.log(`🤖 AI features: ${process.env.OPENAI_API_KEY ? 'enabled' : 'disabled (no API key)'}`);
  });
};

start().catch(console.error);

export { io };