import { Router, Response } from 'express';
import Issue    from '../models/Issue';
import Repository from '../models/Repository';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

/* ── List issues ─────────────────────────────────────────────── */
router.get('/:owner/:repo/issues', async (req: AuthRequest, res: Response) => {
  try {
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const state  = (req.query.state as string) || 'open';
    const issues = await Issue.find({ repoId: repo._id, state })
      .populate('author', 'username avatarUrl')
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Create issue ────────────────────────────────────────────── */
router.post('/:owner/:repo/issues', protect, async (req: AuthRequest, res: Response) => {
  try {
    console.log("hello mr.")
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const count = await Issue.countDocuments({ repoId: repo._id });
    const issue = await Issue.create({
      repoId: repo._id,
      number: count + 1,
      title:  req.body.title,
      body:   req.body.body || '',
      author: req.user._id,
      labels: req.body.labels || [],
    });

    repo.openIssues += 1;
    await repo.save();

    await issue.populate('author', 'username avatarUrl');
    res.status(201).json(issue);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Close / reopen issue ────────────────────────────────────── */
router.patch('/:owner/:repo/issues/:number', protect, async (req: AuthRequest, res: Response) => {
  try {
    const repo = await Repository.findOne({
      fullName: `${req.params.owner}/${req.params.repo}`,
    });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const issue = await Issue.findOne({ repoId: repo._id, number: req.params.number });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (req.body.state) {
      issue.state = req.body.state;
      if (req.body.state === 'closed') {
        issue.closedAt = new Date();
        repo.openIssues = Math.max(0, repo.openIssues - 1);
      } else {
        issue.closedAt = undefined;
        repo.openIssues += 1;
      }
      await repo.save();
    }
    if (req.body.title) issue.title = req.body.title;
    if (req.body.body)  issue.body  = req.body.body;

    await issue.save();
    res.json(issue);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;