import { Router, Request, Response } from "express";
import mongoose, { ClientSession } from "mongoose";
import * as path from "path";
import * as jwt from "jsonwebtoken";
import Repository from "../models/Repository";
import gitRoutes from "./git"
import User from "../models/User";
import { protect } from "../middleware/auth";
import {
  createBareRepository,
  initializeRepositoryWithFiles,
  deleteRepositoryFromDisk,
  repositoryExistsOnDisk,
} from "../utils/gitOperations";
import {
  AuthenticatedRequest,
  CreateRepositoryBody,
  PaginationQuery,
  JwtPayload,
  ApiResponse,
  PaginatedResponse,
  RepositoryResponseData,
  IRepository,
} from "../types";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Reserved repository names
// ─────────────────────────────────────────────────────────────────────────────
const RESERVED_NAMES: string[] = [
  ".",
  "..",
  "new",
  "create",
  "edit",
  "delete",
  "settings",
  "admin",
  "api",
  "login",
  "logout",
  "register",
  "explore",
  "trending",
  "notifications",
  "help",
  "about",
  "contact",
];

// ─────────────────────────────────────────────────────────────────────────────
// Validate repository name
// ─────────────────────────────────────────────────────────────────────────────
const validateRepoName = (name: string): string | null => {
  if (!name || typeof name !== "string") {
    return "Repository name is required";
  }
  if (name.length < 1 || name.length > 100) {
    return "Repository name must be between 1 and 100 characters";
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return "Repository name can only contain letters, numbers, dots, hyphens and underscores";
  }
  if (name.startsWith(".") || name.startsWith("-")) {
    return "Repository name cannot start with a dot or hyphen";
  }
  if (RESERVED_NAMES.includes(name.toLowerCase())) {
    return `'${name}' is a reserved name and cannot be used`;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: abort transaction and end session safely
// ─────────────────────────────────────────────────────────────────────────────
const abortAndEndSession = async (session: ClientSession): Promise<void> => {
  try {
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/repositories
// @desc    Create a new repository
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  protect,
  async (
    req: Request<{}, ApiResponse<RepositoryResponseData>, CreateRepositoryBody>,
    res: Response<ApiResponse<RepositoryResponseData>>
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    let repoPath: string | null = null;
    let repoCreatedOnDisk = false;

    try {
      const {
        name,
        description,
        visibility,
        initializeWithReadme,
        gitignoreTemplate,
        licenseTemplate,
      } = req.body as CreateRepositoryBody;

      const owner = authReq.user;

      // ── Step 1: Validate repo name ─────────────────────────────────────────
      const nameError = validateRepoName(name);
      if (nameError) {
        await abortAndEndSession(session);
        res.status(400).json({ success: false, error: nameError });
        return;
      }

      // ── Step 2: Validate visibility ────────────────────────────────────────
      const allowedVisibility = ["public", "private"];
      if (visibility && !allowedVisibility.includes(visibility)) {
        await abortAndEndSession(session);
        res.status(400).json({
          success: false,
          error: "Visibility must be either public or private",
        });
        return;
      }

      // ── Step 3: Check for duplicate repo under same owner ──────────────────
      const existingRepo = await Repository.findOne({
        owner: owner._id,
        name: name.trim(),
      });

      if (existingRepo) {
        await abortAndEndSession(session);
        res.status(409).json({
          success: false,
          error: `A repository named '${name}' already exists under your account`,
        });
        return;
      }

      // ── Step 4: Build storage path ─────────────────────────────────────────
      const repoBasePath =
        process.env.REPO_STORAGE_PATH || process.env.REPOS_DIR;

      if (!repoBasePath) {
        await abortAndEndSession(session);
        res.status(500).json({
          success: false,
          error: "Repository storage path is not configured.",
        });
        return;
      }

      repoPath = path.resolve(repoBasePath, owner.username, `${name}.git`);

      const existsOnDisk = await repositoryExistsOnDisk(repoPath);
      if (existsOnDisk) {
        await abortAndEndSession(session);
        res.status(409).json({
          success: false,
          error: "Repository storage path already exists",
        });
        return;
      }
      console.log("hello.....repo")
      // ── Step 5: Create repository document in MongoDB ──────────────────────
      const repository = new Repository({
        name: name.trim(),
        fullName: `${owner.username}/${name.trim()}`,
        description: description ? description.trim() : "",
        owner: owner._id,
        ownerUsername: owner.username,
        visibility: visibility ?? "public",
        defaultBranch: "main",
        isInitialized: false,
        status: "creating",
        initOptions: {
          initializeWithReadme: initializeWithReadme ?? false,
          gitignoreTemplate: gitignoreTemplate ?? "",
          licenseTemplate: licenseTemplate ?? "",
        },
        gitPath: repoPath,
        cloneUrls: {
          http: `http://localhost:${process.env.PORT}/${owner.username}/${name}.git`,
          ssh: `git@gitpage.com:${owner.username}/${name}.git`,
        },
      });
      console.log(repository);
      await repository.save({ session });

      // ── Step 6: Add repository reference to user ───────────────────────────
      await User.findByIdAndUpdate(
        owner._id,
        { $push: { repositories: repository._id } },
        { session }
      );

      // ── Step 7: Create bare repository on disk ─────────────────────────────
      await createBareRepository(repoPath);
      repoCreatedOnDisk = true;

      // ── Step 8: Initialize with files if requested ─────────────────────────
      const shouldInitialize = Boolean(
        initializeWithReadme || gitignoreTemplate || licenseTemplate
      );

      if (shouldInitialize) {
        await initializeRepositoryWithFiles(
          repoPath,
          name.trim(),
          owner.username,
          {
            initializeWithReadme: initializeWithReadme ?? false,
            gitignoreTemplate: gitignoreTemplate ?? "",
            licenseTemplate: licenseTemplate ?? "",
            description: description ? description.trim() : "",
          }
        );
      }

      // ── Step 9: Mark repository as ready ───────────────────────────────────
      repository.isInitialized = shouldInitialize;
      repository.status = "ready";
      await repository.save({ session });

      // ── Step 10: Commit transaction ─────────────────────────────────────────
      await session.commitTransaction();
      session.endSession();

      // ── Step 11: Return success response ───────────────────────────────────
      res.status(201).json({
        success: true,
        message: "Repository created successfully",
        data: {
          id: repository._id,
          name: repository.name,
          fullName: repository.fullName,
          description: repository.description,
          visibility: repository.visibility,
          owner: {
            id: owner._id,
            username: owner.username,
          },
          defaultBranch: repository.defaultBranch,
          isInitialized: repository.isInitialized,
          status: repository.status,
          cloneUrls: repository.cloneUrls,
          starCount: repository.starCount,
          forkCount: repository.forkCount,
          createdAt: repository.createdAt,
          htmlUrl: `/${owner.username}/${name}`,
        },
      });
    } catch (err) {
      // ── Rollback transaction ──────────────────────────────────────────────
      await abortAndEndSession(session);

      // ── Cleanup disk if repo was created ──────────────────────────────────
      if (repoCreatedOnDisk && repoPath) {
        await deleteRepositoryFromDisk(repoPath).catch((cleanupErr: Error) => {
          console.error("Cleanup error:", cleanupErr.message);
        });
      }

      const error = err as Error;
      console.error("❌ Create repository error:", error.message);

      res.status(500).json({
        success: false,
        error: "Failed to create repository. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories
// @desc    Get all public repositories
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  async (
    req: Request<{}, {}, {}, PaginationQuery>,
    res: Response<PaginatedResponse<IRepository>>
  ): Promise<void> => {
    try {
      const {
        page = "1",
        limit = "10",
        sort = "createdAt",
        order = "desc",
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const query = { visibility: "public", status: "ready" };

      // Whitelist allowed sort fields to prevent injection
      const allowedSortFields = ["createdAt", "updatedAt", "name", "stars"];
      const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

      const sortObj: Record<string, 1 | -1> = {
        [sortField]: order === "asc" ? 1 : -1,
      };

      const [repositories, total] = (await Promise.all([
        Repository.find(query)
          .populate("owner", "username avatar")
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .select("-gitPath -collaborators")
          .lean()
          .exec() as unknown as Promise<IRepository[]>,

        Repository.countDocuments(query).exec(),
      ])) as [IRepository[], number];

      res.status(200).json({
        success: true,
        data: repositories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error("❌ Get repositories error:", error.message);
      res.status(500).json({
        success: false,
        data: [],
        error: "Failed to fetch repositories",
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/my
// @desc    Get authenticated user's repositories
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/my",
  protect,
  async (
    req: Request<{}, {}, {}, PaginationQuery>,
    res: Response<PaginatedResponse<IRepository>>
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { page = "1", limit = "10" } = req.query as PaginationQuery;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [repositories, total] = (await Promise.all([
        Repository.find({ owner: authReq.user._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .select("-gitPath")
          .lean()
          .exec() as unknown as Promise<IRepository[]>,

        Repository.countDocuments({ owner: authReq.user._id }).exec(),
      ])) as [IRepository[], number];
      res.status(200).json({
        success: true,
        data: repositories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error("❌ Get my repositories error:", error.message);
      res.status(500).json({
        success: false,
        data: [],
        error: "Failed to fetch your repositories",
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/repositories/:username/:repoName
// @desc    Get a single repository
// @access  Public (private repos need auth)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:username/:repoName",
  async (
    req: Request<{ username: string; repoName: string }>,
    res: Response<ApiResponse<IRepository>>
  ): Promise<void> => {
    try {
      const { username, repoName } = req.params;

      const repository = (await Repository.findOne({
        ownerUsername: username,
        name: repoName,
      })
        .populate("owner", "username avatar bio")
        .select("-gitPath")
        .lean()
        .exec()) as unknown as IRepository | null;

      if (!repository) {
        res.status(404).json({
          success: false,
          error: "Repository not found",
        });
        return;
      }

      // ── Check private repo access ───────────────────────────────────────────
      if (repository.visibility === "private") {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
          res.status(403).json({
            success: false,
            error: "Access denied. This is a private repository.",
          });
          return;
        }

        try {
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
          ) as JwtPayload;

          const ownerDoc = repository.owner as { _id: mongoose.Types.ObjectId };

          const isOwner =
            ownerDoc._id.toString() === decoded.id.toString();

          const isCollaborator = repository.collaborators.some(
            (c) => c.user.toString() === decoded.id.toString()
          );

          if (!isOwner && !isCollaborator) {
            res.status(403).json({
              success: false,
              error: "Access denied. This is a private repository.",
            });
            return;
          }
        } catch {
          res.status(403).json({
            success: false,
            error: "Access denied. Invalid token.",
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        data: repository,
      });
    } catch (err) {
      const error = err as Error;
      console.error("❌ Get repository error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to fetch repository",
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/repositories/:username/:repoName
// @desc    Delete a repository
// @access  Private (owner only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/:username/:repoName",
  protect,
  async (
    req: Request<{ username: string; repoName: string }>,
    res: Response<ApiResponse>
  ): Promise<void> => {
    const authReq = req as unknown as AuthenticatedRequest;
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      const { username, repoName } = req.params as {
        username: string;
        repoName: string;
      };

      const repository = await Repository.findOne({
        ownerUsername: username,
        name: repoName,
      });

      if (!repository) {
        await abortAndEndSession(session);
        res.status(404).json({
          success: false,
          error: "Repository not found",
        });
        return;
      }

      // Only owner can delete
      if (repository.owner.toString() !== authReq.user._id.toString()) {
        await abortAndEndSession(session);
        res.status(403).json({
          success: false,
          error: "Not authorized to delete this repository",
        });
        return;
      }

      const repoPath: string = repository.gitPath;

      // ── Remove repo from DB ─────────────────────────────────────────────────
      await Repository.findByIdAndDelete(repository._id, { session });

      // ── Remove repo reference from user ─────────────────────────────────────
      await User.findByIdAndUpdate(
        authReq.user._id,
        { $pull: { repositories: repository._id } },
        { session }
      );

      // ── Delete from disk ────────────────────────────────────────────────────
      await deleteRepositoryFromDisk(repoPath);

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: `Repository '${repoName}' deleted successfully`,
      });
    } catch (err) {
      await abortAndEndSession(session);
      const error = err as Error;
      console.error("❌ Delete repository error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to delete repository",
      });
    }
  }
);

export default router;