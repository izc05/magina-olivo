export const PUBLIC_GROWTH_ROUTES = [
  '/magina',
  '/magina/directorio',
  '/magina/tiempo',
  '/magina/campo',
  '/magina/noticias',
  '/magina/mercado',
] as const;

type PublicGrowthRoute = (typeof PUBLIC_GROWTH_ROUTES)[number];
export type GrowthConsent = 'unset' | 'denied' | 'granted';
export type GrowthEventName = 'public_page_view' | 'share_started' | 'share_completed';
export type GrowthShareChannel = 'native' | 'whatsapp' | 'copy';
type ReferrerCategory = 'direct' | 'google' | 'bing' | 'social' | 'other';

export type GrowthEventInput = {
  event: GrowthEventName;
  route: string;
  channel?: GrowthShareChannel;
};

const CONSENT_KEY = 'magina:growth-consent:v1';
const pageViewsPendingOrSent = new Set<string>();

export function isGrowthMeasurementEnabled(): boolean {
  return import.meta.env.VITE_PUBLIC_GROWTH_MEASUREMENT === 'enabled';
}

export function isPublicGrowthRoute(route: string): route is PublicGrowthRoute {
  return (PUBLIC_GROWTH_ROUTES as readonly string[]).includes(route);
}

export function readGrowthConsent(): GrowthConsent {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

export function writeGrowthConsent(value: Exclude<GrowthConsent, 'unset'>): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // A blocked storage API must never break public pages.
  }
}

function trimAttribution(value: string | null, maxLength = 80): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().slice(0, maxLength).replace(/[^A-Za-z0-9._-]/g, '');
  return cleaned || undefined;
}

function referrerCategory(): ReferrerCategory {
  if (!document.referrer) return 'direct';

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return 'direct';
    const host = referrer.hostname.toLowerCase();
    if (host === 'google.com' || host.endsWith('.google.com')) return 'google';
    if (host === 'bing.com' || host.endsWith('.bing.com')) return 'bing';
    if (
      host === 'facebook.com' || host.endsWith('.facebook.com') ||
      host === 'instagram.com' || host.endsWith('.instagram.com') ||
      host === 't.co' || host === 'x.com' || host.endsWith('.x.com')
    ) return 'social';
    return 'other';
  } catch {
    return 'other';
  }
}

function currentAttribution() {
  const url = new URL(window.location.href);
  return {
    source: trimAttribution(url.searchParams.get('utm_source')),
    medium: trimAttribution(url.searchParams.get('utm_medium')),
    campaign: trimAttribution(url.searchParams.get('utm_campaign')),
    referrer: referrerCategory(),
  };
}

function growthEndpoint(): URL | null {
  const configured = import.meta.env.VITE_PUBLIC_GROWTH_ENDPOINT?.trim();
  if (!configured) return null;

  try {
    const endpoint = new URL(configured, window.location.origin);
    if (endpoint.origin !== window.location.origin) return null;
    if (endpoint.pathname !== '/api/public/growth/events') return null;
    return endpoint;
  } catch {
    return null;
  }
}

export async function recordGrowthEvent(input: GrowthEventInput): Promise<boolean> {
  if (!isGrowthMeasurementEnabled()) return false;
  if (readGrowthConsent() !== 'granted') return false;
  if (!isPublicGrowthRoute(input.route)) return false;

  const endpoint = growthEndpoint();
  if (!endpoint) return false;

  const payload = {
    event: input.event,
    route: input.route,
    ...(input.channel ? { channel: input.channel } : {}),
    ...currentAttribution(),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function recordPublicPageViewOnce(route: string): Promise<boolean> {
  if (!isPublicGrowthRoute(route)) return false;
  const attribution = currentAttribution();
  const key = `${route}|${attribution.source ?? ''}|${attribution.medium ?? ''}|${attribution.campaign ?? ''}`;
  if (pageViewsPendingOrSent.has(key)) return false;

  pageViewsPendingOrSent.add(key);
  const sent = await recordGrowthEvent({ event: 'public_page_view', route });
  if (!sent) pageViewsPendingOrSent.delete(key);
  return sent;
}
