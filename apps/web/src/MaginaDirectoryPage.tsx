import { useEffect, useMemo, useState } from 'react';

type EntityType = 'cooperative' | 'sat' | 'company' | 'other';
type VerificationStatus = 'unverified' | 'verified' | 'stale';

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
};

type DirectoryResponse = {
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

export function MaginaDirectoryPage() {
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [entityType, setEntityType] = useState<EntityType | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetch('/api/v1/public/destinations', {
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
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return (data?.items ?? []).filter((item) => {
      if (municipality && item.municipality !== municipality) return false;
      if (entityType && item.entityType !== entityType) return false;
      if (!normalized) return true;
      const haystack = [item.officialName, item.brandName, item.municipality]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');
      return haystack.includes(normalized);
    });
  }, [data, entityType, municipality, query]);

  const globalCheckedAt = formatCheckedAt(data?.source.checkedAt ?? null);

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
        <p className="eyebrow">Mágina · Directorio público</p>
        <h1 id="directory-title">Cooperativas y almazaras</h1>
        <p>Un único punto para localizar las entidades de Sierra Mágina sin mezclar este directorio público con tus datos privados de campo.</p>
      </section>

      <section className="directory-filters" aria-label="Filtrar directorio">
        <div className="field">
          <label htmlFor="directory-query">Buscar</label>
          <input id="directory-query" type="search" placeholder="Nombre, marca o municipio" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="directory-municipality">Municipio</label>
          <select id="directory-municipality" value={municipality} onChange={(event) => setMunicipality(event.target.value)}>
            <option value="">Todos</option>
            {(data?.municipalities ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="directory-type">Tipo</label>
          <select id="directory-type" value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType | '')}>
            <option value="">Todos</option>
            <option value="cooperative">Cooperativa</option>
            <option value="sat">S.A.T.</option>
            <option value="company">Empresa / almazara</option>
          </select>
        </div>
      </section>

      <section className="directory-results" aria-labelledby="directory-results-title" aria-busy={loading}>
        <div className="directory-results-heading">
          <div>
            <h2 id="directory-results-title">Entidades</h2>
            <p>{loading ? 'Cargando directorio…' : `${filtered.length} de ${data?.items.length ?? 0} entidades`}</p>
          </div>
          {globalCheckedAt ? <span className="badge">Fuente revisada {globalCheckedAt}</span> : null}
        </div>

        {error ? <div className="alert" role="alert">{error}</div> : null}

        <div className="directory-grid">
          {filtered.map((item) => {
            const itemCheckedAt = formatCheckedAt(item.sourceCheckedAt);
            return (
              <article className="card directory-card" key={item.id}>
                <div className="directory-card-topline">
                  <span className={`directory-type ${item.entityType}`}>{entityLabels[item.entityType]}</span>
                  <span className={`directory-status ${item.verificationStatus}`}>
                    {verificationLabels[item.verificationStatus]}
                  </span>
                </div>
                <h3>{item.officialName}</h3>
                {item.brandName ? <p className="directory-brand-name">{item.brandName}</p> : null}
                <p className="directory-location">{item.municipality ?? 'Municipio pendiente'}{item.province ? ` · ${item.province}` : ''}</p>
                {itemCheckedAt ? <p className="directory-location">Última comprobación de esta ficha: {itemCheckedAt}</p> : (
                  <p className="directory-location">Esta ficha no tiene una fecha de comprobación fiable.</p>
                )}
                {item.verificationStatus === 'stale' ? (
                  <p className="directory-location">La última comprobación supera el intervalo de revisión de la V1. Confirma los datos en la fuente antes de usarlos.</p>
                ) : null}
                {item.verificationStatus === 'unverified' ? (
                  <p className="directory-location">La entidad aparece en el directorio, pero Mágina Olivo no la presenta como verificada todavía.</p>
                ) : null}
                {item.websiteUrl || item.sourceUrl ? (
                  <p className="directory-location">
                    {item.websiteUrl ? (
                      <><a href={item.websiteUrl} target="_blank" rel="noreferrer noopener">Web de la entidad</a>{item.sourceUrl ? ' · ' : ''}</>
                    ) : null}
                    {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">Ver fuente</a> : null}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        {!loading && !error && filtered.length === 0 ? (
          <div className="card empty-state"><strong>Sin resultados</strong>Prueba otro nombre, municipio o tipo de entidad.</div>
        ) : null}
      </section>

      <footer className="directory-footer">
        <p><strong>Importante:</strong> aparecer en este directorio no significa que la entidad colabore con Mágina Olivo ni que exista integración con su área privada.</p>
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
