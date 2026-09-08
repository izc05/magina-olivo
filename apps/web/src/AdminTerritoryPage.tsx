import { useCallback, useEffect, useMemo, useState } from 'react';

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';
type Tab = 'municipalities' | 'destinations' | 'businesses';
type ImageLicense = 'owned' | 'licensed' | 'official_reusable' | 'external_reference_only' | 'unknown' | 'blocked';
type ImageStatus = 'missing' | 'candidate' | 'approved' | 'blocked';
type VerificationStatus = 'unverified' | 'verified' | 'stale';

type Summary = {
  municipalities: number;
  municipality_images: number;
  destinations: number;
  destination_images: number;
  businesses: number;
  pending_businesses: number;
};

type Municipality = {
  slug: string;
  name: string;
  province: string;
  aliases: string[];
  active: boolean;
  heroImageUrl: string | null;
  heroImageSourceUrl: string | null;
  heroImageCredit: string | null;
  heroImageAlt: string | null;
  heroImageLicense: ImageLicense;
  heroImageStatus: ImageStatus;
  heroImageUpdatedAt: string | null;
};

type Destination = {
  id: string;
  officialName: string;
  brandName: string | null;
  entityType: 'cooperative' | 'sat' | 'company' | 'other';
  municipality: string | null;
  province: string | null;
  description: string | null;
  imageUrl: string | null;
  imageSourceUrl: string | null;
  imageCredit: string | null;
  imageAlt: string | null;
  imageLicense: ImageLicense;
  imageStatus: ImageStatus;
  publicVisible: boolean;
  featured: boolean;
  verificationStatus: VerificationStatus;
  updatedAt: string;
};

type BusinessCategory =
  | 'agricultural_machinery' | 'olive_services' | 'harvest_services' | 'irrigation'
  | 'nursery' | 'workshop' | 'transport' | 'hospitality' | 'retail'
  | 'professional_service' | 'other';

type Business = {
  id: string;
  name: string;
  category: BusinessCategory;
  municipality: string | null;
  province: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  imageSourceUrl: string | null;
  imageCredit: string | null;
  imageAlt: string | null;
  imageLicense: ImageLicense;
  imageStatus: ImageStatus;
  sourceUrl: string | null;
  sourceCheckedAt: string | null;
  verificationStatus: VerificationStatus;
  publicVisible: boolean;
  featured: boolean;
  updatedAt: string;
};

const categoryLabels: Record<BusinessCategory, string> = {
  agricultural_machinery: 'Maquinaria agrícola',
  olive_services: 'Servicios para olivar',
  harvest_services: 'Recolección',
  irrigation: 'Riego',
  nursery: 'Vivero',
  workshop: 'Taller',
  transport: 'Transporte',
  hospitality: 'Hostelería',
  retail: 'Comercio',
  professional_service: 'Servicio profesional',
  other: 'Otro',
};

const emptyBusiness: Omit<Business, 'id' | 'updatedAt'> = {
  name: '', category: 'olive_services', municipality: null, province: 'Jaén', description: null,
  address: null, phone: null, whatsapp: null, websiteUrl: null, imageUrl: null, imageSourceUrl: null,
  imageCredit: null, imageAlt: null, imageLicense: 'unknown', imageStatus: 'missing', sourceUrl: null,
  sourceCheckedAt: null, verificationStatus: 'unverified', publicVisible: false, featured: false,
};

async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    try {
      const body = await response.json() as { error?: { message?: string } };
      if (body.error?.message) error.message = body.error.message;
    } catch {
      // Keep HTTP error when a proxy does not return JSON.
    }
    throw error;
  }
  return await response.json() as T;
}

function optional(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? '').trim();
  return value || null;
}

function imageStatusLabel(status: ImageStatus): string {
  return ({ missing: 'Sin imagen', candidate: 'Candidata', approved: 'Aprobada', blocked: 'Bloqueada' })[status];
}

function ImageFields({ item, prefix = '' }: {
  item: { imageUrl: string | null; imageSourceUrl: string | null; imageCredit: string | null; imageAlt: string | null; imageLicense: ImageLicense; imageStatus: ImageStatus };
  prefix?: string;
}) {
  return (
    <>
      <label>URL de imagen HTTPS<input name={`${prefix}imageUrl`} type="url" defaultValue={item.imageUrl ?? ''} placeholder="https://…" /></label>
      <label>Página fuente HTTPS<input name={`${prefix}imageSourceUrl`} type="url" defaultValue={item.imageSourceUrl ?? ''} placeholder="https://…" /></label>
      <div className="admin-form-row">
        <label>Crédito<input name={`${prefix}imageCredit`} defaultValue={item.imageCredit ?? ''} placeholder="Autor / entidad" /></label>
        <label>Texto alternativo<input name={`${prefix}imageAlt`} defaultValue={item.imageAlt ?? ''} placeholder="Descripción accesible" /></label>
      </div>
      <div className="admin-form-row">
        <label>Derechos<select name={`${prefix}imageLicense`} defaultValue={item.imageLicense}>
          <option value="unknown">Sin revisar</option><option value="owned">Propia</option><option value="licensed">Con licencia</option>
          <option value="official_reusable">Oficial reutilizable</option><option value="external_reference_only">Solo referencia externa</option><option value="blocked">Bloqueada</option>
        </select></label>
        <label>Estado<select name={`${prefix}imageStatus`} defaultValue={item.imageStatus}>
          <option value="missing">Sin imagen</option><option value="candidate">Candidata</option><option value="approved">Aprobada</option><option value="blocked">Bloqueada</option>
        </select></label>
      </div>
    </>
  );
}

export function AdminTerritoryPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [tab, setTab] = useState<Tab>('municipalities');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('new');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summaryResult, municipalityResult, destinationResult, businessResult] = await Promise.all([
        adminRequest<Summary>('/api/v1/admin/territory/summary'),
        adminRequest<{ items: Municipality[] }>('/api/v1/admin/territory/municipalities'),
        adminRequest<{ items: Destination[] }>('/api/v1/admin/territory/destinations'),
        adminRequest<{ items: Business[] }>('/api/v1/admin/territory/businesses'),
      ]);
      setSummary(summaryResult);
      setMunicipalities(municipalityResult.items);
      setDestinations(destinationResult.items);
      setBusinesses(businessResult.items);
      setSelectedMunicipality((current) => current || municipalityResult.items[0]?.slug || '');
      setSelectedDestination((current) => current || destinationResult.items[0]?.id || '');
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) setState('forbidden');
      else {
        setError(reason instanceof Error ? reason.message : 'No se ha podido abrir la gestión territorial.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleMunicipalities = useMemo(() => municipalities.filter((item) => `${item.name} ${item.aliases.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [municipalities, query]);
  const visibleDestinations = useMemo(() => destinations.filter((item) => `${item.officialName} ${item.brandName ?? ''} ${item.municipality ?? ''}`.toLowerCase().includes(query.toLowerCase())), [destinations, query]);
  const visibleBusinesses = useMemo(() => businesses.filter((item) => `${item.name} ${item.municipality ?? ''} ${categoryLabels[item.category]}`.toLowerCase().includes(query.toLowerCase())), [businesses, query]);

  const municipality = municipalities.find((item) => item.slug === selectedMunicipality) ?? null;
  const destination = destinations.find((item) => item.id === selectedDestination) ?? null;
  const business = selectedBusiness === 'new' ? null : businesses.find((item) => item.id === selectedBusiness) ?? null;

  async function saveMunicipality(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!municipality) return;
    const form = new FormData(event.currentTarget);
    await runSave(async () => {
      await adminRequest(`/api/v1/admin/territory/municipalities/${encodeURIComponent(municipality.slug)}`, {
        method: 'PATCH', body: JSON.stringify({
          heroImageUrl: optional(form, 'heroImageUrl'), heroImageSourceUrl: optional(form, 'heroImageSourceUrl'),
          heroImageCredit: optional(form, 'heroImageCredit'), heroImageAlt: optional(form, 'heroImageAlt'),
          heroImageLicense: String(form.get('heroImageLicense')), heroImageStatus: String(form.get('heroImageStatus')),
          active: form.get('active') === 'on',
        }),
      });
      setNotice(`Pueblo actualizado: ${municipality.name}.`);
    });
  }

  async function saveDestination(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destination) return;
    const form = new FormData(event.currentTarget);
    await runSave(async () => {
      await adminRequest(`/api/v1/admin/territory/destinations/${destination.id}`, {
        method: 'PATCH', body: JSON.stringify({
          description: optional(form, 'description'), imageUrl: optional(form, 'imageUrl'),
          imageSourceUrl: optional(form, 'imageSourceUrl'), imageCredit: optional(form, 'imageCredit'), imageAlt: optional(form, 'imageAlt'),
          imageLicense: String(form.get('imageLicense')), imageStatus: String(form.get('imageStatus')),
          publicVisible: form.get('publicVisible') === 'on', featured: form.get('featured') === 'on',
        }),
      });
      setNotice(`Ficha visual actualizada: ${destination.officialName}.`);
    });
  }

  async function saveBusiness(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? '').trim(), category: String(form.get('category')),
      municipality: optional(form, 'municipality'), province: optional(form, 'province'), description: optional(form, 'description'),
      address: optional(form, 'address'), phone: optional(form, 'phone'), whatsapp: optional(form, 'whatsapp'), websiteUrl: optional(form, 'websiteUrl'),
      imageUrl: optional(form, 'imageUrl'), imageSourceUrl: optional(form, 'imageSourceUrl'), imageCredit: optional(form, 'imageCredit'), imageAlt: optional(form, 'imageAlt'),
      imageLicense: String(form.get('imageLicense')), imageStatus: String(form.get('imageStatus')), sourceUrl: optional(form, 'sourceUrl'),
      sourceCheckedAt: business?.sourceCheckedAt ?? null, verificationStatus: String(form.get('verificationStatus')),
      publicVisible: form.get('publicVisible') === 'on', featured: form.get('featured') === 'on',
    };
    await runSave(async () => {
      if (business) await adminRequest(`/api/v1/admin/territory/businesses/${business.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await adminRequest('/api/v1/admin/territory/businesses', { method: 'POST', body: JSON.stringify(payload) });
      setNotice(business ? `Negocio actualizado: ${payload.name}.` : `Negocio creado: ${payload.name}.`);
      setSelectedBusiness('new');
    });
  }

  async function runSave(action: () => Promise<void>) {
    setBusy(true); setNotice(null); setError(null);
    try { await action(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se han podido guardar los cambios.'); }
    finally { setBusy(false); }
  }

  if (state === 'loading') return <main className="admin-loading">Abriendo territorio y directorio…</main>;
  if (state === 'forbidden') return <main className="admin-gate"><section className="admin-gate-card"><h1>Acceso restringido</h1><p>Esta sección requiere permisos de superadministración.</p><a className="admin-primary-link" href="/admin">Volver al Admin</a></section></main>;
  if (state === 'error') return <main className="admin-gate"><section className="admin-gate-card"><h1>No se pudo abrir el módulo</h1><p>{error}</p><button className="admin-primary-button" onClick={() => void load()}>Reintentar</button></section></main>;

  return (
    <div className="admin-shell admin-territory-shell">
      <aside className="admin-sidebar">
        <a href="/admin" className="admin-brand"><span className="admin-brand-mark">MO</span><span><strong>Mágina Olivo</strong><small>Territorio y directorio</small></span></a>
        <nav aria-label="Gestión territorial">
          <button className={tab === 'municipalities' ? 'active' : ''} onClick={() => { setTab('municipalities'); setQuery(''); }}>Pueblos e imágenes</button>
          <button className={tab === 'destinations' ? 'active' : ''} onClick={() => { setTab('destinations'); setQuery(''); }}>Almazaras</button>
          <button className={tab === 'businesses' ? 'active' : ''} onClick={() => { setTab('businesses'); setQuery(''); }}>Negocios locales</button>
          <a href="/admin/operaciones">Operaciones</a><a href="/admin/publicidad">Publicidad</a><a href="/admin">← Centro de mando</a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar admin-territory-topbar">
          <div><p className="admin-eyebrow">Sierra Mágina</p><h1>Territorio y directorio</h1><p>Control editorial de pueblos, imágenes, almazaras y negocios cercanos.</p></div>
          <button className="admin-ghost-button" type="button" onClick={() => void load()} disabled={busy}>Actualizar</button>
        </header>

        {summary ? <section className="admin-territory-kpis" aria-label="Resumen territorial">
          <article><strong>{summary.municipality_images}/{summary.municipalities}</strong><span>Pueblos con hero</span></article>
          <article><strong>{summary.destination_images}/{summary.destinations}</strong><span>Almazaras con imagen</span></article>
          <article><strong>{summary.businesses}</strong><span>Negocios cargados</span></article>
          <article className={summary.pending_businesses ? 'warning' : ''}><strong>{summary.pending_businesses}</strong><span>Negocios por revisar</span></article>
        </section> : null}

        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section className="admin-card admin-territory-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'municipalities' ? 'Buscar pueblo…' : tab === 'destinations' ? 'Buscar almazara, cooperativa o marca…' : 'Buscar negocio o municipio…'} />
          {tab === 'businesses' ? <button className="admin-primary-button" type="button" onClick={() => setSelectedBusiness('new')}>+ Nuevo negocio</button> : null}
        </section>

        {tab === 'municipalities' ? <section className="admin-territory-workspace">
          <div className="admin-card admin-territory-list">{visibleMunicipalities.map((item) => <button key={item.slug} className={selectedMunicipality === item.slug ? 'active' : ''} onClick={() => setSelectedMunicipality(item.slug)}><span className={`admin-media-dot ${item.heroImageStatus}`} /><span><strong>{item.name}</strong><small>{imageStatusLabel(item.heroImageStatus)} · {item.heroImageLicense}</small></span></button>)}</div>
          {municipality ? <form key={municipality.slug} className="admin-card admin-form admin-territory-editor" onSubmit={saveMunicipality}>
            <div className="admin-card-heading"><div><p className="admin-eyebrow">Hero del municipio</p><h2>{municipality.name}</h2></div><span>{municipality.province}</span></div>
            {municipality.heroImageUrl ? <img className="admin-territory-preview" src={municipality.heroImageUrl} alt={municipality.heroImageAlt || municipality.name} /> : <div className="admin-territory-placeholder">Sin imagen aprobada</div>}
            <ImageFields item={{ imageUrl: municipality.heroImageUrl, imageSourceUrl: municipality.heroImageSourceUrl, imageCredit: municipality.heroImageCredit, imageAlt: municipality.heroImageAlt, imageLicense: municipality.heroImageLicense, imageStatus: municipality.heroImageStatus }} />
            <label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked={municipality.active} /> Municipio visible/activo</label>
            <div className="admin-territory-rule">Solo se permite aprobar una imagen cuando sus derechos están como <strong>propia</strong>, <strong>con licencia</strong> u <strong>oficial reutilizable</strong>.</div>
            <button className="admin-primary-button" disabled={busy}>{busy ? 'Guardando…' : 'Guardar pueblo'}</button>
          </form> : null}
        </section> : null}

        {tab === 'destinations' ? <section className="admin-territory-workspace">
          <div className="admin-card admin-territory-list">{visibleDestinations.map((item) => <button key={item.id} className={selectedDestination === item.id ? 'active' : ''} onClick={() => setSelectedDestination(item.id)}><span className={`admin-media-dot ${item.imageStatus}`} /><span><strong>{item.brandName || item.officialName}</strong><small>{item.municipality || 'Sin municipio'} · {imageStatusLabel(item.imageStatus)}</small></span></button>)}</div>
          {destination ? <form key={destination.id} className="admin-card admin-form admin-territory-editor" onSubmit={saveDestination}>
            <div className="admin-card-heading"><div><p className="admin-eyebrow">Almazara / cooperativa</p><h2>{destination.brandName || destination.officialName}</h2><small>{destination.officialName}</small></div><span>{destination.municipality || 'Sierra Mágina'}</span></div>
            {destination.imageUrl ? <img className="admin-territory-preview" src={destination.imageUrl} alt={destination.imageAlt || destination.officialName} /> : <div className="admin-territory-placeholder">Añade una fotografía de la almazara</div>}
            <label>Descripción<textarea name="description" rows={4} defaultValue={destination.description ?? ''} placeholder="Presentación pública breve…" /></label>
            <ImageFields item={destination} />
            <div className="admin-form-row admin-territory-toggles"><label className="admin-checkbox"><input name="publicVisible" type="checkbox" defaultChecked={destination.publicVisible} /> Visible</label><label className="admin-checkbox"><input name="featured" type="checkbox" defaultChecked={destination.featured} /> Destacada editorialmente</label></div>
            <p className="admin-muted">Los datos de nombre, dirección, teléfono, web y verificación siguen editándose en Operaciones para no duplicar controles.</p>
            <button className="admin-primary-button" disabled={busy}>{busy ? 'Guardando…' : 'Guardar imagen y presentación'}</button>
          </form> : null}
        </section> : null}

        {tab === 'businesses' ? <section className="admin-territory-workspace">
          <div className="admin-card admin-territory-list"><button className={selectedBusiness === 'new' ? 'active create' : 'create'} onClick={() => setSelectedBusiness('new')}><span className="admin-media-dot candidate" /><span><strong>Nuevo negocio</strong><small>Crear ficha editorial</small></span></button>{visibleBusinesses.map((item) => <button key={item.id} className={selectedBusiness === item.id ? 'active' : ''} onClick={() => setSelectedBusiness(item.id)}><span className={`admin-media-dot ${item.imageStatus}`} /><span><strong>{item.name}</strong><small>{item.municipality || 'Sin municipio'} · {categoryLabels[item.category]}</small></span></button>)}</div>
          <BusinessEditor key={business?.id ?? 'new'} business={business} busy={busy} onSubmit={saveBusiness} />
        </section> : null}
      </main>
    </div>
  );
}

function BusinessEditor({ business, busy, onSubmit }: { business: Business | null; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const item = business ?? emptyBusiness;
  return <form className="admin-card admin-form admin-territory-editor" onSubmit={onSubmit}>
    <div className="admin-card-heading"><div><p className="admin-eyebrow">{business ? 'Editar negocio' : 'Alta editorial'}</p><h2>{business?.name || 'Nuevo negocio local'}</h2></div>{business ? <span>{business.verificationStatus}</span> : null}</div>
    {item.imageUrl ? <img className="admin-territory-preview" src={item.imageUrl} alt={item.imageAlt || item.name} /> : <div className="admin-territory-placeholder">Imagen del negocio</div>}
    <label>Nombre<input name="name" defaultValue={item.name} required maxLength={240} /></label>
    <div className="admin-form-row"><label>Categoría<select name="category" defaultValue={item.category}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Municipio<input name="municipality" defaultValue={item.municipality ?? ''} /></label></div>
    <label>Descripción<textarea name="description" rows={4} defaultValue={item.description ?? ''} /></label>
    <label>Dirección<input name="address" defaultValue={item.address ?? ''} /></label>
    <div className="admin-form-row"><label>Teléfono<input name="phone" defaultValue={item.phone ?? ''} /></label><label>WhatsApp<input name="whatsapp" defaultValue={item.whatsapp ?? ''} /></label></div>
    <div className="admin-form-row"><label>Provincia<input name="province" defaultValue={item.province ?? 'Jaén'} /></label><label>Web HTTPS<input name="websiteUrl" type="url" defaultValue={item.websiteUrl ?? ''} /></label></div>
    <ImageFields item={item} />
    <label>Fuente de verificación HTTPS<input name="sourceUrl" type="url" defaultValue={item.sourceUrl ?? ''} /></label>
    <label>Verificación<select name="verificationStatus" defaultValue={item.verificationStatus}><option value="unverified">Sin verificar</option><option value="verified">Verificada</option><option value="stale">Revisión pendiente</option></select></label>
    <div className="admin-form-row admin-territory-toggles"><label className="admin-checkbox"><input name="publicVisible" type="checkbox" defaultChecked={item.publicVisible} /> Visible públicamente</label><label className="admin-checkbox"><input name="featured" type="checkbox" defaultChecked={item.featured} /> Destacado editorial</label></div>
    <div className="admin-territory-rule">La ficha editorial y la publicidad son independientes. Un negocio puede estar en el directorio sin ser patrocinador.</div>
    <button className="admin-primary-button" disabled={busy}>{busy ? 'Guardando…' : business ? 'Guardar negocio' : 'Crear negocio'}</button>
  </form>;
}
