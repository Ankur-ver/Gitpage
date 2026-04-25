import { Request, Response } from 'express';
import mongoose              from 'mongoose';
import Project               from '../models/Projects';
import Repository            from '../models/Repository';
import {
  IProject,
  IProjectColumnInput,
  MemberRole,
  ProjectTemplate,
  CreateProjectBody,
  UpdateProjectBody,
  AddColumnBody,
  UpdateColumnBody,
  AddItemBody,
  UpdateItemBody,
  MoveItemBody,
  AddMemberBody,
} from '../types/project';

// ── helpers ───────────────────────────────────────────────────────────────────

const ROLE_RANK: Record<MemberRole, number> = { viewer: 0, editor: 1, admin: 2 };

const isOwnerOrMember = (
  project  : IProject,
  userId   : string,
  required : MemberRole = 'viewer'
): boolean => {
  if (project.owner.toString() === userId) return true;
  const member = project.members.find((m) => m.user.toString() === userId);
  return !!member && ROLE_RANK[member.role] >= ROLE_RANK[required];
};

const sanitize = (project: IProject) => {
  const obj = project.toObject({ virtuals: true });
  return {
    _id        : obj._id,
    name       : obj.name,
    description: obj.description,
    status     : obj.status,
    visibility : obj.visibility,
    template   : obj.template,
    owner      : obj.owner,
    repository : obj.repository,
    members    : obj.members,
    columns    : obj.columns,
    items      : obj.items,
    itemCount  : obj.itemCount,
    createdAt  : obj.createdAt,
    updatedAt  : obj.updatedAt,
  };
};

// =============================================================================
// GET /projects
// =============================================================================
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId                   = (req as any).user._id.toString();
    const { status, visibility, page = '1', limit = '20' } = req.query as Record<string, string>;

    const query: Record<string, any> = {
      $or: [{ owner: userId }, { 'members.user': userId }],
    };
    if (status)     query.status     = status;
    if (visibility) query.visibility = visibility;

    const skip                 = (Number(page) - 1) * Number(limit);
    const [projects, total]    = await Promise.all([
      Project.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('owner',      'username avatar')
        .populate('repository', 'name ownerUsername'),
      Project.countDocuments(query),
    ]);

    res.json({
      success   : true,
      data      : projects.map(sanitize),
      pagination: {
        total,
        page : Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('getProjects:', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

// =============================================================================
// GET /projects/:id
// =============================================================================
export const getProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id)
      .populate('owner',                   'username avatar')
      .populate('repository',              'name ownerUsername')
      .populate('members.user',            'username avatar')
      .populate('columns.items.assignees', 'username avatar');

    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }

    if (project.visibility !== 'public' && !isOwnerOrMember(project, userId)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ success: true, data: sanitize(project) });
  } catch (err) {
    console.error('getProject:', err);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
};

// =============================================================================
// POST /projects
// =============================================================================
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { name, description, visibility, template, repositoryId } =
      req.body as CreateProjectBody;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    if (repositoryId) {
      const repo = await Repository.findById(repositoryId);
      if (!repo) { res.status(404).json({ message: 'Repository not found' }); return; }
      if (repo.owner.toString() !== userId.toString()) {
        res.status(403).json({ message: 'You do not own that repository' });
        return;
      }
    }

    const chosenTemplate = (template ?? 'blank') as ProjectTemplate;

    // ✅ defaultColumns now returns IProjectColumnInput[] — no type error
    const columns: IProjectColumnInput[] = (Project as any).defaultColumns(chosenTemplate);

    const project = await Project.create({
      name       : name.trim(),
      description: description?.trim() ?? '',
      visibility : visibility ?? 'private',
      template   : chosenTemplate,
      owner      : userId,
      repository : repositoryId ?? null,
      columns,
    });

    await project.populate('owner', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data   : sanitize(project),
    });
  } catch (err) {
    console.error('createProject:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
};
// =============================================================================
// PUT /projects/:id
// =============================================================================
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);

    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const body    = req.body as UpdateProjectBody;
    const allowed = ['name', 'description', 'status', 'visibility'] as const;
    allowed.forEach((f) => {
      if (body[f] !== undefined) (project as any)[f] = body[f];
    });

    await project.save();
    res.json({ success: true, message: 'Project updated', data: sanitize(project) });
  } catch (err) {
    console.error('updateProject:', err);
    res.status(500).json({ message: 'Failed to update project' });
  }
};

// =============================================================================
// DELETE /projects/:id
// =============================================================================
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);

    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (project.owner.toString() !== userId) {
      res.status(403).json({ message: 'Only the project owner can delete it' });
      return;
    }

    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('deleteProject:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// =============================================================================
// POST /projects/:id/columns
// =============================================================================
export const addColumn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId          = (req as any).user._id.toString();
    const { name, color } = req.body as AddColumnBody;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Column name is required' });
      return;
    }

    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // ✅ Use IProjectColumnInput — Mongoose generates _id, createdAt, updatedAt
    const newColumn: IProjectColumnInput = {
      name    : name.trim(),
      color   : color ?? '#6366f1',
      position: project.columns.length,
      items   : [],
    };

    project.columns.push(newColumn as any);   // ← 'as any' lets Mongoose handle subdoc creation
    await project.save();

    const saved = project.columns[project.columns.length - 1];
    res.status(201).json({ success: true, message: 'Column added', data: saved });
  } catch (err) {
    console.error('addColumn:', err);
    res.status(500).json({ message: 'Failed to add column' });
  }
};

// =============================================================================
// PUT /projects/:id/columns/:columnId
// =============================================================================
export const updateColumn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const col = (project.columns as any).id(req.params.columnId);
    if (!col) { res.status(404).json({ message: 'Column not found' }); return; }

    const body = req.body as UpdateColumnBody;
    if (body.name     !== undefined) col.name     = body.name.trim();
    if (body.color    !== undefined) col.color    = body.color;
    if (body.position !== undefined) col.position = body.position;

    await project.save();
    res.json({ success: true, message: 'Column updated', data: col });
  } catch (err) {
    console.error('updateColumn:', err);
    res.status(500).json({ message: 'Failed to update column' });
  }
};

// =============================================================================
// DELETE /projects/:id/columns/:columnId
// =============================================================================
export const deleteColumn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const col = (project.columns as any).id(req.params.columnId);
    if (!col) { res.status(404).json({ message: 'Column not found' }); return; }

    col.deleteOne();
    await project.save();
    res.json({ success: true, message: 'Column deleted' });
  } catch (err) {
    console.error('deleteColumn:', err);
    res.status(500).json({ message: 'Failed to delete column' });
  }
};

// =============================================================================
// POST /projects/:id/columns/:columnId/items
// =============================================================================
export const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();
    const { title, body, priority, labels, dueDate, assignees } = req.body as AddItemBody;

    if (!title?.trim()) { res.status(400).json({ message: 'Item title is required' }); return; }

    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const col = (project.columns as any).id(req.params.columnId);
    if (!col) { res.status(404).json({ message: 'Column not found' }); return; }

    col.items.push({
      title    : title.trim(),
      body     : body?.trim() ?? '',
      priority : priority  ?? 'medium',
      labels   : labels    ?? [],
      dueDate  : dueDate   ? new Date(dueDate) : null,
      assignees: assignees ?? [],
      position : col.items.length,
    });

    await project.save();
    const newItem = col.items[col.items.length - 1];
    res.status(201).json({ success: true, message: 'Item added', data: newItem });
  } catch (err) {
    console.error('addItem:', err);
    res.status(500).json({ message: 'Failed to add item' });
  }
};

// =============================================================================
// PUT /projects/:id/columns/:columnId/items/:itemId
// =============================================================================
export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const col = (project.columns as any).id(req.params.columnId);
    if (!col)  { res.status(404).json({ message: 'Column not found' }); return; }

    const item = (col.items as any).id(req.params.itemId);
    if (!item) { res.status(404).json({ message: 'Item not found' }); return; }

    const body    = req.body as UpdateItemBody;
    const allowed = ['title', 'body', 'status', 'priority', 'labels', 'assignees', 'position'] as const;
    allowed.forEach((f) => { if (body[f] !== undefined) item[f] = body[f]; });
    if (body.dueDate !== undefined) item.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    await project.save();
    res.json({ success: true, message: 'Item updated', data: item });
  } catch (err) {
    console.error('updateItem:', err);
    res.status(500).json({ message: 'Failed to update item' });
  }
};

// =============================================================================
// DELETE /projects/:id/columns/:columnId/items/:itemId
// =============================================================================
export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const col = (project.columns as any).id(req.params.columnId);
    if (!col)  { res.status(404).json({ message: 'Column not found' }); return; }

    const item = (col.items as any).id(req.params.itemId);
    if (!item) { res.status(404).json({ message: 'Item not found' }); return; }

    item.deleteOne();
    await project.save();
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    console.error('deleteItem:', err);
    res.status(500).json({ message: 'Failed to delete item' });
  }
};

// =============================================================================
// POST /projects/:id/columns/:columnId/items/:itemId/move
// =============================================================================
export const moveItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId                        = (req as any).user._id.toString();
    const { targetColumnId, position }  = req.body as MoveItemBody;

    if (!targetColumnId) {
      res.status(400).json({ message: 'targetColumnId is required' });
      return;
    }

    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'editor')) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const srcCol = (project.columns as any).id(req.params.columnId);
    if (!srcCol) { res.status(404).json({ message: 'Source column not found' }); return; }

    const item = (srcCol.items as any).id(req.params.itemId);
    if (!item)  { res.status(404).json({ message: 'Item not found' }); return; }

    const dstCol = (project.columns as any).id(targetColumnId);
    if (!dstCol) { res.status(404).json({ message: 'Target column not found' }); return; }

    // clone → remove from source → insert into destination
    const itemData = item.toObject();
    item.deleteOne();

    const insertAt = position ?? dstCol.items.length;
    dstCol.items.splice(insertAt, 0, {
      ...itemData,
      _id     : new mongoose.Types.ObjectId(),
      position: insertAt,
    });

    // re-index destination positions
    (dstCol.items as any[]).forEach((it: any, idx: number) => { it.position = idx; });

    await project.save();
    res.json({ success: true, message: 'Item moved' });
  } catch (err) {
    console.error('moveItem:', err);
    res.status(500).json({ message: 'Failed to move item' });
  }
};

// =============================================================================
// POST /projects/:id/members
// =============================================================================
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId           = (req as any).user._id.toString();
    const { userId: newUserId, role = 'editor' } = req.body as AddMemberBody;

    if (!newUserId) { res.status(400).json({ message: 'userId is required' }); return; }

    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'admin')) {
      res.status(403).json({ message: 'Only admins can add members' });
      return;
    }

    const already = project.members.find((m) => m.user.toString() === newUserId);
    if (already)  { res.status(409).json({ message: 'User is already a member' }); return; }

    project.members.push({ user: new mongoose.Types.ObjectId(newUserId), role: role as MemberRole, addedAt: new Date() });
    await project.save();
    await project.populate('members.user', 'username avatar');

    res.status(201).json({ success: true, message: 'Member added', data: project.members });
  } catch (err) {
    console.error('addMember:', err);
    res.status(500).json({ message: 'Failed to add member' });
  }
};

// =============================================================================
// DELETE /projects/:id/members/:userId
// =============================================================================
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId, 'admin')) {
      res.status(403).json({ message: 'Only admins can remove members' });
      return;
    }

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    console.error('removeMember:', err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};

// =============================================================================
// GET /projects/:id/stats
// =============================================================================
export const getProjectStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId  = (req as any).user._id.toString();
    const project = await Project.findById(req.params.id);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    if (!isOwnerOrMember(project, userId)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const allItems   = project.columns.flatMap((c) => c.items);

    const byColumn   = project.columns.map((col) => ({
      columnId  : col._id,
      columnName: col.name,
      count     : col.items.length,
    }));

    const byPriority = (['low', 'medium', 'high', 'critical'] as const).map((p) => ({
      priority: p,
      count   : allItems.filter((i) => i.priority === p).length,
    }));

    const byStatus   = (['todo', 'in_progress', 'in_review', 'done'] as const).map((s) => ({
      status: s,
      count : allItems.filter((i) => i.status === s).length,
    }));

    res.json({
      success: true,
      data   : {
        totalItems: allItems.length,
        byColumn,
        byPriority,
        byStatus,
        members   : project.members.length + 1,
        columns   : project.columns.length,
      },
    });
  } catch (err) {
    console.error('getProjectStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};