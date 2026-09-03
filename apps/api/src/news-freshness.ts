export type NewsFreshnessStatus = 'fresh' | 'aging' | 'archive' | 'unknown';

export type NewsFreshness = {
  status: NewsFreshnessStatus;
  ageDays: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function classifyNewsFreshness(
  publishedAt: Date | string | null | undefined,
  now = new Date(),
): NewsFreshness {
  if (!publishedAt) return { status: 'unknown', ageDays: null };

  const publishedDate = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  const publishedTime = publishedDate.getTime();
  const nowTime = now.getTime();
  if (!Number.isFinite(publishedTime) || !Number.isFinite(nowTime)) {
    return { status: 'unknown', ageDays: null };
  }

  const ageDays = Math.floor((nowTime - publishedTime) / DAY_MS);
  if (ageDays < -1) return { status: 'unknown', ageDays: null };
  if (ageDays <= 14) return { status: 'fresh', ageDays: Math.max(0, ageDays) };
  if (ageDays <= 45) return { status: 'aging', ageDays };
  return { status: 'archive', ageDays };
}
