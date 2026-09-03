alter table cooperatives
  add column if not exists entity_type text not null default 'cooperative'
    check (entity_type in ('cooperative', 'sat', 'company', 'other')),
  add column if not exists brand_name text;

comment on table cooperatives is
  'Public cooperative/almazara destination directory. The historical table name is kept for compatibility; entity_type distinguishes cooperatives, SATs and companies.';

comment on column cooperatives.entity_type is
  'Legal/product-facing type of destination; do not assume every directory entity is a cooperative.';

insert into cooperatives (
  id, official_name, brand_name, entity_type, municipality, province,
  source_url, source_checked_at, verification_status
)
values
  ('10000000-0000-4000-8000-000000000001', 'Aceites Campoliva, S.L.', 'Melgarejo', 'company', 'Pegalajar', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000002', 'Avirol, S.L.', null, 'company', 'Cambil', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000003', 'Monva, S.L.', null, 'company', 'Mancha Real', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000004', 'Oleozumo, S.L.', null, 'company', 'Mancha Real', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000005', 'S.A.T. Ntra. Sra. del Camino', null, 'sat', 'Garcíez', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000006', 'S.C.A. Bedmarense', 'Magnasur', 'cooperative', 'Bedmar', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000007', 'S.C.A. La Unión del Santo Cristo', 'Salud Sierra', 'cooperative', 'Cabra del Santo Cristo', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000008', 'S.C.A. Ntra. Sra. de la Asunción', null, 'cooperative', 'Albanchez de Mágina', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000009', 'S.C.A. Ntra. Sra. de la Cabeza', null, 'cooperative', 'Campillo de Arenas', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000010', 'S.C.A. Ntra. Sra. de la Paz', 'La Perla de Mágina', 'cooperative', 'Bélmez de la Moraleda', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000011', 'S.C.A. Ntra. Sra. de los Remedios', 'Oro de Cánava', 'cooperative', 'Jimena', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000012', 'S.C.A. Ntra. Sra. del Rosario', 'Albilia', 'cooperative', 'Arbuniel', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000013', 'S.C.A. Ntra. Sra. Pilar del Andaraje', null, 'cooperative', 'Jódar', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000014', 'S.C.A. San Francisco', null, 'cooperative', 'Albanchez de Mágina', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000015', 'S.C.A. San Isidro Labrador', 'Santuario de Mágina', 'cooperative', 'Huelma', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000016', 'S.C.A. San Juan Bautista', 'Castillo de Solera', 'cooperative', 'Solera', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000017', 'S.C.A. San Roque', null, 'cooperative', 'Cárcheles', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000018', 'S.C.A. San Sebastián', 'Señorío de Mesía', 'cooperative', 'La Guardia de Jaén', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000019', 'S.C.A. Santa Isabel', 'Señorío de Camarasa', 'cooperative', 'Torres', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000020', 'S.C.A. Santísimo Cristo de la Misericordia', null, 'cooperative', 'Jódar', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000021', 'S.C.A. Trujal de Mágina', null, 'cooperative', 'Cambil', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000022', 'S.C.A. Unión Oleícola de Cambil', 'Esmeralda de Mágina', 'cooperative', 'Cambil', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000023', 'Thuelma, S.L.', null, 'company', 'Huelma', 'Jaén', 'https://sierramagina.org/almazaras-envasadoras/', '2026-09-02T00:00:00Z', 'verified')
on conflict (id) do update set
  official_name = excluded.official_name,
  brand_name = excluded.brand_name,
  entity_type = excluded.entity_type,
  municipality = excluded.municipality,
  province = excluded.province,
  source_url = excluded.source_url,
  source_checked_at = excluded.source_checked_at,
  verification_status = excluded.verification_status,
  updated_at = now();
