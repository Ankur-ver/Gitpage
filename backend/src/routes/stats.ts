import { Router, Response } from 'express';
import Repository   from '../models/Repository';
import Issue        from '../models/Issue';
import PullRequest  from '../models/PullRequest';
import Comment      from '../models/Comment';
import { protect, AuthRequest } from '../middleware/auth';
import gitService   from '../services/gitService';

const router = Router();

router.get('/dashboard', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const repos = await Repository.find({ owner: userId }).select('name').lean();

    const commitCounts = repos.map(repo =>
      gitService.repoExists(req.user.username, repo.name)
        ? gitService.getCommitCount(req.user.username, repo.name)
        : 0
    );

    const [mergedPrs, closedIssues, reviewComments] = await Promise.all([
      PullRequest.countDocuments({ author: userId, state: 'merged' }),
      Issue.countDocuments({ author: userId, state: 'closed' }),
      Comment.countDocuments({ author: userId, parentType: 'pull_request' }),
    ]);

    res.json({
      commits: commitCounts.reduce((sum, count) => sum + count, 0),
      prsMerged: mergedPrs,
      issuesClosed: closedIssues,
      codeReviews: reviewComments,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
