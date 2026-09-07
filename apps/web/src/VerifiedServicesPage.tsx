import { ArrowRight, BadgeCheck, Building2, ExternalLink, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { VisualHeader } from './VisualChrome';

type EntityType = 'cooperative' | 'sat' | 'company' | 'other';
type VerificationStatus = 'verified' | 'unverified' | 'stale';
type Destination = { id: string; officialName: string; brandName: string | null; entityType: EntityType; municipality: string | null; websiteUrl: string | null; sourceUrl: string | null; verificationStatus: VerificationStatus };
type DirectoryResponse = { items: Destination[]; municipalities: string[] };

const labels: Record<EntityType, string> = { cooperative: 'Cooperativa', sat: 'S.A.T.', company: 'Empresa / almazara', other: 'Entidad' };

export function VerifiedServicesPage() {
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<EntityType | ''>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/destinations', { credentials: 'same-origin', headers: { accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() as Promise<DirectoryResponse>; })
      .then((result) => setData(result))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError('No se ha podido cargar el directorio público ahora.'); });
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return (data?.items ?? []).filter((item) => !type || item.entityType === type).filter((item) => !normalized || [item.officialName, item.brandName, item.municipality].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(normalized));
  }, [data, query, type]);

  return <main className="local-services-shell verified-services-shell" id="main-content">
    <VisualHeader />
    <section className="verified-services-hero"><img src="/photos/local-services-triptych.png" alt="Servicios y entidades del territorio" /><div><p className="eyebrow">DIRECTORIO PÚBLICO</p><h1>Servicios y entidades</h1><p>Consulta cooperativas, S.A.T. y empresas de Sierra Mágina sin mezclar este directorio con tus datos privados.</p></div></section>
    <section className="verified-services-trust card"><ShieldCheck aria-hidden="true" /><p><strong>Información con procedencia.</strong> La disponibilidad de servicios, precios, contacto y horarios se confirma en la web o fuente de cada entidad.</p></section>
    <label className="local-services-search"><Search aria-hidden="true" /><span className="sr-only">Buscar entidades</span><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Buscar entidad, municipio o actividad…" /></label>
    <nav className="local-services-categories directory" aria-label="Filtrar entidades">{(['', 'cooperative', 'sat', 'company'] as const).map((item) => <button className={type === item ? 'active' : ''} type="button" onClick={() => setType(item)} key={item || 'all'}>{item ? <Building2 aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}{item ? labels[item] : 'Todas'}</button>)}</nav>
    {error ? <div className="alert" role="alert">{error}</div> : null}
    {!data && !error ? <div className="card empty-state" role="status">Cargando entidades verificables…</div> : null}
    <section className="local-services-list directory verified-services-list" aria-label="Resultados del directorio">{visible.map((item) => <article className="local-service-row card" key={item.id}><span className="verified-service-icon"><Building2 aria-hidden="true" /></span><span className="local-service-copy"><strong>{item.brandName || item.officialName}</strong><span className="local-service-chip">{labels[item.entityType]}</span><small><MapPin aria-hidden="true" />{item.municipality ?? 'Municipio pendiente'}</small><small>{item.verificationStatus === 'verified' ? 'Fuente verificada' : 'Pendiente de verificación'}</small></span>{item.websiteUrl ? <a className="verified-service-link" href={item.websiteUrl} target="_blank" rel="noreferrer noopener" aria-label={`Abrir web de ${item.officialName}`}><ExternalLink aria-hidden="true" /></a> : item.sourceUrl ? <a className="verified-service-link" href={item.sourceUrl} target="_blank" rel="noreferrer noopener" aria-label={`Ver fuente de ${item.officialName}`}><ArrowRight aria-hidden="true" /></a> : <span className="verified-service-empty">—</span>}</article>)}</section>
    {data && visible.length === 0 ? <div className="card empty-state"><strong>Sin resultados</strong>Prueba otra búsqueda o categoría.</div> : null}
    <p className="local-services-note">Aparecer en este directorio no implica colaboración con Mágina Olivo ni acceso a los datos de tu explotación.</p>
  </main>;
}
