import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const sourceRoot = resolve(required('OBJECT_RESTORE_DIR'));
const endpoint = required('OBJECT_STORAGE_ENDPOINT');
const targetBucket = required('OBJECT_STORAGE_BUCKET');
const region = process.env.OBJECT_STORAGE_REGION?.trim() || 'auto';
const accessKeyId = required('OBJECT_STORAGE_ACCESS_KEY_ID');
const secretAccessKey = required('OBJECT_STORAGE_SECRET_ACCESS_KEY');
const forcePathStyle = process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== 'false';

if (!endpoint.startsWith('https://')) {
  throw new Error('OBJECT_STORAGE_ENDPOINT must use HTTPS for external restore');
}

if (process.env.OBJECT_RESTORE_CONFIRM_EMPTY !== '1') {
  throw new Error('Set OBJECT_RESTORE_CONFIRM_EMPTY=1 only after selecting an empty restore target bucket');
}

const manifestPath = join(sourceRoot, 'objects-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== 1 || !Array.isArray(manifest.objects)) {
  throw new Error('Unsupported or invalid object backup manifest');
}
if (!Number.isInteger(manifest.objectCount) || manifest.objectCount !== manifest.objects.length) {
  throw new Error('Object backup manifest count is inconsistent');
}
if (manifest.bucket === targetBucket && process.env.OBJECT_RESTORE_ALLOW_SOURCE_BUCKET !== '1') {
  throw new Error(
    'Refusing to restore into the source bucket name by default; use a separate recovery bucket for drills',
  );
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle,
  credentials: { accessKeyId, secretAccessKey },
});

const existing = await client.send(
  new ListObjectsV2Command({
    Bucket: targetBucket,
    MaxKeys: 1,
  }),
);
if ((existing.KeyCount ?? existing.Contents?.length ?? 0) !== 0) {
  throw new Error(`Restore target bucket ${targetBucket} is not empty`);
}

const validated = [];
for (const entry of manifest.objects) {
  const key = entry?.key;
  if (typeof key !== 'string' || !/^[0-9a-f-]+\/[0-9a-f-]+$/i.test(key)) {
    throw new Error(`Invalid private object key in manifest: ${String(key)}`);
  }
  if (!Number.isInteger(entry.size) || entry.size < 0) {
    throw new Error(`Invalid size in manifest for ${key}`);
  }
  if (typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(entry.sha256)) {
    throw new Error(`Invalid SHA-256 in manifest for ${key}`);
  }

  const path = join(sourceRoot, key);
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size !== entry.size) {
    throw new Error(`Backup file size mismatch for ${key}`);
  }
  const bytes = await readFile(path);
  const actualHash = sha256(bytes);
  if (actualHash !== entry.sha256.toLowerCase()) {
    throw new Error(`Backup file checksum mismatch for ${key}`);
  }
  validated.push({ key, bytes, sha256: actualHash });
}

const uploaded = [];
try {
  for (const object of validated) {
    await client.send(
      new PutObjectCommand({
        Bucket: targetBucket,
        Key: object.key,
        Body: object.bytes,
        ContentType: 'application/octet-stream',
      }),
    );
    uploaded.push(object.key);

    const response = await client.send(
      new GetObjectCommand({
        Bucket: targetBucket,
        Key: object.key,
      }),
    );
    if (!response.Body) throw new Error(`Restored object ${object.key} returned an empty body`);
    const restored = Buffer.from(await response.Body.transformToByteArray());
    if (sha256(restored) !== object.sha256) {
      throw new Error(`Restored object checksum mismatch for ${object.key}`);
    }
  }

  const listed = [];
  let continuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: targetBucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const entry of page.Contents ?? []) {
      if (entry.Key) listed.push(entry.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  listed.sort();
  const expected = validated.map((object) => object.key).sort();
  if (JSON.stringify(listed) !== JSON.stringify(expected)) {
    throw new Error('Restore target bucket contents differ from backup manifest');
  }

  console.log(`[object-restore] PASS restored and verified ${uploaded.length} private objects`);
} catch (error) {
  if (process.env.OBJECT_RESTORE_KEEP_PARTIAL !== '1') {
    for (const key of uploaded.reverse()) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: key }));
      } catch {
        // Best-effort cleanup. The original restore error remains authoritative.
      }
    }
  }
  throw error;
}
