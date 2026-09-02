import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type CreateHoldingBody = {
  name: string;
  municipality?: string;
  province?: string;
};

type HoldingRow = {
  id: string;
  name: string;
  municipality: string | null;
  province: string | null;
  role: 'owner' | 'admin' | 'collaborator' | 'viewer';
  created_at: Date;
  updated_at: Date;
};

export function registerHoldingRoutes(app: FastifyInstance): void {
  app.get('/api/v1/holdings', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply
        .code(401)
        .send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const db = getPool();
    const result = await db.query<HoldingRow>(
      `
        select
          h.id,
          h.name,
          h.municipality,
          h.province,
          hm.role,
          h.created_at,
          h.updated_at
        from holdings h
        join holding_members hm on hm.holding_id = h.id
        where hm.user_id = $1
          and hm.status = 'active'
          and h.active = true
        order by h.created_at asc, h.id asc
      `,
      [session.user.id],
    );

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        municipality: row.municipality,
        province: row.province,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  });

  app.post<{ Body: CreateHoldingBody }>(
    '/api/v1/holdings',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            municipality: { type: 'string', minLength: 1, maxLength: 120 },
            province: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply
          .code(401)
          .send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const name = request.body.name.trim();
      if (!name) {
        return reply
          .code(400)
          .send(apiError(request, 'INVALID_HOLDING_NAME', 'Holding name is required'));
      }

      const municipality = request.body.municipality?.trim() || null;
      const province = request.body.province?.trim() || null;
      const id = randomUUID();
      const db = getPool();
      const client = await db.connect();

      try {
        await client.query('begin');
        const inserted = await client.query<{
          id: string;
          name: string;
          municipality: string | null;
          province: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `
            insert into holdings (id, name, municipality, province)
            values ($1, $2, $3, $4)
            returning id, name, municipality, province, created_at, updated_at
          `,
          [id, name, municipality, province],
        );

        await client.query(
          `
            insert into holding_members (holding_id, user_id, role, status)
            values ($1, $2, 'owner', 'active')
          `,
          [id, session.user.id],
        );
        await client.query('commit');

        const row = inserted.rows[0];
        if (!row) throw new Error('Holding insert returned no row');

        return reply.code(201).send({
          id: row.id,
          name: row.name,
          municipality: row.municipality,
          province: row.province,
          role: 'owner',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
