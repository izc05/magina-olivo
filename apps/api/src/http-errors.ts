import type { FastifyRequest } from 'fastify';

export function apiError(
  request: FastifyRequest,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return {
    error: {
      code,
      message,
      request_id: request.id,
      ...(details ? { details } : {}),
    },
  };
}
