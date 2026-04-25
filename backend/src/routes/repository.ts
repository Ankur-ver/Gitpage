import { Router, Request, Response } from 'express';
import path       from 'path';
import simpleGit  from 'simple-git';
import mongoose   from 'mongoose';
import Repository from '../models/Repository';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getGit = (username: string, repoName: string) => {
  const repoPath = path.join(
    process.env.REPOS_DIR as string,
    username,
    `${repoName}.git`
  );
  return { git: simpleGit(repoPath), repoPath };
};

async function findRepo(ownerUsername: string, repoName: string) {
  return Repository.findOne({
    ownerUsername: ownerUsername.toLowerCase(),
    name:          repoName,
    status:        'ready',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/:username/:repoName/branches
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/branches',
  async (req: Request, res: Response) => {
    try {
      const { username, repoName } = req.params;

      const repo = await Repository.findOne({
        ownerUsername: username,
        name:          repoName,
      });
      if (!repo) return res.status(404).json({ success: false, error: 'Not found' });

      const { git } = getGit(username, repoName);
      const summary  = await git.branch(['-a']);

      const branches = Object.entries(summary.branches)
        .filter(([name]) => !name.startsWith('remotes/'))
        .map(([name, info]) => ({
          name,
          commit   : { sha: info.commit, url: '' },
          protected: name === repo.defaultBranch,
          isDefault: name === repo.defaultBranch,
        }));

      return res.json({ success: true, data: branches });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error  : (err as Error).message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/:username/:repoName/files
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/files',
  async (req: Request, res: Response) => {
    try {
      const { username, repoName } = req.params;
      const branch  = (req.query.branch as string) || 'main';
      const dirPath = (req.query.path   as string) || '';

      const { git } = getGit(username, repoName);

      const treeTarget = dirPath ? `${branch}:${dirPath}` : branch;
      const rawTree    = await git.raw(['ls-tree', treeTarget]);

      if (!rawTree.trim()) {
        return res.json({ success: true, data: [] });
      }

      const files = await Promise.all(
        rawTree
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(async (line) => {
            const [meta, filePath] = line.split('\t');
            const [, type, sha]    = meta.split(' ');
            const name             = filePath.split('/').pop() ?? filePath;

            let lastCommit = { message: '', date: '', author: '' };
            try {
              const log = await git.log({
                from : branch,
                file : filePath,
                '--' : null,
                '-1' : null,
              } as any);

              if (log.latest) {
                lastCommit = {
                  message: log.latest.message,
                  date   : log.latest.date,
                  author : log.latest.author_name,
                };
              }
            } catch { /* file may not have commits yet */ }

            return {
              name,
              path      : filePath,
              type      : type === 'tree' ? 'dir' : 'file',
              sha,
              lastCommit,
            };
          })
      );

      files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      return res.json({ success: true, data: files });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error  : (err as Error).message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/:username/:repoName/contents
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/contents',
  async (req: Request, res: Response) => {
    try {
      const { username, repoName } = req.params;
      const branch   = (req.query.branch as string) || 'main';
      const filePath = (req.query.path   as string) || '';

      if (!filePath) {
        return res.status(400).json({ success: false, error: 'File path required' });
      }

      const { git } = getGit(username, repoName);
      const content  = await git.show([`${branch}:${filePath}`]);

      return res.json({
        success: true,
        data   : {
          content,
          encoding: 'utf-8',
          size    : Buffer.byteLength(content, 'utf-8'),
        },
      });
    } catch (err) {
      return res.status(404).json({
        success: false,
        error  : 'File not found',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/:username/:repoName/commits
// @desc    Get ALL paginated commits — fixed parser
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/commits',
  async (req: Request, res: Response) => {
    try {
      const { username, repoName } = req.params;
      const branch = (req.query.branch as string) || 'main';
      const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit  = Math.max(1, parseInt(req.query.limit as string) || 20);
      const skip   = (page - 1) * limit;

      const { git } = getGit(username, repoName);

      /* ── 1. Verify branch exists ── */
      let resolvedBranch = branch;
      try {
        await git.raw(['rev-parse', '--verify', branch]);
      } catch {
        try {
          await git.raw(['rev-parse', '--verify', 'master']);
          resolvedBranch = 'master';
        } catch {
          return res.status(404).json({
            success: false,
            error  : `Branch "${branch}" not found`,
          });
        }
      }

      /* ── 2. Total commit count ── */
      const countRaw   = await git.raw(['rev-list', '--count', resolvedBranch]);
      const total      = parseInt(countRaw.trim()) || 0;

      if (total === 0) {
        return res.json({
          success   : true,
          data      : [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }

      /* ── 3. Fetch raw log with safe separators ── */
      const FIELD_SEP  = '\x1f';
      const RECORD_SEP = '\x1e';

      const format = [
        '%H',   // full SHA
        '%s',   // subject
        '%an',  // author name
        '%ae',  // author email
        '%ai',  // author date ISO 8601
        '%ci',  // committer date
        '%P',   // parent SHAs
      ].join(FIELD_SEP);

      const rawLog = await git.raw([
        'log',
        resolvedBranch,
        `--format=${format}${RECORD_SEP}`,
        `--skip=${skip}`,
        '-n', `${limit}`,
      ]);

      /* ── 4. Parse ── */
      const rawCommits = rawLog
        .split(RECORD_SEP)
        .map(s => s.trim())
        .filter(Boolean);

      const commits = rawCommits.map(block => {
        const parts         = block.split(FIELD_SEP);
        const sha           = (parts[0] ?? '').trim();
        const subject       = (parts[1] ?? '').trim();
        const authorName    = (parts[2] ?? '').trim();
        const authorEmail   = (parts[3] ?? '').trim();
        const authorDate    = (parts[4] ?? '').trim();
        const committerDate = (parts[5] ?? '').trim();
        const parents       = (parts[6] ?? '').trim().split(' ').filter(Boolean);

        return {
          sha,
          shortSha      : sha.slice(0, 7),
          message       : subject,
          author        : authorName,
          authorEmail,
          date          : authorDate,
          committerDate,
          parents,
          additions     : 0,
          deletions     : 0,
          filesChanged  : 0,
        };
      });

      /* ── 5. Diff stats (batched, parallel) ── */
      const CONCURRENCY = 5;

      const withStats = await Promise.all(
        commits.map(async (commit, idx) => {
          await new Promise(r =>
            setTimeout(r, Math.floor(idx / CONCURRENCY) * 10)
          );

          if (!commit.sha) return commit;

          try {
            const statRaw = await git.raw([
              'show',
              '--numstat',
              '--format=',
              commit.sha,
            ]);

            let additions   = 0;
            let deletions   = 0;
            let filesChanged = 0;

            statRaw
              .split('\n')
              .filter(Boolean)
              .forEach(line => {
                const [add, del] = line.split('\t');
                if (add !== '-' && del !== '-') {
                  additions    += parseInt(add) || 0;
                  deletions    += parseInt(del) || 0;
                  filesChanged += 1;
                }
              });

            return { ...commit, additions, deletions, filesChanged };
          } catch {
            return commit;
          }
        })
      );

      return res.json({
        success   : true,
        data      : withStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('[commits]', err);
      return res.status(500).json({
        success: false,
        error  : (err as Error).message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/:username/:repoName/stats
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/stats',
  async (req: Request, res: Response) => {
    try {
      const { username, repoName } = req.params;

      const repo = await Repository.findOne({
        ownerUsername: username,
        name:          repoName,
      });
      if (!repo) return res.status(404).json({ success: false, error: 'Not found' });

      const { git } = getGit(username, repoName);

      let totalCommits = 0;
      try {
        const countRaw = await git.raw(['rev-list', '--count', repo.defaultBranch]);
        totalCommits   = parseInt(countRaw.trim()) || 0;
      } catch { /* empty repo */ }

      let contributors = 0;
      try {
        const shortlog = await git.raw(['shortlog', '-sn', repo.defaultBranch]);
        contributors   = shortlog.trim().split('\n').filter(Boolean).length;
      } catch { /* empty repo */ }

      let branchCount = 0;
      try {
        const branchSummary = await git.branch();
        branchCount         = Object.keys(branchSummary.branches).length;
      } catch { /* empty repo */ }

      return res.json({
        success: true,
        data   : {
          totalCommits,
          contributors,
          branches: branchCount,
          releases: 0,
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error  : (err as Error).message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// STAR  — GET / POST / DELETE
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/star',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });
      console.log("stars:",repo.stars)
      const starred = repo.stars.some(id => id.equals(req.user!._id));
      res.json({ starred, count: repo.stars.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/:username/:repoName/star',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });

      const userId = new mongoose.Types.ObjectId(req.user!._id);
      
      if (repo.stars.some(id => id.equals(userId))) {
        return res.json({ starred: true, count: repo.stars.length, message: 'Already starred' });
      }

      repo.stars.push(userId);
      await repo.save();
      res.json({ starred: true, count: repo.stars.length });
    } catch (err: any) {
      console.error('[star]', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete(
  '/:username/:repoName/star',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });

      const userId = new mongoose.Types.ObjectId(req.user!._id);

      if (!repo.stars.some(id => id.equals(userId))) {
        return res.json({ starred: false, count: repo.stars.length, message: 'Not starred' });
      }

      repo.stars = repo.stars.filter(id => !id.equals(userId)) as typeof repo.stars;
      await repo.save();
      res.json({ starred: false, count: repo.stars.length });
    } catch (err: any) {
      console.error('[unstar]', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WATCH  — GET / POST / DELETE
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/watch',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });

      const watching = repo.watchers.some(id => id.equals(req.user!._id));
      res.json({ watching, count: repo.watchers.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/:username/:repoName/watch',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });

      const userId = new mongoose.Types.ObjectId(req.user!._id);

      if (repo.watchers.some(id => id.equals(userId))) {
        return res.json({ watching: true, count: repo.watchers.length, message: 'Already watching' });
      }

      repo.watchers.push(userId);
      await repo.save();
      res.json({ watching: true, count: repo.watchers.length });
    } catch (err: any) {
      console.error('[watch]', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete(
  '/:username/:repoName/watch',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });

      const userId = new mongoose.Types.ObjectId(req.user!._id);

      if (!repo.watchers.some(id => id.equals(userId))) {
        return res.json({ watching: false, count: repo.watchers.length, message: 'Not watching' });
      }

      repo.watchers = repo.watchers.filter(
        id => !id.equals(userId)
      ) as typeof repo.watchers;
      await repo.save();
      res.json({ watching: false, count: repo.watchers.length });
    } catch (err: any) {
      console.error('[unwatch]', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FORK  — GET list / POST create
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:username/:repoName/forks',
  async (req: Request, res: Response) => {
    try {
      const repo = await findRepo(req.params.username, req.params.repoName);
      if (!repo) return res.status(404).json({ message: 'Repository not found' });

      const forks = await Repository.find({
        _id:    { $in: repo.forks },
        status: 'ready',
      })
        .select('name fullName ownerUsername description language stars createdAt')
        .lean();

      res.json({ count: repo.forks.length, forks });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/:username/:repoName/fork',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const source = await findRepo(req.params.username, req.params.repoName);
      if (!source) return res.status(404).json({ message: 'Repository not found' });

      const userId       = new mongoose.Types.ObjectId(req.user!._id);
      const forkingUser  = req.user as any;

      if (source.owner.equals(userId)) {
        return res.status(400).json({ message: 'Cannot fork your own repository' });
      }

      const alreadyForked = await Repository.findOne({
        owner:      userId,
        forkedFrom: source._id,
      });
      if (alreadyForked) {
        return res.status(400).json({
          message:    'You have already forked this repository',
          repository: alreadyForked,
        });
      }

      let forkName     = source.name;
      const existing   = await Repository.findOne({ owner: userId, name: forkName });
      if (existing) forkName = `${source.name}-fork-${Date.now().toString().slice(-5)}`;

      const forkerUsername: string = forkingUser.username;

      const forked = await Repository.create({
        name:          forkName,
        fullName:      `${forkerUsername}/${forkName}`,
        description:   source.description
          ? `Forked from ${source.fullName}. ${source.description}`
          : `Forked from ${source.fullName}`,
        owner:         userId,
        ownerUsername: forkerUsername,
        private:       source.private,
        visibility:    source.visibility,
        archived:      false,
        disabled:      false,
        status:        'creating',
        fork:          true,
        forkedFrom:    source._id,
        stars:         [],
        forks:         [],
        watchers:      [userId],
        language:      source.language,
        topics:        source.topics,
        defaultBranch: source.defaultBranch,
        size:          source.size,
        openIssues:    0,
        license:       source.license,
        homepage:      source.homepage,
        gitPath:       `repos/${forkerUsername}/${forkName}.git`,
        cloneUrls: {
          http: `${process.env.APP_URL ?? 'http://localhost:5000'}/${forkerUsername}/${forkName}.git`,
          ssh:  `git@${process.env.APP_DOMAIN ?? 'localhost'}:${forkerUsername}/${forkName}.git`,
        },
        isInitialized: false,
        initOptions:   source.initOptions,
        collaborators: [],
      });

      source.forks.push(forked._id);
      await source.save();

      forked.status        = 'ready';
      forked.isInitialized = true;
      await forked.save();

      res.status(201).json(forked);
    } catch (err: any) {
      console.error('[fork]', err.message);
      if (err.code === 11000) {
        return res.status(400).json({
          message: 'A repository with that name already exists in your account',
        });
      }
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;