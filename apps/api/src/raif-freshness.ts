export type RaifFreshnessStatus = 'current' | 'review' | 'stale' | 'unknown';

export type RaifFreshness = {
  status: RaifFreshnessStatus;
  ageDays: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function classifyRaifFreshness(
  sourceUpdatedAt: Date | string | null | undefined,
  now = new Date(),
): RaifFreshness {
  if (!sourceUpdatedAt) return { status: 'unknown', ageDays: null };

  const sourceDate = sourceUpdatedAt instanceof Date ? sourceUpdatedAt : new Date(sourceUpdatedAt);
  const sourceTime = sourceDate.getTime();
  const nowTime = now.getTime();
  if (!Number.isFinite(sourceTime) || !Number.isFinite(nowTime)) {
    return { status: 'unknown', ageDays: null };
  }

  const ageDays = Math.floor((nowTime - sourceTime) / DAY_MS);
  if (ageDays < -1) return { status: 'unknown', ageDays: null };
  if (ageDays <= 10) return { status: 'current', ageDays: Math.max(0, ageDays) };
  if (ageDays <= 17) return { status: 'review', ageDays };
  return { status: 'stale', ageDays };
}
