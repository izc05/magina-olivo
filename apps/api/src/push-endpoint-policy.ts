import { isIP } from 'node:net';

const DEFAULT_ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
];

function allowedPushHosts(): string[] {
  const configured = process.env.WEB_PUSH_ALLOWED_HOST_SUFFIXES
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_ALLOWED_PUSH_HOSTS;
}

export function isAllowedPushEndpoint(value: string): boolean {
  if (value.length < 16 || value.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return false;
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname) !== 0 || hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
  return allowedPushHosts().some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}
