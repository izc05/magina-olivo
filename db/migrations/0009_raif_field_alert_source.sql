update public_data_sources
set
  label = 'Seguimiento de plagas y enfermedades — Olivar Andalucía',
  provider = 'RAIF · Junta de Andalucía',
  source_url = 'https://www.juntadeandalucia.es/datosabiertos/portal/dataset/raif',
  license_label = 'CC BY 4.0',
  update_frequency = 'weekly',
  source_updated_at = '2026-08-31T00:00:00Z',
  last_checked_at = '2026-09-03T00:00:00Z',
  last_success_at = '2026-09-03T00:00:00Z',
  last_error = null,
  metadata = '{
    "crop":"olivar",
    "coverage":"Andalucía",
    "provinceFocus":"Jaén",
    "currentness":"verified-current-dataset",
    "latestDatasetUpdate":"2026-08-31",
    "latestDemonstrationObservation":"2026-09-01",
    "ingestion":"periodic snapshot",
    "usage":"regional-fitosanitary-context-not-plot-diagnosis",
    "olivarPage":"https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/category/olivar/",
    "jaenReports":"https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/boletin-provincial/informes-historicos/informes-historicos-jaen/informes-historicos-jaen-2026/",
    "baezaDemo":"https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/gip-andalucia/seguimiento-y-resultados/explotacion-demostrativa-baeza-olivar/"
  }'::jsonb,
  updated_at = now()
where source_key = 'raif-olivar-observations';
