import { useEffect, useMemo, useRef, useState } from 'react';

type EntityType = 'cooperative' | 'sat' | 'company' | 'other';
type VerificationStatus = 'unverified' | 'verified' | 'stale';
type AdvertisingCategory =
  | 'cooperative'
  | 'oil_mill'
  | 'machinery'
  | 'workshop'
  | 'harvest'
  | 'nursery'
  | 'irrigation'
  | 'pruning'
  | 'phytosanitary'
  | 'insurance'
  | 'advisory'
  | 'other';
type AdvertisingEventType = 'impression' | 'phone_click' | 'whatsapp_click' | 'website_click';
type AdvertisingPlacement = 'directory_card' | 'directory_action';

type PublicDestination = {
  id: string;
  officialName: string;
  brandName: string | null;
  entityType: EntityType;
  municipality: string | null;
  province: string | null;
  websiteUrl: string | null;
  sourceUrl: string | null;
  sourceCheckedAt: string | null;
  verificationStatus: VerificationStatus;
  commercial: {
    category: AdvertisingCategory;
    description: string | null;
    phone: string | null;
    whatsappPhone: string | null;
    logoUrl: string | null;
    heroImageUrl: string | null;
  } | null;
  sponsorship: {
    sponsored: true;
    label: string;
    planCode: 'featured' | 'premium' | null;
    priority: number;
  } | null;
};

type DirectoryResponse = {
  advertisingEnabled: boolean;
  sponsorshipContext: {
    municipality: string | null;
    precision: 'municipality' | 'general';
  };
  items: PublicDestination[];
  municipalities: string[];
  source: {
    label: string;
    provider: string | null;
    sourceUrl: string | null;
    checkedAt: string | null;
  };
};

const entityLabels: Record<EntityType, string> = {
  cooperative: 'Cooperativa',
  sat: 'S.A.T.',
  company: 'Empresa / almazara',
  other: 'Entidad',
};

const verificationLabels: Record<VerificationStatus, string> = {
  verified: 'Fuente verificada',
  unverified: 'Pendiente de verificación',
  stale: 'Revisión pendiente',
};

const categoryLabels: Record<AdvertisingCategory, string> = {
  cooperative: 'Cooperativas',
  oil_mill: 'Almazaras',
  machinery: 'Maquinaria',
  workshop: 'Talleres',
  harvest: 'Recolección',
  nursery: 'Viveros',
  irrigation: 'Riego',
  pruning: 'Poda',
  phytosanitary: 'Fitosanitarios',
  insurance: 'Seguros',
  advisory: 'Asesoría',
  other: 'Otros servicios',
};

function formatCheckedAt(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function phoneHref(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/[^+\d]/g, '');
  return normalized ? `tel:${normalized}` : null;
}

function whatsappHref(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/\D/g, '');
  return normalized ? `https://wa.me/${normalized}` : null;
}

function recordAdvertisingEvent(
  destinationId: string,
  eventType: AdvertisingEventType,
  contextMunicipality: string | null,
  placement: AdvertisingPlacement,
): void {
  void fetch('/api/v1/public/advertising/events', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      destinationId,
      eventType,
      contextMunicipality,
      placement,
    }),
  }).catch(() => undefined);
}

export function MaginaDirectoryPage() {
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [entityType, setEntityType] = useState<EntityType | ''>('');
  const [category, setCategory] = useState<AdvertisingCategory | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recordedImpressions = useRef(new Set<string>());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const search = new URLSearchParams();
    if (municipality) search.set('contextMunicipality', municipality);
    const endpoint = `/api/v1/public/destinations${search.size > 0 ? `?${search.toString()}` : ''}`;

    void fetch(endpoint, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<DirectoryResponse>;
    }).then((result) => {
      setData(result);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError('No se ha podido cargar el directorio público de Mágina.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [municipality]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set((data?.items ?? [])
      .map((item) => item.commercial?.category)
      .filter((item): item is AdvertisingCategory => Boolean(item))))
      .sort((a, b) => categoryLabels[a].localeCompare(categoryLabels[b], 'es'));
  }, [data]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return (data?.items ?? []).filter((item) => {
      if (municipality && item.municipality !== municipality) return false;
      if (entityType && item.entityType !== entityType) return false;
      if (category && item.commercial?.category !== category) return false;
      if (!normalized) return true;
      const haystack = [
        item.officialName,
        item.brandName,
        item.municipality,
        item.commercial?.description,
        item.commercial?.category ? categoryLabels[item.commercial.category] : null,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');
      return haystack.includes(normalized);
    });
  }, [category, data, entityType, municipality, query]);

  useEffect(() => {
    if (!data?.advertisingEnabled || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const element = entry.target as HTMLElement;
        const destinationId = element.dataset.advertisingDestination;
        if (!destinationId) continue;

        const contextMunicipality = municipality || null;
        const impressionKey = `${contextMunicipality ?? 'general'}:${destinationId}`;
        if (!recordedImpressions.current.has(impressionKey)) {
          recordedImpressions.current.add(impressionKey);
          recordAdvertisingEvent(destinationId, 'impression', contextMunicipality, 'directory_card');
        }
        observer.unobserve(element);
      }
    }, { threshold: [0.5] });

    document.querySelectorAll<HTMLElement>('[data-advertising-destination]')
      .forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [data?.advertisingEnabled, filtered, municipality]);

  const globalCheckedAt = formatCheckedAt(data?.source.checkedAt ?? null);
  const sponsoredCount = filtered.filter((item) => item.sponsorship?.sponsored).length;

  function trackSponsoredClick(item: PublicDestination, eventType: Exclude<AdvertisingEventType, 'impression'>): void {
    if (!data?.advertisingEnabled || !item.sponsorship?.sponsored) return;
    recordAdvertisingEvent(item.id, eventType, municipality || null, 'directory_action');
  }

  return (
    <main className="directory-shell" id="main-content">
      <header className="directory-header">
        <a className="directory-brand" href="/" aria-label="Volver a Mágina Olivo">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
        </a>
        <a className="directory-back" href="/">Volver a la aplicación</a>
      </header>

      <section className="directory-hero" aria-labelledby="directory-title">
        <p className="eyebrow">Mágina · Empresas y servicios</p>
        <h1 id="directory-title">Servicios para tu olivar</h1>
        <p>Cooperativas, almazaras y empresas agrícolas en un único directorio. Los negocios patrocinados pueden ganar visibilidad, pero nunca sustituyen ni ocultan la información objetiva de Mágina Olivo.</p>
      </section>

      <section className="directory-filters" aria-label="Filtrar directorio">
        <div className="field">
          <label htmlFor="directory-query">Buscar</label>
          <input id="directory-query" type="search" placeholder="Nombre, servicio o municipio" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="directory-municipality">Municipio</label>
          <select id="directory-municipality" value={municipality} onChange={(event) => setMunicipality(event.target.value)}>
            <option value="">Todos</option>
            {(data?.municipalities ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="directory-type">Entidad</label>
          <select id="directory-type" value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType | '')}>
            <option value="">Todas</option>
            <option value="cooperative">Cooperativa</option>
            <option value="sat">S.A.T.</option>
            <option value="company">Empresa / almazara</option>
          </select>
        </div>
        {data?.advertisingEnabled && availableCategories.length > 0 ? (
          <div className="field">
            <label htmlFor="directory-category">Servicio</label>
            <select id="directory-category" value={category} onChange={(event) => setCategory(event.target.value as AdvertisingCategory | '')}>
              <option value="">Todos</option>
              {availableCategories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
            </select>
          </div>
        ) : null}
      </section>

      <aside className="directory-business-cta" aria-label="Alta de empresas">
        <strong>¿Tienes una empresa o servicio agrícola?</strong>
        <span>Solicita tu ficha para aparecer en Mágina Olivo. Las altas y cualquier visibilidad patrocinada requieren revisión previa.</span>
        <a href="/empresas/solicitud">Solicitar mi ficha</a>
      </aside>

      {data?.advertisingEnabled && municipality ? (
        <p className="directory-sponsorship-context">
          Los destacados de pago se limitan a campañas contratadas para <strong>{municipality}</strong> o campañas generales. Cambiar de municipio recalcula la prioridad sin compartir coordenadas de parcelas.
        </p>
      ) : null}

      <section className="directory-results" aria-labelledby="directory-results-title" aria-busy={loading}>
        <div className="directory-results-heading">
          <div>
            <h2 id="directory-results-title">Empresas y entidades</h2>
            <p>
              {loading ? 'Cargando directorio…' : `${filtered.length} de ${data?.items.length ?? 0} resultados`}
              {sponsoredCount > 0 ? ` · ${sponsoredCount} patrocinados` : ''}
            </p>
          </div>
          {globalCheckedAt ? <span className="badge">Fuente revisada {globalCheckedAt}</span> : null}
        </div>

        {error ? <div className="alert" role="alert">{error}</div> : null}

        <div className="directory-grid">
          {filtered.map((item) => {
            const itemCheckedAt = formatCheckedAt(item.sourceCheckedAt);
            const phone = phoneHref(item.commercial?.phone ?? null);
            const whatsapp = whatsappHref(item.commercial?.whatsappPhone ?? null);
            const sponsored = Boolean(item.sponsorship?.sponsored);

            return (
              <article
                className={`card directory-card${sponsored ? ' directory-card-sponsored' : ''}`}
                key={item.id}
                data-advertising-destination={sponsored ? item.id : undefined}
              >
                <div className="directory-card-topline">
                  <span className={`directory-type ${item.entityType}`}>
                    {item.commercial?.category ? categoryLabels[item.commercial.category] : entityLabels[item.entityType]}
                  </span>
                  {sponsored ? (
                    <span className="directory-sponsored" aria-label="Contenido patrocinado">
                      ★ {item.sponsorship?.label ?? 'Patrocinado'}
                    </span>
                  ) : (
                    <span className={`directory-status ${item.verificationStatus}`}>
                      {verificationLabels[item.verificationStatus]}
                    </span>
                  )}
                </div>

                <h3>{item.officialName}</h3>
                {item.brandName ? <p className="directory-brand-name">{item.brandName}</p> : null}
                <p className="directory-location">{item.municipality ?? 'Municipio pendiente'}{item.province ? ` · ${item.province}` : ''}</p>

                {item.commercial?.description ? (
                  <p className="directory-description">{item.commercial.description}</p>
                ) : null}

                {item.commercial && (phone || whatsapp || item.websiteUrl) ? (
                  <div className="directory-actions" aria-label={`Contactar con ${item.officialName}`}>
                    {phone ? <a className="directory-action" href={phone} onClick={() => trackSponsoredClick(item, 'phone_click')}>Llamar</a> : null}
                    {whatsapp ? <a className="directory-action primary" href={whatsapp} target="_blank" rel="noreferrer noopener" onClick={() => trackSponsoredClick(item, 'whatsapp_click')}>WhatsApp</a> : null}
                    {item.websiteUrl ? <a className="directory-action" href={item.websiteUrl} target="_blank" rel="noreferrer noopener" onClick={() => trackSponsoredClick(item, 'website_click')}>Web</a> : null}
                  </div>
                ) : null}

                <details className="directory-trust">
                  <summary>Procedencia de la ficha</summary>
                  {itemCheckedAt ? <p>Última comprobación: {itemCheckedAt}.</p> : (
                    <p>Esta ficha no tiene una fecha de comprobación fiable.</p>
                  )}
                  {item.verificationStatus === 'stale' ? (
                    <p>La última comprobación supera el intervalo de revisión. Confirma los datos en la fuente antes de usarlos.</p>
                  ) : null}
                  {item.verificationStatus === 'unverified' ? (
                    <p>La entidad aparece en el directorio, pero Mágina Olivo no la presenta como verificada todavía.</p>
                  ) : null}
                  {item.sourceUrl ? <p><a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">Ver fuente pública</a></p> : null}
                </details>
              </article>
            );
          })}
        </div>

        {!loading && !error && filtered.length === 0 ? (
          <div className="card empty-state"><strong>Sin resultados</strong>Prueba otro nombre, municipio, tipo o servicio.</div>
        ) : null}
      </section>

      <footer className="directory-footer">
        <p><strong>Transparencia:</strong> una empresa puede pagar por mayor visibilidad y aparecer como <strong>Patrocinado</strong>. El pago no modifica precios del aceite, meteorología, alertas, noticias ni ningún dato privado de tu explotación.</p>
        <p><strong>Privacidad de métricas:</strong> las interacciones con contenido patrocinado se contabilizan de forma agregada para medir el rendimiento de la campaña. No se guardan IP, usuario, explotación ni coordenadas de parcelas en estos eventos.</p>
        <p><strong>Importante:</strong> aparecer en el directorio no significa que la entidad colabore con Mágina Olivo ni que exista integración con su área privada.</p>
        {data ? (
          <p>
            Fuente base: {data.source.label}{data.source.provider ? ` · ${data.source.provider}` : ''}.
            {' '}La aplicación conserva procedencia y fecha de comprobación; una ficha antigua deja de mostrarse como verificada automáticamente.
            {data.source.sourceUrl ? <> <a href={data.source.sourceUrl} target="_blank" rel="noreferrer noopener">Consultar fuente pública</a>.</> : null}
          </p>
        ) : null}
      </footer>
    </main>
  );
}
