import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';

const provider = (process.env.REPO_STORAGE_PROVIDER || 'local').toLowerCase();
const bucket = process.env.S3_BUCKET;
const cacheRoot = path.resolve(
  process.env.REPO_CACHE_DIR || path.join(os.tmpdir(), 'gitpage-repos')
);

const s3 = provider === 's3' && bucket
  ? new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
    })
  : null;

const requireS3 = (): { client: S3Client; bucket: string } => {
  if (!s3 || !bucket) {
    throw new Error('S3 storage is not configured. Set REPO_STORAGE_PROVIDER=s3 and S3_BUCKET.');
  }
  return { client: s3, bucket };
};

export const repositoryObjectKey = (owner: string, repoName: string): string =>
  `repositories/${owner.toLowerCase()}/${repoName}.git.tar.gz`;

export const localRepositoryPath = (objectKey: string): string =>
  provider !== 's3'
    ? path.resolve(
        process.env.REPO_STORAGE_PATH || process.env.REPOS_DIR || path.resolve(process.cwd(), 'repos'),
        objectKey.split('/')[1],
        objectKey.split('/').pop()!.replace('.tar.gz', '')
      )
    : path.join(cacheRoot, ...objectKey.split('/').slice(0, -1), objectKey.split('/').pop()!.replace('.tar.gz', ''));

const archivePath = (repoPath: string): string => `${repoPath}.tar.gz`;

export const repositoryStoragePath = (owner: string, repoName: string): string => {
  const objectKey = repositoryObjectKey(owner, repoName);
  if (provider !== 's3') {
    return path.resolve(
      process.env.REPO_STORAGE_PATH || process.env.REPOS_DIR || path.resolve(process.cwd(), 'repos'),
      owner,
      `${repoName}.git`
    );
  }
  return localRepositoryPath(objectKey);
};

export const repositoryExists = async (objectKey: string): Promise<boolean> => {
  if (provider !== 's3') return fs.pathExists(localRepositoryPath(objectKey));
  const { client, bucket: targetBucket } = requireS3();
  try {
    await client.send(new HeadObjectCommand({ Bucket: targetBucket, Key: objectKey }));
    return true;
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false;
    throw error;
  }
};

export const materializeRepository = async (objectKey: string): Promise<string> => {
  const repoPath = localRepositoryPath(objectKey);
  if (await fs.pathExists(path.join(repoPath, 'HEAD'))) return repoPath;

  await fs.remove(repoPath);
  await fs.ensureDir(path.dirname(repoPath));

  if (provider !== 's3') {
    throw new Error(`Repository archive not found: ${objectKey}`);
  }

  const { client, bucket: targetBucket } = requireS3();
  const response = await client.send(new GetObjectCommand({ Bucket: targetBucket, Key: objectKey }));
  if (!response.Body) throw new Error(`Empty repository archive: ${objectKey}`);

  const archive = archivePath(repoPath);
  await pipeline(response.Body as NodeJS.ReadableStream, fs.createWriteStream(archive));
  await tar.x({ file: archive, cwd: path.dirname(repoPath), gzip: true });
  await fs.remove(archive);
  return repoPath;
};

export const prepareRepository = async (owner: string, repoName: string): Promise<string> => {
  const objectKey = repositoryObjectKey(owner, repoName);
  if (provider !== 's3') return repositoryStoragePath(owner, repoName);
  return materializeRepository(objectKey);
};

export const materializeRepositoryReference = async (reference: string): Promise<string> => {
  if (!reference.startsWith('repositories/')) return reference;
  return materializeRepository(reference);
};

export const persistRepository = async (objectKey: string, repoPath = localRepositoryPath(objectKey)): Promise<void> => {
  if (provider !== 's3') return;
  const { client, bucket: targetBucket } = requireS3();
  const archive = archivePath(repoPath);
  await tar.c({ gzip: true, file: archive, cwd: path.dirname(repoPath) }, [path.basename(repoPath)]);
  await client.send(new PutObjectCommand({
    Bucket: targetBucket,
    Key: objectKey,
    Body: await fs.readFile(archive),
    ContentType: 'application/gzip',
  }));
  await fs.remove(archive);
};

export const persistNamedRepository = async (owner: string, repoName: string, repoPath?: string): Promise<void> =>
  persistRepository(repositoryObjectKey(owner, repoName), repoPath);

export const deleteRepository = async (objectKey: string): Promise<void> => {
  await fs.remove(localRepositoryPath(objectKey));
  if (provider === 's3') {
    const { client, bucket: targetBucket } = requireS3();
    await client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: objectKey }));
  }
};

export const isObjectStorageEnabled = (): boolean => provider === 's3';