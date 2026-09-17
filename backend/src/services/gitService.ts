import { execSync } from 'child_process';
import path from 'path';
import fs   from 'fs';
import { prepareRepository } from './repositoryStorage';

const REPOS_DIR = process.env.REPOS_DIR || path.resolve(process.cwd(), 'repos');

const gitService = {
  /* ── Init bare repo ────────────────────────────────────────── */
  initRepo(owner: string, repoName: string): string {
    const repoPath = path.join(REPOS_DIR, owner, `${repoName}.git`);
    try {
      fs.mkdirSync(repoPath, { recursive: true });
      execSync('git init --bare', { 
        cwd: repoPath, 
        stdio: 'pipe' // Changed to pipe to capture output
      });
      return repoPath;
    } catch (error: any) {
      console.error('Git init error:', error.message);
      throw new Error(`Failed to initialize git repository: ${error.message}`);
    }
  },

  /* ── Get branches ──────────────────────────────────────────── */
  getBranches(owner: string, repoName: string): string[] {
    const repoPath = path.join(REPOS_DIR, owner, `${repoName}.git`);
    try {
      const output = execSync('git branch', { cwd: repoPath }).toString();
      return output
        .split('\n')
        .map(b => b.replace('*', '').trim())
        .filter(Boolean);
    } catch {
      return ['main'];
    }
  },

  /* ── Get commits ───────────────────────────────────────────── */
  getCommits(owner: string, repoName: string, branch = 'main', limit = 20) {
    const repoPath = path.join(REPOS_DIR, owner, `${repoName}.git`);
    try {
      const format = '--pretty=format:%H|%s|%an|%ae|%ai';
      const output = execSync(
        `git log ${branch} ${format} -n ${limit}`,
        { cwd: repoPath }
      ).toString();

      return output
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [sha, message, authorName, authorEmail, date] = line.split('|');
          return { sha, message, author: { name: authorName, email: authorEmail, date } };
        });
    } catch {
      return [];
    }
  },

  /* ── Count commits ───────────────────────────────────────────────── */
  async getCommitCount(owner: string, repoName: string) {
    const repoPath = await prepareRepository(owner, repoName);
    try {
      const output = execSync('git rev-list --all --count', { cwd: repoPath }).toString().trim();
      return Number(output) || 0;
    } catch {
      return 0;
    }
  },

  /* ── Commits in a date window ─────────────────────────────── */
  async getCommitsSince(owner: string, repoName: string, since: Date) {
    const repoPath = await prepareRepository(owner, repoName);
    try {
      const format = '--pretty=format:%an|%ae|%aI';
      const output = execSync(
        `git log --all --since=${JSON.stringify(since.toISOString())} ${format}`,
        { cwd: repoPath }
      ).toString();

      return output
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [authorName, authorEmail, date] = line.split('|');
          return { authorName, authorEmail, date };
        });
    } catch {
      return [];
    }
  },

  /* ── Repo exists? ──────────────────────────────────────────── */
  async repoExists(owner: string, repoName: string): Promise<boolean> {
    try {
      await prepareRepository(owner, repoName);
      return true;
    } catch {
      return false;
    }
  },

  /* ── Delete repo ───────────────────────────────────────────── */
  deleteRepo(owner: string, repoName: string): void {
    const repoPath = path.join(REPOS_DIR, owner, `${repoName}.git`);
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  },
};

export default gitService;