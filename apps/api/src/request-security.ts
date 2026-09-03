import type { FastifyInstance } from 'fastify';
import { trustedOrigins } from './auth.ts';
import { apiError } from './http-errors.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const trustedOriginSet = new Set(trustedOrigins);

function isProtectedApiPath(url: string): boolean {
  return url === '/api/v1' || url.startsWith('/api/v1/');
}

function isPublicReadApiPath(url: string): boolean {
  return url === '/api/v1/public' || url.startsWith('/api/v1/public/');
}

export function registerRequestSecurity(app: FastifyInstance): void {
  app.addHook('onRequest', async (request, reply) => {
    if (!isProtectedApiPath(request.url) || SAFE_METHODS.has(request.method)) {
      return;
    }

    const origin = request.headers.origin;
    const fetchSiteHeader = request.headers['sec-fetch-site'];
    const fetchSite = Array.isArray(fetchSiteHeader) ? fetchSiteHeader[0] : fetchSiteHeader;

    if (fetchSite === 'cross-site') {
      return reply
        .code(403)
        .send(apiError(request, 'CROSS_SITE_REQUEST_BLOCKED', 'Cross-site mutation rejected'));
    }

    if (origin && !trustedOriginSet.has(origin)) {
      return reply
        .code(403)
        .send(apiError(request, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted'));
    }

    // Modern browsers normally send Origin for unsafe fetch/form requests. If Fetch Metadata
    // identifies a browser request as same-site but it omits Origin, fail closed rather than
    // allowing a sibling-site CSRF. Non-browser clients commonly send neither header and remain
    // usable for controlled CLI/server-to-server operations.
    if (!origin && fetchSite === 'same-site') {
      return reply
        .code(403)
        .send(apiError(request, 'ORIGIN_REQUIRED', 'Browser mutation requires an Origin header'));
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/health/')) {
      if (request.method === 'GET' && isPublicReadApiPath(request.url)) {
        reply.header('cache-control', 'public, max-age=300, stale-while-revalidate=86400');
      } else {
        reply.header('cache-control', 'no-store');
      }
      reply.header('x-content-type-options', 'nosniff');
      reply.header('x-frame-options', 'DENY');
      reply.header('referrer-policy', 'no-referrer');
      reply.header('cross-origin-resource-policy', 'same-origin');
      reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }

    return payload;
  });
}
