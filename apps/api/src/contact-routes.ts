import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

const CONTACT_CATEGORIES = new Set([
  'Problema técnico',
  'Sugerencia',
  'Información incorrecta',
  'Cooperativas',
  'Noticias',
  'Mercado del aceite',
  'Privacidad y datos',
  'Otro',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 15 * 60_000;
const RATE_MAX = 5;

type ContactBody = {
  category?: string;
  email?: string;
  message?: string;
  website?: string;
};

type RateState = { count: number; resetAt: number };
const contactRate = new Map<string, RateState>();

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function rateKey(request: FastifyRequest): string {
  return request.ip || 'unknown';
}

function consumeRateLimit(request: FastifyRequest): boolean {
  const key = rateKey(request);
  const now = Date.now();
  const current = contactRate.get(key);

  if (!current || current.resetAt <= now) {
    contactRate.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_MAX) return false;
  current.count += 1;
  return true;
}

function pruneRateLimit(): void {
  if (contactRate.size < 500) return;
  const now = Date.now();
  for (const [key, value] of contactRate) {
    if (value.resetAt <= now) contactRate.delete(key);
  }
}

export function registerContactRoutes(app: FastifyInstance): void {
  app.post<{ Body: ContactBody }>('/api/v1/public/contact', async (request, reply) => {
    pruneRateLimit();

    const website = trimText(request.body?.website);
    if (website) {
      // Honeypot: acknowledge without persisting so automated senders do not learn
      // which validation caught them.
      return reply.code(202).send({ accepted: true });
    }

    if (!consumeRateLimit(request)) {
      return reply
        .code(429)
        .send(apiError(request, 'CONTACT_RATE_LIMITED', 'Has enviado varias consultas seguidas. Inténtalo de nuevo más tarde.'));
    }

    const category = trimText(request.body?.category);
    const email = trimText(request.body?.email).toLocaleLowerCase('es');
    const message = trimText(request.body?.message);

    if (!CONTACT_CATEGORIES.has(category)) {
      return reply.code(400).send(apiError(request, 'CONTACT_CATEGORY_INVALID', 'Selecciona un motivo de contacto válido.'));
    }

    if (email.length < 5 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return reply.code(400).send(apiError(request, 'CONTACT_EMAIL_INVALID', 'Indica un correo válido para poder responderte.'));
    }

    if (message.length < 10 || message.length > 4000) {
      return reply.code(400).send(apiError(request, 'CONTACT_MESSAGE_INVALID', 'El mensaje debe tener entre 10 y 4000 caracteres.'));
    }

    const session = await getAuthenticatedSession(request);
    const id = randomUUID();

    await getPool().query(
      `
        insert into contact_messages (
          id, user_id, category, reply_email, message, status
        )
        values ($1, $2, $3, $4, $5, 'new')
      `,
      [id, session?.user.id ?? null, category, email, message],
    );

    return reply.code(202).send({ accepted: true });
  });
}
