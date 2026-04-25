import { Router, Request, Response } from 'express';
import path                          from 'path';
import fs                            from 'fs';
import { spawn }                     from 'child_process';
import jwt                           from 'jsonwebtoken';
import dotenv                        from 'dotenv';

dotenv.config();

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Debug logger
// ─────────────────────────────────────────────────────────────────────────────
router.use((req: Request, _res: Response, next: Function) => {
  console.log(`[GIT ROUTER] method=${req.method} url=${req.url} originalUrl=${req.originalUrl}`);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract username and repoName from the original URL
 * Handles: /username/reponame.git/info/refs
 *          /username/reponame.git/git-upload-pack
 *          /username/reponame.git/git-receive-pack
 */
const extractRepoInfo = (
  url: string
): { username: string; repoName: string } | null => {
  const match = url.match(/^\/([^\/]+)\/([^\/]+?)(?:\.git)?(\/.*)?$/);
  if (!match) {
    console.log('[GIT] extractRepoInfo failed for:', url);
    return null;
  }
  return { username: match[1], repoName: match[2] };
};

/** Resolve full path to bare repo on disk */
const getRepoPath = (username: string, repoName: string): string => {
  const storagePath = process.env.REPO_STORAGE_PATH || '/data/gitpage/repos';
  console.log(storagePath)
  return path.join(storagePath, username, `${repoName}.git`);
};

/** Parse Basic Auth header → { username, password } */
const parseBasicAuth = (
  header: string | undefined
): { username: string; password: string } | null => {
  if (!header?.startsWith('Basic ')) return null;
  const decoded    = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return null;
  return {
    username: decoded.slice(0, colonIndex),
    password: decoded.slice(colonIndex + 1),
  };
};

/** Resolve user from Bearer or Basic auth header */
const resolveUser = async (req: Request): Promise<any | null> => {
  try {
    const header = req.headers.authorization;

    // ── Bearer JWT ────────────────────────────────────────────────────────────
    if (header?.startsWith('Bearer ')) {
      const token   = header.slice(7);
      const secret  = process.env.JWT_SECRET as string;
      const decoded = jwt.verify(token, secret) as { id: string };
      const User    = (await import('../models/User')).default;
      return await User.findById(decoded.id).select('-password');
    }

    // ── Basic Auth ────────────────────────────────────────────────────────────
    if (header?.startsWith('Basic ')) {
      const creds = parseBasicAuth(header);
      if (!creds) return null;

      const User = (await import('../models/User')).default;

      // 1) Try interpreting password as a JWT token (legacy / token-based push)
      try {
        const secret  = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(creds.password, secret) as { id: string };
        return await User.findById(decoded.id).select('-password');
      } catch {
        // Not a JWT — fall through to username:password check
      }

      // 2) Real username + password — look up user in DB and compare with bcrypt
      const bcrypt = await import('bcryptjs');
      const user   = await User.findOne({ username: creds.username });
      if (!user) return null;

      const match = await bcrypt.compare(creds.password, user.password);
      if (!match) return null;

      // Return user without password
      const { password: _pw, ...safeUser } = user.toObject();
      return safeUser;
    }

    return null;
  } catch {
    return null;
  }
};

/** Check if user can access the repo */
const checkAccess = async (
  username : string,
  repoName : string,
  userId   : string | null,
  needWrite: boolean
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const Repository = (await import('../models/Repository')).default;

    const repo = await Repository.findOne({
      ownerUsername: username,
      name         : repoName,
    });

    if (!repo) return { allowed: false, reason: 'Repository not found' };

    // Public read — no auth needed
    if (!needWrite && repo.visibility === 'public') {
      return { allowed: true };
    }

    if (!userId) {
      return { allowed: false, reason: 'Authentication required' };
    }

    // Owner has full access
    if (repo.owner.toString() === userId) {
      return { allowed: true };
    }

    // Check collaborator
    const collab = repo.collaborators?.find(
      (c: any) => c.user.toString() === userId
    );

    if (!collab) return { allowed: false, reason: 'Access denied' };

    if (needWrite && collab.role === 'read') {
      return { allowed: false, reason: 'Write access required' };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[GIT] checkAccess error:', (err as Error).message);
    return { allowed: false, reason: 'Internal error' };
  }
};

/** Spawn git process and pipe stdin/stdout */
const spawnGit = (
  args    : string[],
  req     : Request,
  res     : Response,
  onClose?: (code: number | null) => void
): void => {
  console.log('[GIT] spawning:', 'git', args.join(' '));

  const git = spawn('git', args);

  // Pipe request body to git stdin
  if (Buffer.isBuffer(req.body)) {
    git.stdin.write(req.body);
    git.stdin.end();
  } else {
    req.pipe(git.stdin);
  }

  git.stdout.pipe(res);

  git.stderr.on('data', (d: Buffer) =>
    console.error('[GIT stderr]', d.toString())
  );

  git.on('error', (err: Error) => {
    console.error('[GIT spawn error]', err.message);
    if (!res.writableEnded) res.status(500).end('git error');
  });

  git.on('close', (code: number | null) => {
    console.log('[GIT] process closed with code:', code);
    onClose?.(code);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Update DB after push
// ─────────────────────────────────────────────────────────────────────────────
const updateRepoAfterPush = async (
  username : string,
  repoName : string,
  repoPath : string
): Promise<void> => {
  try {
    const Repository = (await import('../models/Repository')).default;

    // Calculate repo size
    const getDirSize = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).reduce((acc, file) => {
        const filePath = path.join(dir, file);
        return acc + (
          fs.statSync(filePath).isDirectory()
            ? getDirSize(filePath)
            : fs.statSync(filePath).size
        );
      }, 0);
    };

    const size = getDirSize(repoPath);

    await Repository.findOneAndUpdate(
      { ownerUsername: username, name: repoName },
      { isInitialized: true, status: 'ready', size, updatedAt: new Date() }
    );

    console.log(`[GIT] ✅ DB updated after push: ${username}/${repoName} size=${size}`);
  } catch (err) {
    console.error('[GIT] DB update failed:', (err as Error).message);
  }
};

// =============================================================================
// Routes — use router.all() with manual path matching
// This avoids Express path-param issues with .git in URL
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Handle ALL git requests through one catch-all
// ─────────────────────────────────────────────────────────────────────────────
router.all('*', async (req: Request, res: Response): Promise<void> => {
  const originalUrl = req.originalUrl;
  const method      = req.method;

  console.log(`[GIT] Handling: ${method} ${originalUrl}`);

  // ── Extract repo info ──────────────────────────────────────────────────────
  const repoInfo = extractRepoInfo(originalUrl);
  if (!repoInfo) {
    res.status(400).end('Invalid git URL');
    return;
  }

  const { username, repoName } = repoInfo;
  console.log(`[GIT] username=${username} repoName=${repoName}`);

  // ── Determine what git operation this is ───────────────────────────────────
  const isInfoRefs      = originalUrl.includes('/info/refs');
  const isUploadPack    = originalUrl.includes('/git-upload-pack');
  const isReceivePack   = originalUrl.includes('/git-receive-pack');
  const service         = req.query.service as string | undefined;

  const isWrite =
    isReceivePack ||
    (isInfoRefs && service === 'git-receive-pack');

  // ── Resolve user ───────────────────────────────────────────────────────────
  const user   = await resolveUser(req);
  const userId = user?._id?.toString() ?? null;

  console.log(`[GIT] user=${userId ?? 'anonymous'} isWrite=${isWrite}`);

  // ── Auth check for write ───────────────────────────────────────────────────
  if (isWrite && !user) {
    res.setHeader('WWW-Authenticate', 'Basic realm="GitPage"');
    res.status(401).end('Authentication required');
    return;
  }

  // ── Access check ───────────────────────────────────────────────────────────
  const { allowed, reason } = await checkAccess(
    username, repoName, userId, isWrite
  );

  if (!allowed) {
    if (!user) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GitPage"');
      res.status(401).end(reason ?? 'Authentication required');
    } else {
      res.status(403).end(reason ?? 'Forbidden');
    }
    return;
  }

  // ── Verify repo exists on disk ─────────────────────────────────────────────
  const repoPath = getRepoPath(username, repoName);
  console.log(`[GIT] repoPath=${repoPath} exists=${fs.existsSync(repoPath)}`);

  if (!fs.existsSync(repoPath)) {
    res.status(404).end('Repository not found on disk');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE 1: info/refs — git discovery
  // GET /username/repo.git/info/refs?service=git-upload-pack|git-receive-pack
  // ═══════════════════════════════════════════════════════════════════════════
  if (isInfoRefs && method === 'GET') {
    if (!service || !['git-upload-pack', 'git-receive-pack'].includes(service)) {
      res.status(400).end('Invalid service');
      return;
    }

    const gitCmd = service === 'git-upload-pack' ? 'upload-pack' : 'receive-pack';

    res.setHeader('Content-Type',  `application/x-${service}-advertisement`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma',        'no-cache');
    res.setHeader('Expires',       'Fri, 01 Jan 1980 00:00:00 GMT');

    // pkt-line header
    const line   = `# service=${service}\n`;
    const hexLen = (line.length + 4).toString(16).padStart(4, '0');
    res.write(`${hexLen}${line}0000`);

    spawnGit(
      [gitCmd, '--stateless-rpc', '--advertise-refs', repoPath],
      req,
      res
    );
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE 2: git-upload-pack — fetch / clone
  // POST /username/repo.git/git-upload-pack
  // ═══════════════════════════════════════════════════════════════════════════
  if (isUploadPack && method === 'POST') {
    res.setHeader('Content-Type',  'application/x-git-upload-pack-result');
    res.setHeader('Cache-Control', 'no-cache');

    spawnGit(
      ['upload-pack', '--stateless-rpc', repoPath],
      req,
      res
    );
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE 3: git-receive-pack — push
  // POST /username/repo.git/git-receive-pack
  // ═══════════════════════════════════════════════════════════════════════════
  if (isReceivePack && method === 'POST') {
    res.setHeader('Content-Type',  'application/x-git-receive-pack-result');
    res.setHeader('Cache-Control', 'no-cache');

    spawnGit(
      ['receive-pack', '--stateless-rpc', repoPath],
      req,
      res,
      async (code) => {
        if (code === 0) {
          await updateRepoAfterPush(username, repoName, repoPath);
        }
      }
    );
    return;
  }

  // ── Unknown git operation ──────────────────────────────────────────────────
  console.log(`[GIT] Unknown operation: ${method} ${originalUrl}`);
  res.status(400).end('Unknown git operation');
});

export default router;