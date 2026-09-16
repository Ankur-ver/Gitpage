import 'dotenv/config';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import simpleGit from 'simple-git';
import mongoose from 'mongoose';
import Repository from '../models/Repository';
import { buildRepositoryReadme } from '../utils/gitOperations';
import { persistNamedRepository, prepareRepository } from '../services/repositoryStorage';
import { connectDB } from '../config/database';

const migrate = async (): Promise<void> => {
  await connectDB();
  const repositories = await Repository.find({ status: 'ready' });

  for (const repository of repositories) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitpage-readme-'));
    try {
      const barePath = await fs.pathExists(repository.gitPath)
        ? repository.gitPath
        : await prepareRepository(repository.ownerUsername, repository.name);
      const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
      const remoteUrl = `${baseUrl}/${repository.ownerUsername}/${repository.name}.git`;
      await simpleGit().clone(barePath, tempDir, ['--branch', repository.defaultBranch || 'main', '--single-branch']);

      const readmePath = path.join(tempDir, 'README.md');
      const expected = buildRepositoryReadme(repository.name, repository.description, remoteUrl);
      const current = await fs.readFile(readmePath, 'utf8').catch(() => '');
      if (current === expected) {
        if (repository.cloneUrls.http !== remoteUrl) {
          repository.cloneUrls.http = remoteUrl;
          await repository.save();
        }
        console.log(`[README] unchanged ${repository.fullName}`);
        continue;
      }

      await fs.writeFile(readmePath, expected, 'utf8');
      const git = simpleGit(tempDir);
      await git.addConfig('user.name', 'GitPage');
      await git.addConfig('user.email', 'noreply@gitpage.com');
      await git.add('README.md');
      await git.commit('Update repository README instructions');
      await git.push('origin', repository.defaultBranch || 'main');
      await persistNamedRepository(repository.ownerUsername, repository.name, barePath);
      repository.cloneUrls.http = remoteUrl;
      await repository.save();
      console.log(`[README] updated ${repository.fullName}`);
    } catch (error) {
      console.error(`[README] failed ${repository.fullName}:`, (error as Error).message);
    } finally {
      await fs.remove(tempDir);
    }
  }

  await mongoose.disconnect();
};

migrate().catch((error) => {
  console.error('[README] migration failed:', error);
  process.exitCode = 1;
});