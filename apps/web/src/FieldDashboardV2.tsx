import type { ReactNode } from 'react';
import type { Farm, Holding, Plot } from './api';
import { appHref } from './publicNavigation';

type FieldDashboardV2Props = {
  holdings: Holding[];
  selectedHolding: Holding | null;
  farms: Farm[];
  selectedFarm: Farm | null;
  selectedFarmId: string;
  plots: Plot[];
  setSelectedFarmId: (id: string) => void;
  onNavigate: (tab: 'campaign') => void;
  createHolding: ReactNode;
  createFarm: ReactNode;
  createPlot: ReactNode;
  notebook: ReactNode;
};

function numberLabel(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value);
}

function irrigationLabel(value: string | null): string {
  if (value === 'dryland') return 'Secano';
  if (value === 'irrigated') return 'Regadío';
  if (value === 'mixed') return 'Mixto';
  return 'Sin definir';
}

export function FieldDashboardV2({
  holdings,
  selectedHolding,
  farms,
  selectedFarm,
  selectedFarmId,
  plots,
  setSelectedFarmId,
  onNavigate,
  createHolding,
  createFarm,
  createPlot,
  notebook,
}: FieldDashboardV2Props) {
  const totalArea = farms.reduce((sum, farm) => sum + Number(farm.areaHa ?? 0), 0);
  const totalOlives = plots.reduce((sum, plot) => sum + (plot.oliveTreeCount ?? 0), 0);
  const sigpacPlots = plots.filter((plot) => Boolean(plot.sigpacReference)).length;
  const place = [selectedHolding?.municipality, selectedHolding?.province].filter(Boolean).join(' · ') || 'Sierra Mágina · Jaén';

  return (
    <div className="field-dashboard-v2">
      <section className="field-v2-hero" aria-labelledby="field-v2-title">
        <div className="field-v2-hero-copy">
          <span className="field-v2-kicker">Finca activa</span>
          <h1 id="field-v2-title">{selectedHolding?.name ?? 'Mi Campo'}</h1>
          <p>{place}</p>
        </div>
        <dl className="field-v2-hero-metrics">
          <div><dt>Superficie</dt><dd>{totalArea > 0 ? `${numberLabel(totalArea)} ha` : '—'}</dd></div>
          <div><dt>Fincas</dt><dd>{farms.length}</dd></div>
          <div><dt>Parcelas</dt><dd>{plots.length}</dd></div>
          <div><dt>Olivos</dt><dd>{totalOlives > 0 ? numberLabel(totalOlives, 0) : '—'}</dd></div>
        </dl>
      </section>

      <nav className="field-v2-tabs" aria-label="Secciones de Mi Campo">
        <a className="field-v2-tab active" href="#field-farms" aria-current="page">Campo</a>
        <a className="field-v2-tab" href="#field-notebook-title">Cuaderno</a>
        <button className="field-v2-tab" type="button" onClick={() => onNavigate('campaign')}>Campaña</button>
        <a className="field-v2-tab" href={appHref('/calendario')}>Tareas</a>
      </nav>

      {holdings.length === 0 ? (
        <section className="field-v2-empty-intro">
          <p className="eyebrow page-eyebrow">Mi Campo</p>
          <h2 className="section-title">Crea tu explotación</h2>
          <p className="section-copy">La explotación será la raíz privada de tus fincas, parcelas, campañas y documentos.</p>
          {createHolding}
        </section>
      ) : null}

      {selectedHolding ? (
        <section className="field-v2-section" id="field-farms" aria-labelledby="field-farms-title">
          <div className="field-v2-section-heading">
            <div>
              <span className="eyebrow page-eyebrow">Mi Campo</span>
              <h2 id="field-farms-title">Fincas</h2>
              <p>{place}</p>
            </div>
            <span className="field-v2-count">{farms.length}</span>
          </div>

          <div className="field-v2-farm-list">
            {farms.map((farm) => {
              const active = farm.id === selectedFarmId;
              return (
                <button
                  key={farm.id}
                  type="button"
                  className={`field-v2-farm-row${active ? ' active' : ''}`}
                  onClick={() => setSelectedFarmId(farm.id)}
                  aria-pressed={active}
                >
                  <span className="field-v2-farm-symbol" aria-hidden="true">⌁</span>
                  <span className="field-v2-farm-copy">
                    <strong>{farm.name}</strong>
                    <small>{farm.areaHa ? `${numberLabel(Number(farm.areaHa))} ha` : 'Superficie pendiente'}{farm.description ? ` · ${farm.description}` : ''}</small>
                  </span>
                  <span className={`badge${active ? ' gold' : ''}`}>{active ? 'Activa' : 'Ver'}</span>
                </button>
              );
            })}
          </div>

          {!farms.length ? (
            <div className="card empty-state field-v2-empty-card">
              <strong>Añade tu primera finca</strong>
              Después podrás dividirla en parcelas y construir su histórico.
            </div>
          ) : null}

          <div className="field-v2-create-slot">{createFarm}</div>
        </section>
      ) : null}

      {selectedFarm && selectedHolding ? (
        <>
          <section className="field-v2-section" id="field-parcels" aria-labelledby="field-parcels-title">
            <div className="field-v2-section-heading">
              <div>
                <span className="eyebrow page-eyebrow">Parcelas</span>
                <h2 id="field-parcels-title">{selectedFarm.name}</h2>
                <p>{plots.length} parcela{plots.length === 1 ? '' : 's'} · {sigpacPlots} con referencia SIGPAC</p>
              </div>
              <span className="field-v2-count">{plots.length}</span>
            </div>

            <div className="field-v2-plot-grid">
              {plots.map((plot) => (
                <article className="field-v2-plot-card" key={plot.id}>
                  <div className="field-v2-plot-topline">
                    <span className="field-v2-plot-symbol" aria-hidden="true">◒</span>
                    <span className={`badge${plot.sigpacReference ? ' gold' : ''}`}>{plot.sigpacReference ? 'SIGPAC' : 'Manual'}</span>
                  </div>
                  <h3>{plot.name}</h3>
                  <p>{plot.areaHa ? `${numberLabel(Number(plot.areaHa))} ha` : 'Superficie pendiente'} · {irrigationLabel(plot.irrigationType)}</p>
                  <dl>
                    <div><dt>Olivos</dt><dd>{plot.oliveTreeCount ?? '—'}</dd></div>
                    <div><dt>Referencia</dt><dd>{plot.sigpacReference || 'Sin asignar'}</dd></div>
                  </dl>
                </article>
              ))}
            </div>

            {!plots.length ? (
              <div className="card empty-state field-v2-empty-card">
                <strong>Sin parcelas todavía</strong>
                Añade una parcela para activar mapa, cuaderno e historia.
              </div>
            ) : null}

            <div className="field-v2-create-slot">{createPlot}</div>
          </section>

          <div className="field-v2-notebook-slot">{notebook}</div>
        </>
      ) : null}
    </div>
  );
}
