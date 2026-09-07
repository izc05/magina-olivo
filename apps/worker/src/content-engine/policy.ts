import type {
  CandidateMedia,
  CandidateValidationResult,
  ContentCandidate,
  ContentSourceDefinition,
  MediaRightsStatus,
  PublicationDecision,
  PublicationPolicyContext,
} from './types.js';

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
]);

const SAFE_MEDIA_RIGHTS: ReadonlySet<MediaRightsStatus> = new Set([
  'owned',
  'licensed',
  'official_reusable',
]);

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

export function canonicalizeContentUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.hash = '';

    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();

    return url.toString();
  } catch {
    return null;
  }
}

export function validateCandidate(candidate: ContentCandidate): CandidateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!candidate.title.trim()) {
    errors.push('title_required');
  }

  if (!candidate.sourceName.trim()) {
    errors.push('source_name_required');
  }

  if (!canonicalizeContentUrl(candidate.sourceUrl)) {
    errors.push('source_url_invalid');
  }

  if (candidate.canonicalUrl && !canonicalizeContentUrl(candidate.canonicalUrl)) {
    errors.push('canonical_url_invalid');
  }

  if (
    candidate.relevanceScore !== undefined &&
    (candidate.relevanceScore < 0 || candidate.relevanceScore > 100)
  ) {
    errors.push('relevance_score_out_of_range');
  }

  if (candidate.type === 'event' && !candidate.startsAt) {
    warnings.push('event_start_missing');
  }

  if (!candidate.publishedAt) {
    warnings.push('published_at_missing');
  }

  if (!candidate.summary?.trim()) {
    warnings.push('summary_missing');
  }

  if (!candidate.sourceId) {
    warnings.push('source_not_registered');
  }

  for (const media of candidate.media ?? []) {
    if (!canonicalizeContentUrl(media.url)) {
      warnings.push('media_url_invalid');
    }

    if (!SAFE_MEDIA_RIGHTS.has(media.rightsStatus)) {
      warnings.push(`media_rights_${media.rightsStatus}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...new Set(warnings)],
  };
}

export function buildCandidateFingerprint(candidate: ContentCandidate): string {
  const canonicalUrl = canonicalizeContentUrl(candidate.canonicalUrl ?? candidate.sourceUrl) ?? '';
  const date = candidate.publishedAt?.slice(0, 10) ?? candidate.startsAt?.slice(0, 10) ?? '';
  const source = candidate.sourceId ?? normalizeText(candidate.sourceName);

  return [
    candidate.type,
    source,
    canonicalUrl,
    date,
    normalizeText(candidate.title),
  ].join('|');
}

export function mediaCanBeCopiedLocally(
  media: CandidateMedia,
  source: ContentSourceDefinition,
): boolean {
  if (!source.mediaPolicy?.allowLocalCopy) {
    return false;
  }

  if (!SAFE_MEDIA_RIGHTS.has(media.rightsStatus)) {
    return false;
  }

  return source.mediaPolicy.allowedRightsStatuses.includes(media.rightsStatus);
}

export function evaluatePublicationPolicy(
  context: PublicationPolicyContext,
): PublicationDecision {
  const reasons: string[] = [];
  const { candidate, source, validation } = context;

  if (!validation.valid) {
    return {
      action: 'reject',
      reasons: validation.errors,
    };
  }

  if (!source.enabled) {
    return {
      action: 'reject',
      reasons: ['source_disabled'],
    };
  }

  if (source.allowedTypes && !source.allowedTypes.includes(candidate.type)) {
    return {
      action: 'reject',
      reasons: ['content_type_not_allowed_for_source'],
    };
  }

  if (!context.globalAutopublishEnabled) {
    reasons.push('global_autopublish_disabled');
  }

  if (!source.allowAutopublish) {
    reasons.push('source_autopublish_disabled');
  }

  if (source.requiresHumanReview) {
    reasons.push('source_requires_human_review');
  }

  if (source.trustLevel === 'unknown' || source.trustLevel === 'reviewed') {
    reasons.push('source_trust_requires_review');
  }

  if (candidate.relevanceScore === undefined) {
    reasons.push('relevance_score_missing');
  } else if (candidate.relevanceScore < context.minimumAutopublishScore) {
    reasons.push('relevance_score_below_threshold');
  }

  if (validation.warnings.length > 0) {
    reasons.push(...validation.warnings.map((warning) => `validation_warning:${warning}`));
  }

  if (reasons.length > 0) {
    return {
      action: 'pending_review',
      reasons: [...new Set(reasons)],
    };
  }

  return {
    action: 'approve',
    reasons: ['autopublish_policy_passed'],
  };
}