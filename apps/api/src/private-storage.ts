import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface PrivateStorage {
  put(objectKey: string, content: Buffer): Promise<void>;
  get(objectKey: string): Promise<Buffer>;
  delete(objectKey: string): Promise<void>;
}

class LocalPrivateStorage implements PrivateStorage {
  private readonly rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = rootDirectory;
  }

  private resolve(objectKey: string): string {
    if (!/^[0-9a-f-]+\/[0-9a-f-]+$/i.test(objectKey)) {
      throw new Error('Invalid private object key');
    }
    return join(this.rootDirectory, objectKey);
  }

  async put(objectKey: string, content: Buffer): Promise<void> {
    const path = this.resolve(objectKey);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
  }

  async get(objectKey: string): Promise<Buffer> {
    return readFile(this.resolve(objectKey));
  }

  async delete(objectKey: string): Promise<void> {
    try {
      await unlink(this.resolve(objectKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

class S3PrivateStorage implements PrivateStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(input: {
    endpoint: string;
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  }) {
    this.bucket = input.bucket;
    this.client = new S3Client({
      endpoint: input.endpoint,
      region: input.region,
      forcePathStyle: input.forcePathStyle,
      credentials: {
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
      },
    });
  }

  async put(objectKey: string, content: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: content,
        ContentType: 'application/octet-stream',
      }),
    );
  }

  async get(objectKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error('Private object storage returned an empty body');
    }

    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for S3 private storage`);
  return value;
}

function createS3PrivateStorage(): PrivateStorage {
  return new S3PrivateStorage({
    endpoint: requiredEnvironment('OBJECT_STORAGE_ENDPOINT'),
    bucket: requiredEnvironment('OBJECT_STORAGE_BUCKET'),
    region: process.env.OBJECT_STORAGE_REGION?.trim() || 'auto',
    accessKeyId: requiredEnvironment('OBJECT_STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnvironment('OBJECT_STORAGE_SECRET_ACCESS_KEY'),
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== 'false',
  });
}

let storage: PrivateStorage | undefined;

export function getPrivateStorage(): PrivateStorage {
  if (storage) return storage;

  const driver = process.env.PRIVATE_STORAGE_DRIVER?.trim() || 'local';

  if (driver === 's3') {
    storage = createS3PrivateStorage();
    return storage;
  }

  if (driver !== 'local') {
    throw new Error(`Unsupported PRIVATE_STORAGE_DRIVER: ${driver}`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_PRIVATE_STORAGE !== '1') {
    throw new Error('Production requires PRIVATE_STORAGE_DRIVER=s3');
  }

  const configuredDirectory = process.env.DOCUMENT_STORAGE_DIR?.trim();
  storage = new LocalPrivateStorage(configuredDirectory || '.data/documents');
  return storage;
}
