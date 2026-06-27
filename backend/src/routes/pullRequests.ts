import { Router, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import PullRequest from '../models/PullRequest';
import Repository  from '../models/Repository';
import { protect, AuthRequest } from '../middleware/auth';
import { computeDiffBetweenRepos, computeDiffWithContents } from '../utils/gitDiff';
import { mergeBranches } from '../utils/gitOperations';

const router = Router();

/* ── List PRs ────────────────────────────────────────────────── */
router.get('/:owner/:repo/pulls', async (req: AuthRequest, res: Response) => {
  try {
    const owner = (req.params.owner || '').toLowerCase();
    const repo = await Repository.findOne({
      fullName: `${owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const state = (req.query.state as string) || 'open';
const prs = await PullRequest.find({
  $and: [
    {
      $or: [
        { baseRepoId: repo._id },
        { headRepoId: repo._id }
      ]
    },
    {
      state
    }
  ]
})
.populate('author', 'username avatarUrl')
.sort({ createdAt: -1 });

    // Try to infer current user from Authorization header (optional)
    let currentUserId: string | null = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        currentUserId = decoded?.id ?? null;
      } catch { /* ignore invalid token */ }
    }

    const result = prs.map(p => {
      const obj: any = p.toObject();
      obj.canMerge = false;
      if (currentUserId) {
        const isOwner = repo.owner?.toString() === currentUserId;
        const isCollaborator = Array.isArray(repo.collaborators) && repo.collaborators.some((c: any) =>
          c.user?.toString() === currentUserId && ['write', 'admin'].includes(c.role)
        );
        obj.canMerge = Boolean(isOwner || isCollaborator);
      }
      return obj;
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Create PR ───────────────────────────────────────────────── */
router.post('/:owner/:repo/pulls', protect, async (req: AuthRequest, res: Response) => {
  try {
    console.log(req);
    const owner = (req.params.owner || '').toLowerCase();
    const repo = await Repository.findOne({
      fullName: `${owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

const headRaw: string = req.body.head || '';

let headOwner: string | null = null;

if (headRaw.includes(':')) {
  headOwner = headRaw.split(':')[0];
}

let forkRepo = repo;

if (
  headOwner &&
  headOwner.toLowerCase() !== repo.ownerUsername?.toLowerCase()
) {
  const foundFork = await Repository.findOne({
    ownerUsername: headOwner.toLowerCase(),
    name: repo.name,
  });

  if (foundFork) {
    forkRepo = foundFork;
  }
}

const count = await PullRequest.countDocuments({
  baseRepoId: repo._id,
});

const pr = await PullRequest.create({
  repoId: repo._id, // keep for compatibility

  baseRepoId: repo._id,
  headRepoId: forkRepo._id,

  number: count + 1,
  title: req.body.title,
  body: req.body.body || '',
  author: req.user._id,
  headBranch: req.body.head,
  baseBranch: req.body.base,
  draft: req.body.draft || false,
});

    // Attempt to compute diff/commit stats for the PR
    (async () => {
      try {
        const headRaw: string = req.body.head || '';
        let headOwner: string | null = null;
        let headBranch: string = headRaw;
        if (headRaw.includes(':')) {
          const parts = headRaw.split(':');
          headOwner = parts[0];
          headBranch = parts.slice(1).join(':');
        }

        const baseBranch: string = req.body.base || repo.defaultBranch || 'main';

        console.log('[PR Diff] headRaw:', headRaw, 'headOwner:', headOwner, 'headBranch:', headBranch, 'baseBranch:', baseBranch);

        // Determine fork repo path
        let forkRepoPath = repo.gitPath; // default to same repo
        if (headOwner && headOwner.toLowerCase() !== (repo.ownerUsername || '').toLowerCase()) {
          const forkRepo = await Repository.findOne({ ownerUsername: headOwner.toLowerCase(), name: repo.name });
          console.log('[PR Diff] Looking for fork repo:', headOwner.toLowerCase(), repo.name, 'found:', !!forkRepo);
          if (forkRepo) {
            forkRepoPath = forkRepo.gitPath;
            console.log('[PR Diff] Using fork repo path:', forkRepoPath);
          }
        }

        const upstreamPath = repo.gitPath;
        console.log('[PR Diff] Upstream path:', upstreamPath, 'Fork path:', forkRepoPath);

        const diff = await computeDiffBetweenRepos(upstreamPath, forkRepoPath, baseBranch, headBranch);
        console.log('[PR Diff] Computed diff:', diff);
        pr.commits = diff.commits;
        pr.additions = diff.additions;
        pr.deletions = diff.deletions;
        pr.changedFiles = diff.files.length;
        await pr.save();
        console.log('[PR Diff] Saved PR with stats - commits:', pr.commits, 'additions:', pr.additions, 'deletions:', pr.deletions);
      } catch (err) {
        console.error('Failed to compute PR diff stats:', err);
      }
    })();

    await pr.populate('author', 'username avatarUrl');
    res.status(201).json(pr);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Get PR detail ───────────────────────────────────────────── */
router.get('/:owner/:repo/pulls/:number', async (req: AuthRequest, res: Response) => {
  try {
    const owner = (req.params.owner || '').toLowerCase();
    const repo = await Repository.findOne({ fullName: `${owner}/${req.params.repo}` });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

   const pr = await PullRequest.findOne({
    number: req.params.number,
    $or: [
      { baseRepoId: repo._id },
      { headRepoId: repo._id }
    ]
    }).populate('author', 'username avatarUrl');
    if (!pr) return res.status(404).json({ message: 'PR not found' });

    // compute full diff with contents (best-effort)
    try {
      const headRaw = pr.headBranch || '';
      let headOwner: string | null = null;
      let headBranch = headRaw;
      if (headRaw.includes(':')) {
        const parts = headRaw.split(':');
        headOwner = parts[0];
        headBranch = parts.slice(1).join(':');
      }
      let forkRepoPath = repo.gitPath;
      if (headOwner && headOwner.toLowerCase() !== (repo.ownerUsername || '').toLowerCase()) {
        const forkRepo = await Repository.findOne({ ownerUsername: headOwner.toLowerCase(), name: repo.name });
        if (forkRepo) forkRepoPath = forkRepo.gitPath;
      }
      const diff = await computeDiffWithContents(repo.gitPath, forkRepoPath, pr.baseBranch || repo.defaultBranch || 'main', headBranch);
      const obj: any = pr.toObject();
      obj.diff = diff;
      return res.json(obj);
    } catch (err) {
      const obj: any = pr.toObject();
      return res.json(obj);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Merge PR ────────────────────────────────────────────────── */
router.put('/:owner/:repo/pulls/:number/merge', protect, async (req: AuthRequest, res: Response) => {
  try {
    const owner = (req.params.owner || '').toLowerCase();
    const repo = await Repository.findOne({
      fullName: `${owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

   const pr = await PullRequest.findOne({
  baseRepoId: repo._id,
  number: req.params.number
  });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    if (pr.state !== 'open') return res.status(400).json({ message: 'PR is not open' });

    // Only allow repo owner or collaborators with write/admin to merge
    const currentUserId = req.user?._id?.toString();
    const isOwner = repo.owner?.toString() === currentUserId;
    const isCollaborator = Array.isArray(repo.collaborators) && repo.collaborators.some((c: any) =>
      c.user?.toString() === currentUserId && ['write', 'admin'].includes(c.role)
    );
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Not authorized to merge this PR' });
    }

    // Parse head branch to determine if it's from a fork
    const headRaw = pr.headBranch || '';
    let headOwner: string | null = null;
    let headBranch = headRaw;
    if (headRaw.includes(':')) {
      const parts = headRaw.split(':');
      headOwner = parts[0];
      headBranch = parts.slice(1).join(':');
    }

    const baseBranch = pr.baseBranch || repo.defaultBranch || 'main';

    // Determine fork repo path
    let forkRepoPath = repo.gitPath;
    if (headOwner && headOwner.toLowerCase() !== (repo.ownerUsername || '').toLowerCase()) {
      const forkRepo = await Repository.findOne({ ownerUsername: headOwner.toLowerCase(), name: repo.name });
      if (forkRepo) {
        forkRepoPath = forkRepo.gitPath;
      } else {
        return res.status(404).json({ message: 'Source fork repository not found' });
      }
    }

    const upstreamPath = repo.gitPath;

    // Perform the Git merge
    try {
      await mergeBranches(upstreamPath, forkRepoPath, baseBranch, headBranch);
    } catch (err: any) {
      return res.status(400).json({ message: `Merge failed: ${err.message}` });
    }

    // Update PR state in database
    pr.state    = 'merged';
    pr.mergedAt = new Date();
    pr.mergedBy = req.user._id;
    await pr.save();

    res.json({ merged: true, message: 'Pull request successfully merged' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Close PR ────────────────────────────────────────────────── */
router.patch('/:owner/:repo/pulls/:number', protect, async (req: AuthRequest, res: Response) => {
  try {
    const owner = (req.params.owner || '').toLowerCase();
    const repo = await Repository.findOne({
      fullName: `${owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

const pr = await PullRequest.findOne({
  number: req.params.number,
  $or: [
    { baseRepoId: repo._id },
    { headRepoId: repo._id }
  ]
});
    if (!pr) return res.status(404).json({ message: 'PR not found' });

    if (req.body.state)  pr.state = req.body.state;
    if (req.body.title)  pr.title = req.body.title;
    if (req.body.body)   pr.body  = req.body.body;
    if (req.body.draft !== undefined) pr.draft = req.body.draft;

    if (req.body.state === 'closed') pr.closedAt = new Date();

    await pr.save();
    res.json(pr);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
    