import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import aiService from '../services/aiService';

const router = Router();

/* ── Analyze code ────────────────────────────────────────────── */
router.post('/analyze', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const analyses = await aiService.analyzeCode(code, language || 'typescript');
    res.json(analyses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Chat ────────────────────────────────────────────────────── */
router.post('/chat', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const reply = await aiService.chat(message, history || []);
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/insights/dashboard', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId   = req.user?._id?.toString();
    const username = req.user?.username as string;

    if (!userId || !username) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await aiService.getInsights(userId, username);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/insights/refresh', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId   = req.user?._id?.toString();
    const username = req.user?.username as string;

    if (!userId || !username) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // force fresh data by calling getInsights directly
    const result = await aiService.getInsights(userId, username);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
/* ── Debug code ──────────────────────────────────────────────── */
router.post('/debug', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, error, language } = req.body;
    if (!code || !error)
      return res.status(400).json({ message: 'Code and error are required' });

    const result = await aiService.debugCode(code, error, language || 'typescript');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Review PR ───────────────────────────────────────────────── */
router.post('/review-pr', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { diff } = req.body;
    if (!diff) return res.status(400).json({ message: 'Diff is required' });

    const review = await aiService.reviewPR(diff);
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Suggest commit message ──────────────────────────────────── */
router.post('/commit-message', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { diff } = req.body;
    if (!diff) return res.status(400).json({ message: 'Diff is required' });

    const message = await aiService.suggestCommitMessage(diff);
    res.json({ message });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Explain code ────────────────────────────────────────────── */
router.post('/explain', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const explanation = await aiService.explainCode(code, language || 'typescript');
    res.json({ explanation });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Generate tests ──────────────────────────────────────────── */
router.post('/generate-tests', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language, framework } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const tests = await aiService.generateTests(
      code,
      language  || 'typescript',
      framework || 'jest'
    );
    res.json({ tests });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Fix bug ─────────────────────────────────────────────────── */
router.post('/fix-bug', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, issue, language } = req.body;
    if (!code || !issue)
      return res.status(400).json({ message: 'Code and issue are required' });

    const fix = await aiService.fixBug(code, issue, language || 'typescript');
    res.json(fix);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Optimize code ───────────────────────────────────────────── */
router.post('/optimize', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const optimized = await aiService.optimizeCode(code, language || 'typescript');
    res.json(optimized);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Dashboard analysis ──────────────────────────────────────── */
router.get('/dashboard', protect, async (req: AuthRequest, res: Response) => {
  try {
    const analyses = await aiService.analyzeCode(
      `// GitPage dashboard analysis sample
function example() {
  const value = 1;
  if (value === 1) return true;
  return false;
}`,
      'typescript'
    );
    res.json(analyses);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── Repo insights ───────────────────────────────────────────── */
router.get('/insights/:owner/:repo', protect, async (req: AuthRequest, res: Response) => {
  try {
    const insights = await aiService.getRepoInsights(
      req.params.owner,
      req.params.repo
    );
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   NEW ── Suggest labels for a single issue (new-issue modal)
   POST /api/ai/suggest-labels
   Body: { title: string; body?: string; availableLabels: Label[] }
   Returns: { labels: Label[]; reasoning: string }
══════════════════════════════════════════════════════════════ */
/* ── Triage route ─────────────────────────────────────────────── */
router.post('/triage', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { issues, repo } = req.body;

    if (!Array.isArray(issues) || issues.length === 0)
      return res.status(400).json({ message: 'issues array is required' });

    if (!repo?.owner || !repo?.name)
      return res.status(400).json({ message: 'repo.owner and repo.name are required' });

    const capped = issues.slice(0, 20);
    console.log(`[triage] ${capped.length} issues for ${repo.owner}/${repo.name}`);

    const results = await aiService.triageIssues(capped, repo);
    console.log(`[triage] returning ${results.length} results`);

    res.json({ results });
  } catch (err: any) {
    console.error('[triage] error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

/* ── Suggest labels route ────────────────────────────────────── */
router.post('/suggest-labels', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, availableLabels } = req.body;

    if (!title?.trim())
      return res.status(400).json({ message: 'Issue title is required' });

    if (!Array.isArray(availableLabels) || availableLabels.length === 0)
      return res.status(400).json({ message: 'availableLabels array is required' });

    console.log(`[suggest-labels] title: "${title}"`);

    const result = await aiService.suggestIssueLabels(title, body ?? '', availableLabels);
    console.log(`[suggest-labels] suggested: ${result.labels.map(l => l.name).join(', ')}`);

    res.json(result);
  } catch (err: any) {
    console.error('[suggest-labels] error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;