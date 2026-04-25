import { Router, Response } from 'express';
import PullRequest from '../models/PullRequest';
import Repository  from '../models/Repository';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

/* ── List PRs ────────────────────────────────────────────────── */
router.get('/:owner/:repo/pulls', async (req: AuthRequest, res: Response) => {
  try {
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const state = (req.query.state as string) || 'open';
    const prs   = await PullRequest.find({ repoId: repo._id, state })
      .populate('author', 'username avatarUrl')
      .sort({ createdAt: -1 });

    res.json(prs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Create PR ───────────────────────────────────────────────── */
router.post('/:owner/:repo/pulls', protect, async (req: AuthRequest, res: Response) => {
  try {
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const count = await PullRequest.countDocuments({ repoId: repo._id });
    const pr    = await PullRequest.create({
      repoId:     repo._id,
      number:     count + 1,
      title:      req.body.title,
      body:       req.body.body || '',
      author:     req.user._id,
      headBranch: req.body.head,
      baseBranch: req.body.base,
      draft:      req.body.draft || false,
    });
    await pr.populate('author', 'username avatarUrl');
    res.status(201).json(pr);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Merge PR ────────────────────────────────────────────────── */
router.put('/:owner/:repo/pulls/:number/merge', protect, async (req: AuthRequest, res: Response) => {
  try {
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const pr = await PullRequest.findOne({ repoId: repo._id, number: req.params.number });
    if (!pr) return res.status(404).json({ message: 'PR not found' });
    if (pr.state !== 'open') return res.status(400).json({ message: 'PR is not open' });

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
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const pr = await PullRequest.findOne({ repoId: repo._id, number: req.params.number });
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
    