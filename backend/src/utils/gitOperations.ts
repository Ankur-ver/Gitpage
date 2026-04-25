import simpleGit from "simple-git";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import {
  GitOperationResult,
  InitRepositoryOptions,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Create a bare repository
// ─────────────────────────────────────────────────────────────────────────────
export const createBareRepository = async (
  repoPath: string
): Promise<GitOperationResult> => {
  try {
    await fs.ensureDir(repoPath);

    const git = simpleGit(repoPath);
    await git.init(true);

    const configPath = path.join(repoPath, "config");
    const configContent = await fs.readFile(configPath, "utf8");
    const updatedConfig = configContent.replace(
      /$$core$$/,
      "[core]\n\tdefaultBranch = main"
    );
    await fs.writeFile(configPath, updatedConfig);

    return { success: true, path: repoPath };
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to create bare repository: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get .gitignore template content
// ─────────────────────────────────────────────────────────────────────────────
const getGitignoreContent = (template: string): string => {
  const templates: Record<string, string> = {
    Node: `# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.env
.env.local
.env.*.local
dist/
build/
.DS_Store
*.log
`,
    Python: `# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd
.Python
env/
venv/
.env
dist/
build/
*.egg-info/
.DS_Store
*.log
`,
    Java: `# Java
*.class
*.jar
*.war
*.ear
target/
.DS_Store
*.log
.gradle/
build/
`,
    Go: `# Go
*.exe
*.test
*.out
vendor/
.DS_Store
`,
    React: `# React
node_modules/
build/
.env
.env.local
.env.*.local
npm-debug.log*
yarn-debug.log*
.DS_Store
`,
  };

  return templates[template] ?? "";
};

// ─────────────────────────────────────────────────────────────────────────────
// Get license template content
// ─────────────────────────────────────────────────────────────────────────────
const getLicenseContent = (
  template: string,
  ownerUsername: string
): string => {
  const year = new Date().getFullYear();

  const licenses: Record<string, string> = {
    MIT: `MIT License

Copyright (c) ${year} ${ownerUsername}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
    Apache: `Apache License
Version 2.0, January 2004

Copyright ${year} ${ownerUsername}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
`,
    GPL: `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) ${year} ${ownerUsername}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License.
`,
  };

  return licenses[template] ?? "";
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialize repository with initial commit and files
// ─────────────────────────────────────────────────────────────────────────────
export const initializeRepositoryWithFiles = async (
  bareRepoPath: string,
  repoName: string,
  ownerUsername: string,
  options: InitRepositoryOptions
): Promise<GitOperationResult> => {
  const { initializeWithReadme, gitignoreTemplate, licenseTemplate, description } = options;

  const tempDir = path.join(os.tmpdir(), `gitpage-init-${Date.now()}`);

  try {
    await fs.ensureDir(tempDir);

    const git = simpleGit(tempDir);

    await git.init();
    await git.addConfig("user.name", "GitPage");
    await git.addConfig("user.email", "noreply@gitpage.com");
    await git.checkoutLocalBranch("main");

    const filesToAdd: string[] = [];

    // Add README.md
    if (initializeWithReadme) {
      const readmeContent = `# ${repoName}\n\n${
        description ?? "A new repository created on GitPage"
      }\n`;
      await fs.writeFile(path.join(tempDir, "README.md"), readmeContent);
      filesToAdd.push("README.md");
    }

    // Add .gitignore
    if (gitignoreTemplate) {
      const gitignoreContent = getGitignoreContent(gitignoreTemplate);
      if (gitignoreContent) {
        await fs.writeFile(
          path.join(tempDir, ".gitignore"),
          gitignoreContent
        );
        filesToAdd.push(".gitignore");
      }
    }

    // Add LICENSE
    if (licenseTemplate) {
      const licenseContent = getLicenseContent(licenseTemplate, ownerUsername);
      if (licenseContent) {
        await fs.writeFile(path.join(tempDir, "LICENSE"), licenseContent);
        filesToAdd.push("LICENSE");
      }
    }

    // Fallback: create .gitkeep if no files
    if (filesToAdd.length === 0) {
      await fs.writeFile(path.join(tempDir, ".gitkeep"), "");
      filesToAdd.push(".gitkeep");
    }

    await git.add(filesToAdd);
    await git.commit("Initial commit");
    await git.addRemote("origin", bareRepoPath);
    await git.push("origin", "main");

    await fs.remove(tempDir);

    return { success: true };
  } catch (err) {
    await fs.remove(tempDir).catch(() => {});
    const error = err as Error;
    throw new Error(`Failed to initialize repository: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete repository from disk
// ─────────────────────────────────────────────────────────────────────────────
export const deleteRepositoryFromDisk = async (
  repoPath: string
): Promise<GitOperationResult> => {
  try {
    await fs.remove(repoPath);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    throw new Error(
      `Failed to delete repository from disk: ${error.message}`
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Check if repository path exists on disk
// ─────────────────────────────────────────────────────────────────────────────
export const repositoryExistsOnDisk = async (
  repoPath: string
): Promise<boolean> => {
  return fs.pathExists(repoPath);
};