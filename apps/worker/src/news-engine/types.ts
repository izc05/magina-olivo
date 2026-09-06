export const editorialCategories = [
  'olivar',
  'meteorologia',
  'plagas_raif',
  'ayudas_pac',
  'eventos',
  'pueblos',
  'cooperativas',
  'aceite_mercado',
  'medio_ambiente',
  'agricultura',
  'avisos',
  'actualidad',
] as const;

export type EditorialCategory = (typeof editorialCategories)[number];

export type EditorialContentType = 'news' | 'event' | 'alert' | 'update';

export type EditorialStatus =
  | 'discovered'
  | 'rejected_by_rule'
  | 'pending_ai'
  | 'pending_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'discarded'
  | 'failed'
  | 'updated';

export interface DiscoveredItem {
  sourceId: string;
  sourceUrl: string;
  canonicalUrl: string;
  externalId?: string;
  title: string;
  summary?: string;
  bodyText?: string;
  publishedAt?: string;
  discoveredAt: string;
  rawHash: string;
}

export interface EditorialAiInput {
  sourceName: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  bodyText?: string;
  publishedAt?: string;
}

export interface EditorialAiOutput {
  title: string;
  summary: string;
  body?: string;
  category: EditorialCategory;
  municipalities: string[];
  startsAt?: string;
  endsAt?: string;
  relevanceScore: number;
  pushTitle?: string;
  pushBody?: string;
  needsHumanReview: boolean;
  reviewReason?: string;
}

export interface EditorialAiProvider {
  enrich(input: EditorialAiInput): Promise<EditorialAiOutput>;
}

export interface ContentSourceDefinition {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  aiEnabled: boolean;
  autopublishEnabled: boolean;
  pollingIntervalMinutes: number;
}
