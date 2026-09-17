import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Issue  from '../models/Issue';
import Repo   from '../models/Repository';
import User   from '../models/User';
import PullRequest from '../models/PullRequest';
import gitService from '../services/gitService';

const router = Router();

/* ── GET /api/contributions ───────────────────────────────────── */
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const targetUsername = req.query.username as string | undefined;

    /* resolve target user */
    let userId = req.user!._id;
    if (targetUsername) {
      const user = await User.findOne({ username: targetUsername }).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      userId = user._id;
    }

    /* 1 year window */
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    since.setHours(0, 0, 0, 0);

    /* get all repos owned by the user */
    const repos = await Repo.find({ owner: userId })
      .select('_id ownerUsername name')
      .lean();

    /* count issues created by user per day */
    const issues = await Issue.find({
      author:    userId,
      createdAt: { $gte: since },
    })
    .select('createdAt')
    .lean();

    /* aggregate into daily counts */
    const dailyCounts: Record<string, number> = {};
    const addContribution = (date: Date | string | undefined) => {
      if (!date) return;
      const key = new Date(date).toISOString().slice(0, 10);
      dailyCounts[key] = (dailyCounts[key] ?? 0) + 1;
    };

    issues.forEach((issue: any) => {
      addContribution(issue.createdAt);
    });

    /* count commits authored by the user in their repositories */
    const targetUser = await User.findById(userId).select('username email').lean();
    if (targetUser) {
      const commitGroups = await Promise.all(repos.map(repo =>
        gitService.getCommitsSince(repo.ownerUsername, repo.name, since)
      ));
      commitGroups.flat().forEach(commit => {
        if (
          commit.authorEmail?.toLowerCase() === targetUser.email.toLowerCase() ||
          commit.authorName?.toLowerCase() === targetUser.username.toLowerCase()
        ) {
          addContribution(commit.date);
        }
      });
    }

    /* pull requests are contributions when opened and when merged */
    const pullRequests = await PullRequest.find({
      $and: [
        { $or: [{ author: userId }, { mergedBy: userId }] },
        { $or: [
          { createdAt: { $gte: since } },
          { mergedAt: { $gte: since } },
        ] },
      ],
    }).select('author mergedBy createdAt mergedAt').lean();

    pullRequests.forEach((pullRequest: any) => {
      if (pullRequest.author?.toString() === userId.toString()) {
        addContribution(pullRequest.createdAt);
      }
      if (
        pullRequest.mergedAt &&
        pullRequest.mergedBy?.toString() === userId.toString()
      ) {
        addContribution(pullRequest.mergedAt);
      }
    });

    const total = Object.values(dailyCounts).reduce((a, b) => a + b, 0);

    /* ── calculate current streak ── */
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    let streak     = 0;
    let cursor     = new Date(today);

    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (!dailyCounts[key]) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    res.json({ total, streak, dailyCounts });
  } catch (err: any) {
    console.error('[contributions]', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;