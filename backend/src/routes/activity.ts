import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import Issue  from '../models/Issue';
import Repo   from '../models/Repository';
import User   from '../models/User';

const router = Router();

/* ── GET /api/activity ────────────────────────────────────────── */
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const type   = (req.query.type   as string) || 'all';
    const page   = Math.max(1, parseInt(req.query.page   as string) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip   = (page - 1) * limit;

    /* repos this user owns or has access to */
    const userRepos = await Repo.find({ owner: userId })
      .select('_id name owner')
      .populate<{ owner: { username: string } }>('owner', 'username')
      .lean();

    const repoIds = userRepos.map(r => r._id);

    /* build issue query */
    const issueQuery: Record<string, any> = { repoId: { $in: repoIds } };
    if (type !== 'all' && type !== 'issue') issueQuery._id = null;  // no results

    const [issues, totalIssues] = await Promise.all([
      type === 'all' || type === 'issue'
        ? Issue.find(issueQuery)
            .populate<{ author: { username: string; avatarUrl: string } }>('author', 'username avatarUrl')
            .sort({ createdAt: -1 })
            .limit(limit * 3)
            .lean()
        : [],
      type === 'all' || type === 'issue'
        ? Issue.countDocuments(issueQuery)
        : 0,
    ]);

    /* map issues → ActivityEvent */
    const events = issues.map((issue: any) => {
      const repoDoc  = userRepos.find(r => r._id.toString() === issue.repoId.toString());
      const authorName =
        typeof issue.author === 'object' ? issue.author.username : 'unknown';

      return {
        id:        issue._id.toString(),
        type:      'issue' as const,
        user:      authorName,
        owner:     repoDoc?.owner?.username ?? '',
        repo:      repoDoc?.name ?? '',
        detail:    `${issue.state === 'open' ? 'Opened' : 'Closed'} issue: ${issue.title}`,
        timestamp: issue.createdAt,
        icon:      issue.state === 'open' ? '🐛' : '✅',
        url:       `/${repoDoc?.owner?.username}/${repoDoc?.name}/issues/${issue.number}`,
        meta: {
          issueNum: issue.number,
          labels:   issue.labels?.map((l: any) => l.name) ?? [],
        },
      };
    });

    /* sort by timestamp desc */
    events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const paged   = events.slice(skip, skip + limit);
    const hasMore = (skip + limit) < events.length;

    res.json({ events: paged, hasMore, total: events.length });
  } catch (err: any) {
    console.error('[activity]', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;