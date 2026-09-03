import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BellRing,
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronRight,
  Euro,
  ExternalLink,
  FileText,
  MapPin,
  Newspaper,
  PackageOpen,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
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

type DetailTab = 'resumen' | 'aceites' | 'precios' | 'noticias';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function formatPrice(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
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
      const haystack = normalize(`${story.title} ${story.excerpt} ${story.source}`);
      return haystack.includes(brand) || (name.length > 6 && haystack.includes(name)) || haystack.includes(town);
    }).slice(0, 8);
  }, [cooperative, stories]);

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
              <button type="button" onClick={() => setTab('aceites')}><ShoppingBag size={20} /><div><strong>Aceites y marcas</strong><span>Consulta los AOVE y formatos que tengamos verificados para esta cooperativa.</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTab('precios')}><Euro size={20} /><div><strong>Precios</strong><span>Referencia oficial de mercado y, cuando exista, dato propio publicado por la cooperativa.</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTab('noticias')}><Newspaper size={20} /><div><strong>Noticias y avisos</strong><span>Actualidad relacionada automáticamente por cooperativa, marca y municipio.</span></div><ChevronRight size={18} /></button>
              <article><Truck size={20} /><div><strong>Campaña y recepción</strong><span>Preparado para horarios, recepción, cierres y servicios cuando exista una fuente directa actualizada.</span></div><ChevronRight size={18} /></article>
              <article><BellRing size={20} /><div><strong>Avisos al socio</strong><span>Podremos incorporar documentación, recepción, servicios y comunicados con fecha y fuente.</span></div><ChevronRight size={18} /></article>
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
                  <div><span>{product.type}</span><strong>{product.name}</strong>{product.format && <small>{product.format}</small>}</div>
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
          <div className="section-heading"><div><span className="eyebrow">Referencia</span><h2>Precios del aceite</h2></div><Euro size={21} /></div>
          <div className="coop-price-own">
            <span>Precio propio / liquidación de {cooperative.name}</span>
            <strong>No publicado o no verificado</strong>
            <small>No lo sustituimos por el precio general del mercado. Aparecerá aquí sólo si la cooperativa publica el dato o nos autoriza a mostrarlo.</small>
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
          <p className="coop-profile-intro">Selección automática del feed real por nombre de cooperativa, marca <strong>{cooperative.brand}</strong> y municipio <strong>{cooperative.town}</strong>.</p>
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

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Fuente</span><h2>Trazabilidad de la ficha</h2></div></div>
        <a className="coop-document-row" href={cooperative.sourceUrl} target="_blank" rel="noreferrer">
          <FileText size={20} />
          <div><strong>{cooperative.sourceLabel}</strong><span>Consulta el directorio original</span></div>
          <ExternalLink size={18} />
        </a>
      </section>

      <section className="section-block section-block--last">
        <div className="coop-source-note"><ShieldCheck size={16} /><span>Mágina Olivo distingue siempre entre referencia general de mercado y datos propios de cada cooperativa. No mostraremos liquidaciones, precios, horarios o estados operativos como reales sin fuente oficial o autorizada.</span></div>
      </section>
    </section>
  );
}
