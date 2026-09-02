import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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

let storage: PrivateStorage | undefined;

export function getPrivateStorage(): PrivateStorage {
  if (storage) return storage;

  const configuredDirectory = process.env.DOCUMENT_STORAGE_DIR?.trim();
  if (process.env.NODE_ENV === 'production' && !configuredDirectory) {
    throw new Error('DOCUMENT_STORAGE_DIR or a production object-storage adapter is required');
  }

  storage = new LocalPrivateStorage(configuredDirectory || '.data/documents');
  return storage;
}
