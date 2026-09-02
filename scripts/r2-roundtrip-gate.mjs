import { createHash, randomBytes, randomUUID } from 'node:crypto';

function fail(message) {
  console.error(`[r2-roundtrip-gate] ERROR: ${message}`);
  process.exit(1);
}

if (process.env.PRIVATE_STORAGE_DRIVER !== 's3') {
  fail('PRIVATE_STORAGE_DRIVER=s3 is required');
}

const endpoint = process.env.OBJECT_STORAGE_ENDPOINT?.trim();
if (!endpoint?.startsWith('https://') || endpoint.includes('example.invalid')) {
  fail('OBJECT_STORAGE_ENDPOINT must be a real HTTPS S3/R2 endpoint');
}

const { getPrivateStorage } = await import('../apps/api/src/private-storage.ts');
const storage = getPrivateStorage();
const objectKey = `${randomUUID()}/${randomUUID()}`;
const original = randomBytes(512);
const originalHash = createHash('sha256').update(original).digest('hex');

try {
  await storage.put(objectKey, original);
  const restored = await storage.get(objectKey);
  const restoredHash = createHash('sha256').update(restored).digest('hex');

  if (originalHash !== restoredHash || !original.equals(restored)) {
    fail('downloaded object does not match uploaded bytes');
  }

  await storage.delete(objectKey);

  let deletedObjectStillReadable = false;
  try {
    await storage.get(objectKey);
    deletedObjectStillReadable = true;
  } catch {
    // Expected after deletion. R2 is strongly consistent, so a successful GET
    // here would indicate either a wrong bucket/key or a broken delete path.
  }

  if (deletedObjectStillReadable) {
    fail('deleted object is still readable');
  }

  console.log('[r2-roundtrip-gate] PASS PUT/GET/SHA-256/DELETE');
} finally {
  // Best-effort cleanup if a previous assertion failed after PUT.
  try {
    await storage.delete(objectKey);
  } catch {
    // Do not hide the primary gate result with cleanup noise.
  }
}
