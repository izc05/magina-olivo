import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BellRing,
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Euro,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Newspaper,
  PackageOpen,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRoundCheck,
} from 'lucide-react';
import { getCooperativeDirectNewsSource } from './cooperativeDirectNews';
import { getCooperativeOperationalProfile } from './cooperativeOperations';
import type { CooperativeRecord } from './cooperativesFeed';
import { latestValue, loadMarket, type MarketPayload } from './marketFeed';
import { loadRealNews, type RealNewsStory } from './newsFeed';
import '../../styles/cooperative.css';

export type CooperativeSummary = CooperativeRecord & {
  sourceLabel: string;
  sourceUrl: string;
};

type CooperativeDetailProps = {
  cooperative: CooperativeSummary;
  onBack: () => void;
};

type DetailTab = 'resumen' | 'aceites' | 'precios' | 'noticias' | 'socios';

const campaignTerms = ['campaña', 'recepción', 'recepcion', 'aceituna', 'molturación', 'molturacion', 'patio', 'apertura', 'cierre', 'horario'];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function formatPrice(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
}

function formatCaptureDate(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-ES');
}

export function CooperativeDetail({ cooperative, onBack }: CooperativeDetailProps) {
  const [tab, setTab] = useState<DetailTab>('resumen');
  const [market, setMarket] = useState<MarketPayload | null>(null);
  const [stories, setStories] = useState<RealNewsStory[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([loadMarket(), loadRealNews()]).then(([marketResult, newsResult]) => {
      if (!active) return;
      if (marketResult.status === 'fulfilled') setMarket(marketResult.value);
      if (newsResult.status === 'fulfilled') setStories(newsResult.value.stories);
    });
    return () => { active = false; };
  }, []);

  const relatedStories = useMemo(() => {
    const brand = normalize(cooperative.brand);
    const town = normalize(cooperative.town);
    const name = normalize(cooperative.name)
      .replace('sociedad cooperativa andaluza', '')
      .replace('cooperativa', '')
      .trim();

    return stories.filter((story) => {
      if (story.cooperativeId === cooperative.id) return true;
      const haystack = normalize(`${story.title} ${story.excerpt} ${story.source}`);
      return haystack.includes(brand) || (name.length > 6 && haystack.includes(name)) || haystack.includes(town);
    }).slice(0, 8);
  }, [cooperative, stories]);

  const campaignStories = useMemo(() => stories.filter((story) => {
    if (!story.official || story.cooperativeId !== cooperative.id) return false;
    const haystack = normalize(`${story.title} ${story.excerpt}`);
    return campaignTerms.some((term) => haystack.includes(normalize(term)));
  }).slice(0, 5), [cooperative.id, stories]);

  const storeProducts = useMemo(
    () => cooperative.products?.filter((product) => product.storePriceLabel) ?? [],
    [cooperative.products],
  );
  const directNews = useMemo(() => getCooperativeDirectNewsSource(cooperative.id), [cooperative.id]);
  const operations = useMemo(() => getCooperativeOperationalProfile(cooperative.id), [cooperative.id]);

  return (
    <section className="section-block hub-panel hub-panel--flush section-block--last coop-detail-view">
      <div className="coop-detail-inline-head">
        <button className="coop-detail-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Cooperativas</button>
        <button className="icon-button" type="button" aria-label="Guardar cooperativa"><Bookmark size={18} /></button>
      </div>

      <section className="coop-detail-hero">
        <div className="coop-detail-hero__mark"><Building2 size={34} /></div>
        <div className="coop-detail-hero__copy">
          <span className="eyebrow">Cooperativa · Sierra Mágina</span>
          <h1>{cooperative.name}</h1>
          <p><MapPin size={14} /> {cooperative.town}</p>
        </div>
        <span className="coop-detail-status">D.O.P.</span>
      </section>

      <nav className="coop-detail-tabs" aria-label={`Ficha de ${cooperative.name}`}>
        <button type="button" className={tab === 'resumen' ? 'coop-detail-tab coop-detail-tab--active' : 'coop-detail-tab'} onClick={() => setTab('resumen')}>Resumen</button>
        <button type="button" className={tab === 'aceites' ? 'coop-detail-tab coop-detail-tab--active' : 'coop-detail-tab'} onClick={() => setTab('aceites')}>Aceites</button>
        <button type="button" className={tab === 'precios' ? 'coop-detail-tab coop-detail-tab--active' : 'coop-detail-tab'} onClick={() => setTab('precios')}>Precios</button>
        <button type="button" className={tab === 'noticias' ? 'coop-detail-tab coop-detail-tab--active' : 'coop-detail-tab'} onClick={() => setTab('noticias')}>Noticias</button>
        <button type="button" className={tab === 'socios' ? 'coop-detail-tab coop-detail-tab--active' : 'coop-detail-tab'} onClick={() => setTab('socios')}>Socios</button>
      </nav>

      {tab === 'resumen' && (
        <>
          <section className="coop-detail-metrics coop-detail-metrics--verified">
            <article><span>Marca vinculada</span><strong>{cooperative.brand}</strong><small>Directorio D.O.P. Sierra Mágina</small></article>
            <article><span>Estado de la ficha</span><strong>Verificada</strong><small>Datos con fuente trazable</small></article>
          </section>

          <section className="section-block">
            <div className="section-heading"><div><span className="eyebrow">Información</span><h2>Ficha de la cooperativa</h2></div><ShieldCheck size={20} /></div>
            <div className="coop-service-list">
              <button type="button" onClick={() => setTab('aceites')}><ShoppingBag size={20} /><div><strong>Aceites y marcas</strong><span>Consulta los AOVE, formatos y precios de tienda que tengamos verificados.</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTab('precios')}><Euro size={20} /><div><strong>Precios</strong><span>Precio de tienda, referencia oficial de mercado y liquidación al socio claramente separados.</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTab('noticias')}><Newspaper size={20} /><div><strong>Noticias y avisos</strong><span>Actualidad relacionada automáticamente por cooperativa, marca y municipio.</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTab('socios')}><Truck size={20} /><div><strong>Campaña y recepción</strong><span>Comunicados operativos sólo cuando exista una fuente oficial reciente.</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTab('socios')}><UserRoundCheck size={20} /><div><strong>Socios y contacto</strong><span>Teléfono, correo, dirección, atención general y acceso de socios cuando estén publicados.</span></div><ChevronRight size={18} /></button>
            </div>
          </section>
        </>
      )}

      {tab === 'aceites' && (
        <section className="section-block coop-profile-panel">
          <div className="section-heading"><div><span className="eyebrow">Catálogo</span><h2>Aceites de {cooperative.brand}</h2></div><ShoppingBag size={21} /></div>

          {cooperative.products?.length ? (
            <div className="coop-product-grid">
              {cooperative.products.map((product, index) => (
                <article key={`${product.name}-${product.format ?? index}`} className="coop-product-card">
                  <div className="coop-product-card__icon"><PackageOpen size={22} /></div>
                  <div className="coop-product-card__copy">
                    <span>{product.type}</span>
                    <strong>{product.name}</strong>
                    {product.format && <small>{product.format}</small>}
                    {product.storePriceLabel && (
                      <div className="coop-product-card__price">
                        <strong>{product.storePriceLabel}</strong>
                        <span>Precio de tienda · verificado {formatCaptureDate(product.priceCapturedAt)}</span>
                      </div>
                    )}
                    {product.priceSourceUrl && (
                      <a href={product.priceSourceUrl} target="_blank" rel="noreferrer">Ver en tienda <ExternalLink size={13} /></a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className="coop-product-card coop-product-card--primary">
              <div className="coop-product-card__icon"><ShoppingBag size={22} /></div>
              <div><span>Marca D.O.P. Sierra Mágina</span><strong>{cooperative.brand}</strong><small>Los formatos concretos se incorporarán sólo desde una fuente directa o verificada.</small></div>
            </article>
          )}

          {cooperative.productSourceUrl && (
            <a className="coop-document-row" href={cooperative.productSourceUrl} target="_blank" rel="noreferrer">
              <CheckCircle2 size={20} /><div><strong>Fuente del catálogo</strong><span>Consultar información original de los productos</span></div><ExternalLink size={18} />
            </a>
          )}
          {cooperative.officialWebsite && (
            <a className="coop-document-row" href={cooperative.officialWebsite} target="_blank" rel="noreferrer">
              <ExternalLink size={20} /><div><strong>Web de {cooperative.brand}</strong><span>Abrir sitio oficial</span></div><ExternalLink size={18} />
            </a>
          )}
        </section>
      )}

      {tab === 'precios' && (
        <section className="section-block coop-profile-panel coop-price-panel">
          <div className="section-heading"><div><span className="eyebrow">Precios separados</span><h2>Precios del aceite</h2></div><Euro size={21} /></div>

          {storeProducts.length > 0 ? (
            <div className="coop-store-prices">
              <div className="coop-store-prices__head"><ShoppingBag size={18} /><div><span>Venta al público</span><strong>Precios publicados por la tienda</strong></div></div>
              {storeProducts.map((product, index) => (
                <a key={`${product.name}-${product.format ?? index}`} href={product.priceSourceUrl ?? cooperative.productSourceUrl} target="_blank" rel="noreferrer">
                  <div><strong>{product.name}</strong><span>{product.format ?? product.type}</span><small>Capturado {formatCaptureDate(product.priceCapturedAt)}</small></div>
                  <b>{product.storePriceLabel}</b>
                </a>
              ))}
              <small className="coop-store-prices__note">Son precios de venta del producto envasado. Pueden cambiar en la tienda original.</small>
            </div>
          ) : (
            <div className="coop-price-own coop-price-own--shop">
              <span>Precio de tienda de {cooperative.brand}</span>
              <strong>No publicado o no verificado</strong>
              <small>Se incorporará cuando podamos leerlo de una tienda o catálogo oficial con trazabilidad.</small>
            </div>
          )}

          <div className="coop-price-own">
            <span>Liquidación / precio al socio de {cooperative.name}</span>
            <strong>No publicado o no verificado</strong>
            <small>No lo sustituimos por el precio general del mercado ni por el precio de las botellas. Aparecerá aquí sólo si la cooperativa publica el dato o nos autoriza a mostrarlo.</small>
          </div>

          <div className="coop-market-reference">
            <div className="coop-market-reference__head"><div><span>Referencia oficial</span><strong>{market?.market ?? 'Mercado del aceite'}</strong></div><ShieldCheck size={19} /></div>
            {market ? (
              <div className="coop-market-reference__grid">
                {market.series.map((series) => (
                  <article key={series.id}><span>{series.shortLabel}</span><strong>{formatPrice(latestValue(series), market.unit)}</strong></article>
                ))}
              </div>
            ) : <p>Cargando referencia oficial de mercado…</p>}
            {market && <small>{market.periods.at(-1)} · {market.sourceLabel}</small>}
          </div>

          {market && (
            <a className="coop-document-row" href={market.sourceUrl} target="_blank" rel="noreferrer">
              <FileText size={20} /><div><strong>Fuente oficial del mercado</strong><span>Observatorio de Precios y Mercados de la Junta de Andalucía</span></div><ExternalLink size={18} />
            </a>
          )}
        </section>
      )}

      {tab === 'noticias' && (
        <section className="section-block coop-profile-panel">
          <div className="section-heading"><div><span className="eyebrow">Actualidad</span><h2>Noticias relacionadas</h2></div><Newspaper size={21} /></div>
          <p className="coop-profile-intro">Selección automática del feed real por fuente propia, nombre de cooperativa, marca <strong>{cooperative.brand}</strong> y municipio <strong>{cooperative.town}</strong>.</p>
          {directNews && (
            <a className="coop-document-row coop-direct-news" href={directNews.url} target="_blank" rel="noreferrer">
              <Newspaper size={20} /><div><strong>{directNews.label}</strong><span>Abrir la actualidad publicada directamente por la entidad</span></div><ExternalLink size={18} />
            </a>
          )}
          {relatedStories.length ? (
            <div className="coop-related-news">
              {relatedStories.map((story) => (
                <a key={story.id} href={story.url} target="_blank" rel="noreferrer">
                  <div><span>{story.category}</span><strong>{story.title}</strong><small>{story.source}</small></div><ExternalLink size={17} />
                </a>
              ))}
            </div>
          ) : (
            <div className="coop-empty-state"><Newspaper size={22} /><div><strong>Sin noticias recientes verificadas</strong><span>No inventaremos contenido para completar la ficha. Aparecerá automáticamente cuando una fuente del feed mencione esta cooperativa, su marca o municipio.</span></div></div>
          )}
        </section>
      )}

      {tab === 'socios' && (
        <section className="section-block coop-profile-panel coop-members-panel">
          <div className="section-heading"><div><span className="eyebrow">Socios y campaña</span><h2>Información operativa</h2></div><UserRoundCheck size={21} /></div>

          <div className={campaignStories.length ? 'coop-campaign-status coop-campaign-status--active' : 'coop-campaign-status'}>
            <Truck size={21} />
            <div>
              <span>Campaña / recepción de aceituna</span>
              <strong>{campaignStories.length ? 'Hay comunicados oficiales recientes' : 'Sin comunicado operativo reciente conectado'}</strong>
              <small>Los horarios generales de oficina no se usan como horario de recepción de aceituna.</small>
            </div>
          </div>

          {campaignStories.length > 0 && (
            <div className="coop-campaign-news">
              {campaignStories.map((story) => (
                <a key={story.id} href={story.url} target="_blank" rel="noreferrer">
                  <div><span>{story.source}</span><strong>{story.title}</strong></div><ExternalLink size={17} />
                </a>
              ))}
            </div>
          )}

          {operations ? (
            <div className="coop-contact-card">
              <div className="coop-contact-card__title"><ShieldCheck size={18} /><div><span>Contacto publicado</span><strong>{cooperative.name}</strong></div></div>
              {operations.address && <div className="coop-contact-row"><MapPin size={17} /><span>{operations.address}</span></div>}
              {operations.phones?.map((phone) => (
                <a className="coop-contact-row" href={`tel:${phone.replace(/[^0-9+]/g, '')}`} key={phone}><Phone size={17} /><span>{phone}</span></a>
              ))}
              {operations.emails?.map((email) => (
                <a className="coop-contact-row" href={`mailto:${email.value}`} key={email.value}><Mail size={17} /><span><small>{email.label}</small>{email.value}</span></a>
              ))}
              {operations.publicHours?.length ? (
                <div className="coop-contact-hours">
                  <Clock3 size={17} />
                  <div><strong>Horario general publicado</strong>{operations.publicHours.map((hours) => <span key={hours}>{hours}</span>)}<small>No equivale al horario de recepción de campaña.</small></div>
                </div>
              ) : null}
              {operations.memberAccessUrl && (
                <a className="coop-member-access" href={operations.memberAccessUrl} target="_blank" rel="noreferrer"><UserRoundCheck size={18} /><div><strong>Acceso de socios</strong><span>Abrir plataforma externa de la cooperativa</span></div><ExternalLink size={17} /></a>
              )}
              <a className="coop-document-row" href={operations.contactSourceUrl} target="_blank" rel="noreferrer"><CheckCircle2 size={19} /><div><strong>Fuente oficial de contacto</strong><span>Comprobar los datos en la web de la entidad</span></div><ExternalLink size={17} /></a>
            </div>
          ) : (
            <div className="coop-empty-state"><UserRoundCheck size={22} /><div><strong>Contacto operativo aún no incorporado</strong><span>La ficha D.O.P. está verificada, pero teléfono, correo, horario o acceso de socios sólo aparecerán cuando tengamos una fuente directa de la propia entidad.</span></div></div>
          )}
        </section>
      )}

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Fuente</span><h2>Trazabilidad de la ficha</h2></div></div>
        <a className="coop-document-row" href={cooperative.sourceUrl} target="_blank" rel="noreferrer">
          <FileText size={20} />
          <div><strong>{cooperative.sourceLabel}</strong><span>Consulta el directorio original</span></div>
          <ExternalLink size={18} />
        </a>
      </section>

      <section className="section-block section-block--last">
        <div className="coop-source-note"><ShieldCheck size={16} /><span>Mágina Olivo distingue entre precio de tienda, referencia general de mercado, liquidación al socio, horario general y horario de campaña. Los datos operativos sólo se muestran desde fuentes oficiales o autorizadas.</span></div>
      </section>
    </section>
  );
}
