import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const targetRoot = resolve(required('OBJECT_BACKUP_DIR'));
const endpoint = required('OBJECT_STORAGE_ENDPOINT');
const bucket = required('OBJECT_STORAGE_BUCKET');
const region = process.env.OBJECT_STORAGE_REGION?.trim() || 'auto';
const accessKeyId = required('OBJECT_STORAGE_ACCESS_KEY_ID');
const secretAccessKey = required('OBJECT_STORAGE_SECRET_ACCESS_KEY');
const forcePathStyle = process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== 'false';

if (!endpoint.startsWith('https://')) {
  throw new Error('OBJECT_STORAGE_ENDPOINT must use HTTPS for external backup');
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle,
  credentials: { accessKeyId, secretAccessKey },
});

await mkdir(targetRoot, { recursive: true, mode: 0o700 });

const objects = [];
let continuationToken;

do {
  const page = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }),
  );

  for (const entry of page.Contents ?? []) {
    const key = entry.Key;
    if (!key) continue;

    // The current Mágina private storage contract generates UUID/UUID-like
    // keys. Refuse unexpected paths rather than allowing a compromised bucket
    // key to escape the backup root through path traversal.
    if (!/^[0-9a-f-]+\/[0-9a-f-]+$/i.test(key)) {
      throw new Error(`Unexpected private object key in bucket: ${key}`);
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    if (!response.Body) throw new Error(`Object ${key} returned an empty body`);

    const bytes = Buffer.from(await response.Body.transformToByteArray());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const target = join(targetRoot, key);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });

    objects.push({
      key,
      size: bytes.byteLength,
      sha256,
    });
  }

  continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (continuationToken);

objects.sort((a, b) => a.key.localeCompare(b.key));
const manifest = {
  version: 1,
  bucket,
  exportedAt: new Date().toISOString(),
  objectCount: objects.length,
  objects,
};

await writeFile(
  join(targetRoot, 'objects-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: 'wx', mode: 0o600 },
);

console.log(`[object-backup] PASS exported ${objects.length} private objects`);
