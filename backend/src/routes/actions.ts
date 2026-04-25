import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import WorkflowRun  from '../models/Workflowrun';
import Workflow     from '../models/Workflow';
import Repository       from '../models/Repository';

const router = Router();

/* ── helper: resolve repo document ── */
async function getRepo(owner: string, name: string) {
  return Repository.findOne({ 'owner.username': owner, name });
}

/* ── GET  /actions/:owner/:repo/workflows ── */
router.get('/:owner/:repo/workflows', protect, async (req: AuthRequest, res: Response) => {
  try {
     const repo = await Repository.findOne({
          fullName: `${req.params.owner}/${req.params.repo}`,
        });
    console.log(repo);
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const workflows = await Workflow.find({ repoId: repo._id }).lean();
    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET  /actions/:owner/:repo/runs ── */
router.get('/:owner/:repo/runs', protect, async (req: AuthRequest, res: Response) => {
  try {
     const repo = await Repository.findOne({
          fullName: `${req.params.owner}/${req.params.repo}`,
        });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const query: Record<string, any> = { repoId: repo._id };

    if (req.query.workflowId) query.workflowId = req.query.workflowId;
    if (req.query.status) {
      const s = req.query.status as string;
      if (s === 'in_progress') query.status = 'in_progress';
      else                     query.conclusion = s;
    }

    const runs = await WorkflowRun
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET  /actions/:owner/:repo/runs/:runId ── */
router.get('/:owner/:repo/runs/:runId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const run = await WorkflowRun.findById(req.params.runId).lean();
    if (!run) return res.status(404).json({ message: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── POST /actions/:owner/:repo/runs  (trigger) ── */
router.post('/:owner/:repo/runs', protect, async (req: AuthRequest, res: Response) => {
  try {
     const repo = await Repository.findOne({
          fullName: `${req.params.owner}/${req.params.repo}`,
        });
    if (!repo) return res.status(404).json({ message: 'Repo not found' });

    const { branch = 'main', workflowId } = req.body;

    /* find first workflow for this repo if not specified */
    const wf = workflowId
      ? await Workflow.findById(workflowId)
      : await Workflow.findOne({ repoId: repo._id });

    const run = await WorkflowRun.create({
      repoId:     repo._id,
      workflowId: wf?._id,
      name:       wf?.name ?? 'Manual run',
      status:     'queued',
      branch,
      commit:     'Manually triggered',
      author:     req.user?.username ?? 'unknown',
      startedAt:  new Date().toISOString(),
      steps:      wf?.steps?.map((s: any) => ({ name: s, status: 'queued' })) ?? [],
    });

    res.status(201).json(run);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── POST /actions/:owner/:repo/runs/:runId/cancel ── */
router.post('/:owner/:repo/runs/:runId/cancel', protect, async (req: AuthRequest, res: Response) => {
  try {
    const run = await WorkflowRun.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });

    run.status     = 'completed';
    run.conclusion = 'cancelled';
    await run.save();

    res.json(run);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/* ── POST /actions/:owner/:repo/runs/:runId/rerun ── */
router.post('/:owner/:repo/runs/:runId/rerun', protect, async (req: AuthRequest, res: Response) => {
  try {
    const original = await WorkflowRun.findById(req.params.runId).lean();
    if (!original) return res.status(404).json({ message: 'Run not found' });

    const rerun = await WorkflowRun.create({
      ...original,
      _id:       undefined,
      status:    'queued',
      conclusion: undefined,
      startedAt: new Date().toISOString(),
      duration:  undefined,
      steps:     original.steps.map((s: any) => ({ ...s, status: 'queued', duration: undefined })),
    });

    res.status(201).json(rerun);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;