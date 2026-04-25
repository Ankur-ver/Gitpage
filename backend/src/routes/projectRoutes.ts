import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addColumn,
  updateColumn,
  deleteColumn,
  addItem,
  updateItem,
  deleteItem,
  moveItem,
  addMember,
  removeMember,
  getProjectStats,
} from '../controllers/projectController';
import { protect } from '../middleware/auth';   //

const router = Router();

// ── Project CRUD ──────────────────────────────────────────────────────────────
router.get   ('/',    protect, getProjects);
router.post  ('/',    protect, createProject);
router.get   ('/:id', protect, getProject);
router.put   ('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

// ── Stats ──────────────────────────────────────────────────────────────────────
router.get('/:id/stats', protect, getProjectStats);

// ── Columns ───────────────────────────────────────────────────────────────────
router.post  ('/:id/columns',           protect, addColumn);
router.put   ('/:id/columns/:columnId', protect, updateColumn);
router.delete('/:id/columns/:columnId', protect, deleteColumn);

// ── Items ──────────────────────────────────────────────────────────────────────
router.post  ('/:id/columns/:columnId/items',                protect, addItem);
router.put   ('/:id/columns/:columnId/items/:itemId',        protect, updateItem);
router.delete('/:id/columns/:columnId/items/:itemId',        protect, deleteItem);
router.post  ('/:id/columns/:columnId/items/:itemId/move',   protect, moveItem);

// ── Members ───────────────────────────────────────────────────────────────────
router.post  ('/:id/members',          protect, addMember);
router.delete('/:id/members/:userId',  protect, removeMember);

export default router;