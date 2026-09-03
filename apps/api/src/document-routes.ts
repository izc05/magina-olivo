import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import {
  normalizeDocumentFilename,
  normalizeDocumentMimeType,
} from './document-validation.ts';
import { apiError } from './http-errors.ts';
import { getPrivateStorage } from './private-storage.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type DocumentParams = { documentId: string };
type DocumentListQuery = { campaignId?: string };
type UploadQuery = {
  filename: string;
  mimeType: string;
  documentType: 'ticket' | 'delivery_note' | 'yield_report' | 'invoice' | 'settlement' | 'photo' | 'other';
  deliveryId?: string;
};

type DocumentAccessRow = {
  id: string;
  holding_id: string;
  object_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: string;
  sha256: string | null;
  document_type: string;
  created_at: Date;
  role: 'owner' | 'admin' | 'collaborator' | 'viewer';
};

type DocumentListRow = {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: string;
  sha256: string | null;
  document_type: string;
  created_at: Date;
  delivery_id: string | null;
  delivered_at: Date | null;
  delivery_kilograms: string | null;
  delivery_destination: string | null;
};

async function getDocumentAccess(userId: string, documentId: string): Promise<DocumentAccessRow | null> {
  const result = await getPool().query<DocumentAccessRow>(
    `
      select
        d.id, d.holding_id, d.object_key, d.original_filename, d.mime_type,
        d.size_bytes, d.sha256, d.document_type, d.created_at, hm.role
      from documents d
      join holdings h on h.id = d.holding_id
      join holding_members hm on hm.holding_id = d.holding_id
      where d.id = $1
        and hm.user_id = $2
        and hm.status = 'active'
        and h.active = true
      limit 1
    `,
    [documentId, userId],
  );
  return result.rows[0] ?? null;
}

export function registerDocumentRoutes(app: FastifyInstance): void {
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: 10 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );

  app.get<{ Params: HoldingParams; Querystring: DocumentListQuery }>(
    '/api/v1/holdings/:holdingId/documents',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const membership = await getPool().query<{ role: string }>(
        `
          select hm.role
          from holding_members hm
          join holdings h on h.id = hm.holding_id
          where hm.holding_id = $1
            and hm.user_id = $2
            and hm.status = 'active'
            and h.active = true
          limit 1
        `,
        [request.params.holdingId, session.user.id],
      );
      if (!membership.rows[0]) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }

      if (request.query.campaignId) {
        const campaign = await getPool().query<{ id: string }>(
          `select id from campaigns where id = $1 and holding_id = $2 limit 1`,
          [request.query.campaignId, request.params.holdingId],
        );
        if (!campaign.rows[0]) {
          return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
        }
      }

      const result = await getPool().query<DocumentListRow>(
        `
          select
            d.id,
            d.original_filename,
            d.mime_type,
            d.size_bytes,
            d.sha256,
            d.document_type,
            d.created_at,
            dl.entity_id as delivery_id,
            dy.delivered_at,
            dy.kilograms::text as delivery_kilograms,
            dy.custom_destination as delivery_destination
          from documents d
          left join document_links dl
            on dl.document_id = d.id
           and dl.holding_id = d.holding_id
           and dl.entity_type = 'delivery'
          left join deliveries dy
            on dy.id = dl.entity_id
           and dy.holding_id = d.holding_id
          where d.holding_id = $1
            and ($2::uuid is null or dy.campaign_id = $2::uuid)
          order by d.created_at desc
          limit 100
        `,
        [request.params.holdingId, request.query.campaignId ?? null],
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          filename: row.original_filename,
          mimeType: row.mime_type,
          sizeBytes: Number(row.size_bytes),
          sha256: row.sha256,
          documentType: row.document_type,
          deliveryId: row.delivery_id,
          delivery: row.delivery_id ? {
            id: row.delivery_id,
            deliveredAt: row.delivered_at,
            kilograms: row.delivery_kilograms,
            destination: row.delivery_destination,
          } : null,
          createdAt: row.created_at,
        })),
      };
    },
  );

  app.post<{ Params: HoldingParams; Querystring: UploadQuery; Body: Buffer }>(
    '/api/v1/holdings/:holdingId/documents',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['filename', 'mimeType', 'documentType'],
          properties: {
            filename: { type: 'string', minLength: 1, maxLength: 240 },
            mimeType: { type: 'string', minLength: 1, maxLength: 160 },
            documentType: {
              type: 'string',
              enum: ['ticket', 'delivery_note', 'yield_report', 'invoice', 'settlement', 'photo', 'other'],
            },
            deliveryId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const membership = await getPool().query<{ role: string }>(
        `
          select hm.role
          from holding_members hm
          join holdings h on h.id = hm.holding_id
          where hm.holding_id = $1
            and hm.user_id = $2
            and hm.status = 'active'
            and h.active = true
          limit 1
        `,
        [request.params.holdingId, session.user.id],
      );
      const role = membership.rows[0]?.role;
      if (!role) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }
      if (role === 'viewer') {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const content = request.body;
      if (!Buffer.isBuffer(content) || content.byteLength === 0) {
        return reply.code(400).send(apiError(request, 'EMPTY_DOCUMENT', 'Document content is required'));
      }

      const filename = normalizeDocumentFilename(request.query.filename);
      if (!filename) {
        return reply.code(400).send(apiError(request, 'INVALID_DOCUMENT_FILENAME', 'Document filename is invalid'));
      }

      const mimeType = normalizeDocumentMimeType(request.query.mimeType);
      if (!mimeType) {
        return reply
          .code(415)
          .send(apiError(request, 'UNSUPPORTED_DOCUMENT_MIME_TYPE', 'Document format is not supported'));
      }

      if (request.query.deliveryId) {
        const delivery = await getPool().query<{ id: string }>(
          `select id from deliveries where id = $1 and holding_id = $2 and verification_status <> 'archived'`,
          [request.query.deliveryId, request.params.holdingId],
        );
        if (!delivery.rows[0]) {
          return reply.code(400).send(apiError(request, 'INVALID_DELIVERY', 'Delivery is not valid for this holding'));
        }
      }

      const documentId = randomUUID();
      const objectKey = `${request.params.holdingId}/${documentId}`;
      const sha256 = createHash('sha256').update(content).digest('hex');
      const storage = getPrivateStorage();

      // Acquire the database connection before storing the object. If PostgreSQL is unavailable,
      // we fail without creating an orphaned private object in R2/S3.
      const client = await getPool().connect();
      let objectStored = false;
      let transactionStarted = false;
      let committed = false;
      try {
        await storage.put(objectKey, content);
        objectStored = true;

        await client.query('begin');
        transactionStarted = true;
        const inserted = await client.query<{
          id: string;
          original_filename: string;
          mime_type: string;
          size_bytes: string;
          sha256: string;
          document_type: string;
          created_at: Date;
        }>(
          `
            insert into documents (
              id, holding_id, object_key, original_filename, mime_type,
              size_bytes, sha256, document_type, uploaded_by
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            returning id, original_filename, mime_type, size_bytes, sha256, document_type, created_at
          `,
          [
            documentId,
            request.params.holdingId,
            objectKey,
            filename,
            mimeType,
            content.byteLength,
            sha256,
            request.query.documentType,
            session.user.id,
          ],
        );

        if (request.query.deliveryId) {
          await client.query(
            `
              insert into document_links (document_id, holding_id, entity_type, entity_id)
              values ($1, $2, 'delivery', $3)
            `,
            [documentId, request.params.holdingId, request.query.deliveryId],
          );
        }

        await client.query('commit');
        committed = true;
        const row = inserted.rows[0];
        if (!row) throw new Error('Document insert returned no row');

        return reply.code(201).send({
          id: row.id,
          filename: row.original_filename,
          mimeType: row.mime_type,
          sizeBytes: Number(row.size_bytes),
          sha256: row.sha256,
          documentType: row.document_type,
          deliveryId: request.query.deliveryId ?? null,
          delivery: null,
          createdAt: row.created_at,
        });
      } catch (error) {
        if (transactionStarted && !committed) {
          try {
            await client.query('rollback');
          } catch {
            // Preserve the original error; the connection is released below.
          }
        }
        if (objectStored && !committed) {
          try {
            await storage.delete(objectKey);
          } catch {
            // Preserve the original error. Orphan cleanup can reconcile rare storage failures.
          }
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.get<{ Params: DocumentParams }>(
    '/api/v1/documents/:documentId',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const document = await getDocumentAccess(session.user.id, request.params.documentId);
      if (!document) {
        return reply.code(404).send(apiError(request, 'DOCUMENT_NOT_FOUND', 'Document not found'));
      }

      const links = await getPool().query<{ entity_type: string; entity_id: string }>(
        `select entity_type, entity_id from document_links where document_id = $1 and holding_id = $2 order by entity_type, entity_id`,
        [document.id, document.holding_id],
      );

      return {
        id: document.id,
        filename: document.original_filename,
        mimeType: document.mime_type,
        sizeBytes: Number(document.size_bytes),
        sha256: document.sha256,
        documentType: document.document_type,
        createdAt: document.created_at,
        links: links.rows.map((link) => ({ entityType: link.entity_type, entityId: link.entity_id })),
      };
    },
  );

  app.get<{ Params: DocumentParams }>(
    '/api/v1/documents/:documentId/content',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const document = await getDocumentAccess(session.user.id, request.params.documentId);
      if (!document) {
        return reply.code(404).send(apiError(request, 'DOCUMENT_NOT_FOUND', 'Document not found'));
      }

      const content = await getPrivateStorage().get(document.object_key);
      reply.header('content-type', document.mime_type);
      reply.header('content-length', String(content.byteLength));
      reply.header(
        'content-disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(document.original_filename)}`,
      );
      return reply.send(content);
    },
  );
}
