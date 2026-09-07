export const contentTypes = [
  'news',
  'event',
  'grant',
  'agri_alert',
  'market_update',
  'municipal_notice',
  'cooperative_update',
] as const;

export type ContentType = (typeof contentTypes)[number];

export const candidateOrigins = [
  'manual',
  'import_url',
  'rss',
  'api',
  'chatgpt',
  'codex',
  'worker',
] as const;

export type CandidateOrigin = (typeof candidateOrigins)[number];

export type SourceTrustLevel = 'official' | 'trusted' | 'reviewed' | 'unknown';

export type ContentStatus =
  | 'discovered'
  | 'imported'
  | 'pending_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived'
  | 'discarded'
  | 'rejected_by_rule'
  | 'failed';

export type MediaRightsStatus =
  | 'owned'
  | 'licensed'
  | 'official_reusable'
  | 'external_reference_only'
  | 'unknown'
  | 'blocked';

export interface CandidateMedia {
  url: string;
  sourceUrl?: string;
  provider?: string;
  author?: string;
  license?: string;
  rightsStatus: MediaRightsStatus;
  alt?: string;
}

export interface ContentCandidate {
  origin: CandidateOrigin;
  type: ContentType;
  sourceId?: string;
  sourceName: string;
  sourceUrl: string;
  canonicalUrl?: string;
  externalId?: string;
  title: string;
  summary?: string;
  bodyText?: string;
  publishedAt?: string;
  discoveredAt: string;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  municipalities?: string[];
  category?: string;
  relevanceScore?: number;
  media?: CandidateMedia[];
  fingerprint?: string;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CandidateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ContentSourceDefinition {
  id: string;
  name: string;
  baseUrl: string;
  adapterType: 'rss' | 'api' | 'html' | 'manual';
  trustLevel: SourceTrustLevel;
  enabled: boolean;
  allowImport: boolean;
  allowAutomaticDiscovery: boolean;
  allowAutopublish: boolean;
  requiresHumanReview: boolean;
  allowedTypes?: ContentType[];
  municipalities?: string[];
  pollingIntervalMinutes?: number;
  mediaPolicy?: {
    allowRemoteReference: boolean;
    allowLocalCopy: boolean;
    allowedRightsStatuses: MediaRightsStatus[];
  };
}

export interface PublicationPolicyContext {
  globalAutopublishEnabled: boolean;
  minimumAutopublishScore: number;
  source: ContentSourceDefinition;
  candidate: ContentCandidate;
  validation: CandidateValidationResult;
}

export interface PublicationDecision {
  action: 'reject' | 'pending_review' | 'approve';
  reasons: string[];
}

export interface ContentRunSummary {
  runId: string;
  origin: CandidateOrigin;
  startedAt: string;
  finishedAt?: string;
  discoveredCount: number;
  duplicateCount: number;
  rejectedCount: number;
  pendingReviewCount: number;
  approvedCount: number;
  publishedCount: number;
  errorCount: number;
}

export interface ImportUrlRequest {
  url: string;
  requestedType?: ContentType;
}

export interface ImportUrlResult {
  candidate: ContentCandidate;
  validation: CandidateValidationResult;
}

export interface CandidateBatchRequest {
  runId: string;
  origin: Exclude<CandidateOrigin, 'manual'>;
  candidates: ContentCandidate[];
}

export interface CandidateBatchResult {
  accepted: number;
  duplicates: number;
  rejected: number;
  pendingReview: number;
  approved: number;
  errors: Array<{
    index: number;
    code: string;
    message: string;
  }>;
}