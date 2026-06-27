import simpleGit from 'simple-git';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

export interface PRDiffResult {
  files: { filename: string; additions: number; deletions: number; content?: string }[];
  additions: number;
  deletions: number;
  commits: number;
}

export const computeDiffBetweenRepos = async (
  upstreamBarePath: string,
  forkBarePath: string,
  baseBranch: string,
  headBranch: string
): Promise<PRDiffResult> => {
  const tmpDir = path.join(
    os.tmpdir(),
    `gitpage-pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  try {
    await fs.ensureDir(tmpDir);

    const git = simpleGit();

    // clone upstream
    await git.clone(upstreamBarePath, tmpDir);

    const repoGit = simpleGit(tmpDir);

    // add fork remote
    await repoGit.addRemote("fork", forkBarePath);

    // fetch upstream + fork
    await repoGit.fetch("origin");
    await repoGit.fetch(
      "fork",
      `${headBranch}:refs/heads/fork-head`
    );

    const branches = await repoGit.branch(["-a"]);
    console.log("[DIFF] branches:", branches.all);

    const baseRef = `origin/${baseBranch}`;
    const headRef = "fork-head";

    console.log("[DIFF] Comparing", baseRef, "vs", headRef);

    const commitsRaw = await repoGit.raw([
      "rev-list",
      "--count",
      `${baseRef}..${headRef}`,
    ]);

    const commits = parseInt(commitsRaw.trim(), 10) || 0;

    const numstat = await repoGit.raw([
      "diff",
      "--numstat",
      `${baseRef}...${headRef}`,
    ]);

    const files: {
      filename: string;
      additions: number;
      deletions: number;
      content?: string;
    }[] = [];

    let additions = 0;
    let deletions = 0;

    if (numstat.trim()) {
      const lines = numstat.trim().split(/\r?\n/);

      for (const line of lines) {
        const parts = line.split("\t");

        if (parts.length >= 3) {
          const a =
            parts[0] === "-"
              ? 0
              : parseInt(parts[0], 10) || 0;

          const d =
            parts[1] === "-"
              ? 0
              : parseInt(parts[1], 10) || 0;

          const filename = parts.slice(2).join("\t");

          files.push({
            filename,
            additions: a,
            deletions: d,
          });

          additions += a;
          deletions += d;
        }
      }
    }

    console.log("[DIFF] RESULT:", {
      commits,
      additions,
      deletions,
      files: files.length,
    });

    return {
      files,
      additions,
      deletions,
      commits,
    };
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
};

export const computeDiffWithContents = async (
  upstreamBarePath: string,
  forkBarePath: string,
  baseBranch: string,
  headBranch: string
): Promise<PRDiffResult> => {
  const tmpDir = path.join(
    os.tmpdir(),
    `gitpage-pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  try {
    await fs.ensureDir(tmpDir);

    const git = simpleGit();

    await git.clone(upstreamBarePath, tmpDir);

    const repoGit = simpleGit(tmpDir);

    await repoGit.addRemote("fork", forkBarePath);

    await repoGit.fetch("origin");
    await repoGit.fetch(
      "fork",
      `${headBranch}:refs/heads/fork-head`
    );

    const baseRef = `origin/${baseBranch}`;
    const headRef = "fork-head";

    console.log("[DETAIL DIFF]", {
      baseRef,
      headRef,
    });

    const commitsRaw = await repoGit.raw([
      "rev-list",
      "--count",
      `${baseRef}..${headRef}`,
    ]);

    const commits = parseInt(commitsRaw.trim(), 10) || 0;

    const numstat = await repoGit.raw([
      "diff",
      "--numstat",
      `${baseRef}...${headRef}`,
    ]);

    const files: {
      filename: string;
      additions: number;
      deletions: number;
      content?: string;
    }[] = [];

    let additions = 0;
    let deletions = 0;

    if (numstat.trim()) {
      const lines = numstat.trim().split(/\r?\n/);

      for (const line of lines) {
        const parts = line.split("\t");

        if (parts.length >= 3) {
          const a =
            parts[0] === "-"
              ? 0
              : parseInt(parts[0], 10) || 0;

          const d =
            parts[1] === "-"
              ? 0
              : parseInt(parts[1], 10) || 0;

          const filename = parts.slice(2).join("\t");

          let content: string | undefined;

          try {
            content = await repoGit.raw([
              "show",
              `${headRef}:${filename}`,
            ]);
          } catch {
            content = undefined;
          }

          files.push({
            filename,
            additions: a,
            deletions: d,
            content,
          });

          additions += a;
          deletions += d;
        }
      }
    }

    console.log("[DETAIL DIFF RESULT]", {
      commits,
      additions,
      deletions,
      files: files.length,
    });

    return {
      files,
      additions,
      deletions,
      commits,
    };
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
};
