import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { requirePlatformAdmin } from './admin-access.ts';
import { recordAdminAudit } from './admin-audit.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';

type ImageLicense = 'owned' | 'licensed' | 'official_reusable' | 'external_reference_only' | 'unknown' | 'blocked';
type ImageStatus = 'missing' | 'candidate' | 'approved' | 'blocked';
type VerificationStatus = 'unverified' | 'verified' | 'stale';
type BusinessCategory =
  | 'agricultural_machinery'
  | 'olive_services'
  | 'harvest_services'
  | 'irrigation'
  | 'nursery'
  | 'workshop'
  | 'transport'
  | 'hospitality'
  | 'retail'
  | 'professional_service'
  | 'other';

const imageLicenses: ImageLicense[] = ['owned', 'licensed', 'official_reusable', 'external_reference_only', 'unknown', 'blocked'];
const imageStatuses: ImageStatus[] = ['missing', 'candidate', 'approved', 'blocked'];
const verificationStatuses: VerificationStatus[] = ['unverified', 'verified', 'stale'];
const businessCategories: BusinessCategory[] = [
  'agricultural_machinery', 'olive_services', 'harvest_services', 'irrigation', 'nursery',
  'workshop', 'transport', 'hospitality', 'retail', 'professional_service', 'other',
];

function clean(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

function publicHttps(value: string | null | undefined): string | null {
  const normalized = clean(value);
  if (!normalized) return null;
  return normalizePublicHttpsUrl(normalized);
}

function validateImagePublishing(
  request: Parameters<typeof apiError>[0],
  status: ImageStatus,
  license: ImageLicense,
  imageUrl: string | null,
) {
  if (status !== 'approved') return null;
  if (!imageUrl) return apiError(request, 'APPROVED_IMAGE_MISSING', 'An approved image needs a public HTTPS image URL');
  if (!['owned', 'licensed', 'official_reusable'].includes(license)) {
    return apiError(request, 'IMAGE_RIGHTS_NOT_APPROVED', 'Approved images require owned, licensed or officially reusable rights');
  }
  return null;
}

type MunicipalityBody = {
  heroImageUrl?: string | null;
  heroImageSourceUrl?: string | null;
  heroImageCredit?: string | null;
  heroImageAlt?: string | null;
  heroImageLicense: ImageLicense;
  heroImageStatus: ImageStatus;
  active: boolean;
};

type DestinationBody = {
  description?: string | null;
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
  imageCredit?: string | null;
  imageAlt?: string | null;
  imageLicense: ImageLicense;
  imageStatus: ImageStatus;
  publicVisible: boolean;
  featured: boolean;
};

type BusinessBody = {
  name: string;
  category: BusinessCategory;
  municipality?: string | null;
  province?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  websiteUrl?: string | null;
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
  imageCredit?: string | null;
  imageAlt?: string | null;
  imageLicense: ImageLicense;
  imageStatus: ImageStatus;
  sourceUrl?: string | null;
  sourceCheckedAt?: string | null;
  verificationStatus: VerificationStatus;
  publicVisible: boolean;
  featured: boolean;
};

const imageSchema = {
  imageUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
  imageSourceUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
  imageCredit: { anyOf: [{ type: 'string', maxLength: 300 }, { type: 'null' }] },
  imageAlt: { anyOf: [{ type: 'string', maxLength: 300 }, { type: 'null' }] },
  imageLicense: { type: 'string', enum: imageLicenses },
  imageStatus: { type: 'string', enum: imageStatuses },
} as const;

export function registerAdminTerritoryRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/territory/summary', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query<{
      municipalities: number;
      municipality_images: number;
      destinations: number;
      destination_images: number;
      businesses: number;
      pending_businesses: number;
    }>(`
      select
        (select count(*)::int from public_municipalities where active = true) as municipalities,
        (select count(*)::int from public_municipalities where active = true and hero_image_status = 'approved') as municipality_images,
        (select count(*)::int from cooperatives where public_visible = true) as destinations,
        (select count(*)::int from cooperatives where public_visible = true and image_status = 'approved') as destination_images,
        (select count(*)::int from local_businesses) as businesses,
        (select count(*)::int from local_businesses where verification_status <> 'verified' or public_visible = false) as pending_businesses
    `);
    reply.header('cache-control', 'private, no-store');
    return result.rows[0];
  });

  app.get('/api/v1/admin/territory/municipalities', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query<{
      slug: string; name: string; province: string; aliases: string[]; active: boolean;
      hero_image_url: string | null; hero_image_source_url: string | null; hero_image_credit: string | null;
      hero_image_alt: string | null; hero_image_license: ImageLicense; hero_image_status: ImageStatus;
      hero_image_updated_at: Date | null;
    }>(`
      select slug, name, province, aliases, active, hero_image_url, hero_image_source_url,
        hero_image_credit, hero_image_alt, hero_image_license, hero_image_status, hero_image_updated_at
      from public_municipalities
      order by name
    `);
    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      province: row.province,
      aliases: Array.isArray(row.aliases) ? row.aliases : [],
      active: row.active,
      heroImageUrl: row.hero_image_url,
      heroImageSourceUrl: row.hero_image_source_url,
      heroImageCredit: row.hero_image_credit,
      heroImageAlt: row.hero_image_alt,
      heroImageLicense: row.hero_image_license,
      heroImageStatus: row.hero_image_status,
      heroImageUpdatedAt: row.hero_image_updated_at,
    })) };
  });

  app.patch<{ Params: { slug: string }; Body: MunicipalityBody }>(
    '/api/v1/admin/territory/municipalities/:slug',
    {
      schema: {
        params: { type: 'object', additionalProperties: false, required: ['slug'], properties: { slug: { type: 'string', minLength: 1, maxLength: 160 } } },
        body: {
          type: 'object', additionalProperties: false,
          required: ['heroImageLicense', 'heroImageStatus', 'active'],
          properties: {
            heroImageUrl: imageSchema.imageUrl,
            heroImageSourceUrl: imageSchema.imageSourceUrl,
            heroImageCredit: imageSchema.imageCredit,
            heroImageAlt: imageSchema.imageAlt,
            heroImageLicense: imageSchema.imageLicense,
            heroImageStatus: imageSchema.imageStatus,
            active: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const imageUrl = publicHttps(request.body.heroImageUrl);
      const sourceUrl = publicHttps(request.body.heroImageSourceUrl);
      if (clean(request.body.heroImageUrl) && !imageUrl) return reply.code(400).send(apiError(request, 'INVALID_IMAGE_URL', 'Image URL must be public HTTPS'));
      if (clean(request.body.heroImageSourceUrl) && !sourceUrl) return reply.code(400).send(apiError(request, 'INVALID_IMAGE_SOURCE_URL', 'Image source URL must be public HTTPS'));
      const publishingError = validateImagePublishing(request, request.body.heroImageStatus, request.body.heroImageLicense, imageUrl);
      if (publishingError) return reply.code(400).send(publishingError);

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const result = await client.query<{ name: string }>(`
          update public_municipalities
          set hero_image_url = $2, hero_image_source_url = $3, hero_image_credit = $4,
              hero_image_alt = $5, hero_image_license = $6, hero_image_status = $7,
              hero_image_updated_at = now(), active = $8, updated_at = now()
          where slug = $1
          returning name
        `, [request.params.slug, imageUrl, sourceUrl, clean(request.body.heroImageCredit), clean(request.body.heroImageAlt), request.body.heroImageLicense, request.body.heroImageStatus, request.body.active]);
        if (!result.rows[0]) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'MUNICIPALITY_NOT_FOUND', 'Municipality not found'));
        }
        await recordAdminAudit(client, session, {
          action: 'territory.municipality.update', entityType: 'municipality', entityId: request.params.slug,
          summary: `Imagen y visibilidad actualizadas: ${result.rows[0].name}`,
          metadata: { heroImageStatus: request.body.heroImageStatus, heroImageLicense: request.body.heroImageLicense, active: request.body.active },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.get('/api/v1/admin/territory/destinations', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query(`
      select id, official_name, brand_name, entity_type, municipality, province, description,
        image_url, image_source_url, image_credit, image_alt, image_license, image_status,
        public_visible, featured, verification_status, updated_at
      from cooperatives
      order by municipality nulls last, official_name
    `);
    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id, officialName: row.official_name, brandName: row.brand_name, entityType: row.entity_type,
      municipality: row.municipality, province: row.province, description: row.description,
      imageUrl: row.image_url, imageSourceUrl: row.image_source_url, imageCredit: row.image_credit,
      imageAlt: row.image_alt, imageLicense: row.image_license, imageStatus: row.image_status,
      publicVisible: row.public_visible, featured: row.featured, verificationStatus: row.verification_status,
      updatedAt: row.updated_at,
    })) };
  });

  app.patch<{ Params: { destinationId: string }; Body: DestinationBody }>(
    '/api/v1/admin/territory/destinations/:destinationId',
    {
      schema: {
        params: { type: 'object', additionalProperties: false, required: ['destinationId'], properties: { destinationId: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object', additionalProperties: false,
          required: ['imageLicense', 'imageStatus', 'publicVisible', 'featured'],
          properties: {
            description: { anyOf: [{ type: 'string', maxLength: 3000 }, { type: 'null' }] },
            ...imageSchema,
            publicVisible: { type: 'boolean' }, featured: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const imageUrl = publicHttps(request.body.imageUrl);
      const sourceUrl = publicHttps(request.body.imageSourceUrl);
      if (clean(request.body.imageUrl) && !imageUrl) return reply.code(400).send(apiError(request, 'INVALID_IMAGE_URL', 'Image URL must be public HTTPS'));
      if (clean(request.body.imageSourceUrl) && !sourceUrl) return reply.code(400).send(apiError(request, 'INVALID_IMAGE_SOURCE_URL', 'Image source URL must be public HTTPS'));
      const publishingError = validateImagePublishing(request, request.body.imageStatus, request.body.imageLicense, imageUrl);
      if (publishingError) return reply.code(400).send(publishingError);

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const result = await client.query<{ official_name: string }>(`
          update cooperatives
          set description = $2, image_url = $3, image_source_url = $4, image_credit = $5,
              image_alt = $6, image_license = $7, image_status = $8,
              public_visible = $9, featured = $10, updated_at = now()
          where id = $1
          returning official_name
        `, [request.params.destinationId, clean(request.body.description), imageUrl, sourceUrl, clean(request.body.imageCredit), clean(request.body.imageAlt), request.body.imageLicense, request.body.imageStatus, request.body.publicVisible, request.body.featured]);
        if (!result.rows[0]) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'DIRECTORY_ENTRY_NOT_FOUND', 'Directory entry not found'));
        }
        await recordAdminAudit(client, session, {
          action: 'territory.destination.media.update', entityType: 'directory_entry', entityId: request.params.destinationId,
          summary: `Imagen pública actualizada: ${result.rows[0].official_name}`,
          metadata: { imageStatus: request.body.imageStatus, publicVisible: request.body.publicVisible, featured: request.body.featured },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.get('/api/v1/admin/territory/businesses', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query(`
      select id, name, category, municipality, province, description, address, phone, whatsapp,
        website_url, image_url, image_source_url, image_credit, image_alt, image_license, image_status,
        source_url, source_checked_at, verification_status, public_visible, featured, updated_at
      from local_businesses
      order by featured desc, municipality nulls last, name
      limit 500
    `);
    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id, name: row.name, category: row.category, municipality: row.municipality, province: row.province,
      description: row.description, address: row.address, phone: row.phone, whatsapp: row.whatsapp,
      websiteUrl: row.website_url, imageUrl: row.image_url, imageSourceUrl: row.image_source_url,
      imageCredit: row.image_credit, imageAlt: row.image_alt, imageLicense: row.image_license, imageStatus: row.image_status,
      sourceUrl: row.source_url, sourceCheckedAt: row.source_checked_at, verificationStatus: row.verification_status,
      publicVisible: row.public_visible, featured: row.featured, updatedAt: row.updated_at,
    })) };
  });

  app.post<{ Body: BusinessBody }>(
    '/api/v1/admin/territory/businesses',
    { schema: { body: businessBodySchema() } },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const normalized = normalizeBusinessRequest(request, reply);
      if (!normalized) return;
      const id = randomUUID();
      const client = await getPool().connect();
      try {
        await client.query('begin');
        await client.query(`
          insert into local_businesses (
            id, name, category, municipality, province, description, address, phone, whatsapp, website_url,
            image_url, image_source_url, image_credit, image_alt, image_license, image_status,
            source_url, source_checked_at, verification_status, public_visible, featured
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        `, [id, request.body.name.trim(), request.body.category, clean(request.body.municipality), clean(request.body.province) ?? 'Jaén', clean(request.body.description), clean(request.body.address), clean(request.body.phone), clean(request.body.whatsapp), normalized.websiteUrl, normalized.imageUrl, normalized.imageSourceUrl, clean(request.body.imageCredit), clean(request.body.imageAlt), request.body.imageLicense, request.body.imageStatus, normalized.sourceUrl, request.body.sourceCheckedAt ?? null, request.body.verificationStatus, request.body.publicVisible, request.body.featured]);
        await recordAdminAudit(client, session, {
          action: 'territory.business.create', entityType: 'local_business', entityId: id,
          summary: `Negocio local creado: ${request.body.name.trim()}`,
          metadata: { category: request.body.category, municipality: clean(request.body.municipality), publicVisible: request.body.publicVisible },
        });
        await client.query('commit');
        return reply.code(201).send({ id });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.patch<{ Params: { businessId: string }; Body: BusinessBody }>(
    '/api/v1/admin/territory/businesses/:businessId',
    {
      schema: {
        params: { type: 'object', additionalProperties: false, required: ['businessId'], properties: { businessId: { type: 'string', format: 'uuid' } } },
        body: businessBodySchema(),
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const normalized = normalizeBusinessRequest(request, reply);
      if (!normalized) return;
      const client = await getPool().connect();
      try {
        await client.query('begin');
        const result = await client.query<{ name: string }>(`
          update local_businesses set
            name=$2, category=$3, municipality=$4, province=$5, description=$6, address=$7,
            phone=$8, whatsapp=$9, website_url=$10, image_url=$11, image_source_url=$12,
            image_credit=$13, image_alt=$14, image_license=$15, image_status=$16,
            source_url=$17, source_checked_at=$18, verification_status=$19,
            public_visible=$20, featured=$21, updated_at=now()
          where id=$1 returning name
        `, [request.params.businessId, request.body.name.trim(), request.body.category, clean(request.body.municipality), clean(request.body.province) ?? 'Jaén', clean(request.body.description), clean(request.body.address), clean(request.body.phone), clean(request.body.whatsapp), normalized.websiteUrl, normalized.imageUrl, normalized.imageSourceUrl, clean(request.body.imageCredit), clean(request.body.imageAlt), request.body.imageLicense, request.body.imageStatus, normalized.sourceUrl, request.body.sourceCheckedAt ?? null, request.body.verificationStatus, request.body.publicVisible, request.body.featured]);
        if (!result.rows[0]) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'LOCAL_BUSINESS_NOT_FOUND', 'Local business not found'));
        }
        await recordAdminAudit(client, session, {
          action: 'territory.business.update', entityType: 'local_business', entityId: request.params.businessId,
          summary: `Negocio local actualizado: ${result.rows[0].name}`,
          metadata: { category: request.body.category, verificationStatus: request.body.verificationStatus, publicVisible: request.body.publicVisible },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );
}

function businessBodySchema() {
  return {
    type: 'object', additionalProperties: false,
    required: ['name', 'category', 'imageLicense', 'imageStatus', 'verificationStatus', 'publicVisible', 'featured'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 240 },
      category: { type: 'string', enum: businessCategories },
      municipality: { anyOf: [{ type: 'string', maxLength: 160 }, { type: 'null' }] },
      province: { anyOf: [{ type: 'string', maxLength: 160 }, { type: 'null' }] },
      description: { anyOf: [{ type: 'string', maxLength: 3000 }, { type: 'null' }] },
      address: { anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }] },
      phone: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] },
      whatsapp: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] },
      websiteUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
      ...imageSchema,
      sourceUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
      sourceCheckedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
      verificationStatus: { type: 'string', enum: verificationStatuses },
      publicVisible: { type: 'boolean' }, featured: { type: 'boolean' },
    },
  } as const;
}

function normalizeBusinessRequest(
  request: { body: BusinessBody } & Parameters<typeof apiError>[0],
  reply: { code(statusCode: number): { send(payload: unknown): unknown } },
) {
  const websiteUrl = publicHttps(request.body.websiteUrl);
  const imageUrl = publicHttps(request.body.imageUrl);
  const imageSourceUrl = publicHttps(request.body.imageSourceUrl);
  const sourceUrl = publicHttps(request.body.sourceUrl);
  if (clean(request.body.websiteUrl) && !websiteUrl) { reply.code(400).send(apiError(request, 'INVALID_PUBLIC_WEBSITE_URL', 'Website URL must be public HTTPS')); return null; }
  if (clean(request.body.imageUrl) && !imageUrl) { reply.code(400).send(apiError(request, 'INVALID_IMAGE_URL', 'Image URL must be public HTTPS')); return null; }
  if (clean(request.body.imageSourceUrl) && !imageSourceUrl) { reply.code(400).send(apiError(request, 'INVALID_IMAGE_SOURCE_URL', 'Image source URL must be public HTTPS')); return null; }
  if (clean(request.body.sourceUrl) && !sourceUrl) { reply.code(400).send(apiError(request, 'INVALID_PUBLIC_SOURCE_URL', 'Source URL must be public HTTPS')); return null; }
  const publishingError = validateImagePublishing(request, request.body.imageStatus, request.body.imageLicense, imageUrl);
  if (publishingError) { reply.code(400).send(publishingError); return null; }
  return { websiteUrl, imageUrl, imageSourceUrl, sourceUrl };
}
