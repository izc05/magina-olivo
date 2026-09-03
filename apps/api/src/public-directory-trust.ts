export type DirectoryVerificationStatus = 'unverified' | 'verified' | 'stale';

const DEFAULT_MAX_VERIFIED_AGE_DAYS = 183;
const MAX_FUTURE_SKEW_DAYS = 1;

export function normalizePublicHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function effectiveDirectoryVerificationStatus(
  storedStatus: DirectoryVerificationStatus,
  sourceCheckedAt: Date | string | null | undefined,
  nowMs = Date.now(),
  maxVerifiedAgeDays = DEFAULT_MAX_VERIFIED_AGE_DAYS,
): DirectoryVerificationStatus {
  if (storedStatus !== 'verified') return storedStatus;
  if (!sourceCheckedAt || !Number.isFinite(nowMs)) return 'unverified';

  const checkedMs = sourceCheckedAt instanceof Date
    ? sourceCheckedAt.getTime()
    : Date.parse(sourceCheckedAt);
  if (!Number.isFinite(checkedMs)) return 'unverified';

  const ageDays = (nowMs - checkedMs) / 86_400_000;
  if (ageDays < -MAX_FUTURE_SKEW_DAYS) return 'unverified';
  if (ageDays > maxVerifiedAgeDays) return 'stale';
  return 'verified';
}
