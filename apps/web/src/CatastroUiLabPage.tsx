import { useMemo, useState } from 'react';
import './catastro-ui-lab.css';

type SearchMode = 'point' | 'reference' | 'nearby';
type LabStage = 'locate' | 'review' | 'confirm' | 'done';

const SAMPLE_REFERENCE = '23012A01800042';

const modeCopy: Record<SearchMode, { title: string; description: string; kicker: string }> = {
  point: {
    kicker: 'Recomendado',
    title: 'Señalar en el mapa',
    description: 'Toca dentro de tu olivar y Mágina identifica la parcela catastral que contiene ese punto.',
  },
  reference: {
    kicker: 'Si conoces la RC',
    title: 'Referencia catastral',
    description: 'Introduce una referencia de 14, 18 o 20 caracteres para localizar directamente la parcela.',
  },
  nearby: {
    kicker: 'Alternativa',
    title: 'Buscar alrededor',
    description: 'Usa la localización de tu parcela de trabajo y muestra las parcelas catastrales próximas.',
  },
};

function OliveMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="catastro-lab-mark">
      <path d="M37 7c9 6 13 17 9 27-4 10-15 17-27 14 2-11 8-22 18-29" />
      <path d="M19 48c7-12 15-22 27-31" />
    </svg>
  );
}

function MapMock({ stage }: { stage: LabStage }) {
  const active = stage !== 'locate';
  return (
    <div className="catastro-lab-map" aria-label="Vista simulada del mapa catastral">
      <svg viewBox="0 0 760 420" role="img" aria-label="Parcelas catastrales simuladas sobre olivar">
        <defs>
          <linearGradient id="field-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b9465" />
            <stop offset="1" stopColor="#56653c" />
          </linearGradient>
          <linearGradient id="field-b" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a6aa7b" />
            <stop offset="1" stopColor="#69754d" />
          </linearGradient>
          <pattern id="olive-dots" width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="3" fill="#364424" opacity="0.72" />
            <circle cx="25" cy="23" r="3" fill="#364424" opacity="0.58" />
          </pattern>
        </defs>
        <rect width="760" height="420" fill="#ddd7b9" />
        <path d="M0 30L220 0l120 118-84 118L0 198Z" fill="url(#field-b)" />
        <path d="M220 0h290l-2 155-168-37Z" fill="url(#field-a)" />
        <path d="M508 0h252v172l-252-17Z" fill="#788557" />
        <path d="M0 198l256 38 25 184H0Z" fill="#6e7c4e" />
        <path d="M256 236l252-81 77 265H281Z" fill="url(#field-a)" />
        <path d="M508 155l252 17v248H585Z" fill="url(#field-b)" />
        <rect width="760" height="420" fill="url(#olive-dots)" opacity="0.48" />
        <path d="M-15 295C175 268 347 285 777 225" fill="none" stroke="#e4d8b6" strokeWidth="18" opacity="0.9" />
        <path d="M342 -10C380 110 389 236 350 440" fill="none" stroke="#e9debf" strokeWidth="10" opacity="0.82" />

        <g fill="none" stroke="#fff7d9" strokeWidth="2" opacity="0.82">
          <path d="M17 50L212 18l111 101-77 100-211-31Z" />
          <path d="M235 20h254l-2 119-147-32Z" />
          <path d="M526 19h216v135l-220-15Z" />
          <path d="M20 217l221 33 20 151H20Z" />
          <path d="M276 248l213-69 68 222H298Z" />
          <path d="M528 177l213 14v210H596Z" />
        </g>

        <path
          className={active ? 'catastro-lab-selected-shape active' : 'catastro-lab-selected-shape'}
          d="M276 248l213-69 68 222H298Z"
          fill={active ? 'rgba(241, 185, 54, 0.26)' : 'rgba(255,255,255,0.05)'}
          stroke={active ? '#f4c45b' : 'rgba(255,255,255,0.65)'}
          strokeWidth={active ? '6' : '3'}
        />
        <g transform="translate(402 282)" className={active ? 'catastro-lab-pin active' : 'catastro-lab-pin'}>
          <circle r="17" fill="#fff8df" stroke="#173d2e" strokeWidth="5" />
          <circle r="5" fill="#173d2e" />
        </g>
      </svg>
      <div className="catastro-lab-map-topbar">
        <span className="catastro-lab-source-chip">Catastro · DGC</span>
        <button type="button" className="catastro-lab-map-control" aria-label="Centrar mapa">◎</button>
      </div>
      <div className="catastro-lab-map-scale">50 m</div>
    </div>
  );
}

function Stepper({ stage }: { stage: LabStage }) {
  const step = stage === 'locate' ? 1 : stage === 'review' ? 2 : 3;
  return (
    <ol className="catastro-lab-stepper" aria-label="Proceso para añadir una parcela catastral">
      {['Localizar', 'Revisar', 'Añadir'].map((label, index) => {
        const number = index + 1;
        const state = number < step ? 'done' : number === step ? 'active' : 'pending';
        return (
          <li key={label} className={`catastro-lab-step ${state}`}>
            <span>{state === 'done' ? '✓' : number}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

export function CatastroUiLabPage() {
  const [mode, setMode] = useState<SearchMode>('point');
  const [stage, setStage] = useState<LabStage>('locate');
  const [reference, setReference] = useState(SAMPLE_REFERENCE);
  const [showMore, setShowMore] = useState(false);

  const actionLabel = useMemo(() => {
    if (mode === 'point') return 'Usar este punto';
    if (mode === 'reference') return 'Buscar referencia';
    return 'Buscar parcelas cercanas';
  }, [mode]);

  function reset() {
    setStage('locate');
    setShowMore(false);
  }

  return (
    <main className="catastro-lab-page">
      <header className="catastro-lab-header">
        <a className="catastro-lab-brand" href="/" aria-label="Volver a Mágina Olivo">
          <OliveMark />
          <span><strong>Mágina</strong><small>Olivo</small></span>
        </a>
        <div className="catastro-lab-badge">LAB · no producción</div>
      </header>

      <section className="catastro-lab-shell">
        <div className="catastro-lab-heading">
          <div>
            <p className="catastro-lab-eyebrow">Mi Campo · Parcela Norte</p>
            <h1>Encuentra tu parcela en Catastro</h1>
            <p>Elige la forma más fácil de localizarla. No guardaremos nada hasta que revises y confirmes el perímetro.</p>
          </div>
          <Stepper stage={stage} />
        </div>

        {stage === 'locate' ? (
          <div className="catastro-lab-layout">
            <section className="catastro-lab-panel">
              <div className="catastro-lab-mode-grid" role="radiogroup" aria-label="Forma de localizar la parcela">
                {(Object.keys(modeCopy) as SearchMode[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={mode === key}
                    className={`catastro-lab-mode${mode === key ? ' selected' : ''}`}
                    onClick={() => setMode(key)}
                  >
                    <span className="catastro-lab-mode-radio" aria-hidden="true" />
                    <span className="catastro-lab-mode-copy">
                      <small>{modeCopy[key].kicker}</small>
                      <strong>{modeCopy[key].title}</strong>
                      <span>{modeCopy[key].description}</span>
                    </span>
                  </button>
                ))}
              </div>

              {mode === 'reference' ? (
                <div className="catastro-lab-reference-field">
                  <label htmlFor="lab-reference">Referencia catastral</label>
                  <input
                    id="lab-reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value.toUpperCase())}
                    maxLength={20}
                    spellCheck={false}
                  />
                  <small>Admite referencias de 14, 18 o 20 caracteres.</small>
                </div>
              ) : null}

              {mode === 'point' ? (
                <div className="catastro-lab-instruction">
                  <span className="catastro-lab-instruction-icon">1</span>
                  <div><strong>Toca dentro del terreno</strong><span>El punto solo sirve para encontrar la parcela oficial que lo contiene.</span></div>
                </div>
              ) : null}

              {mode === 'nearby' ? (
                <div className="catastro-lab-instruction">
                  <span className="catastro-lab-instruction-icon">⌖</span>
                  <div><strong>Usaremos Parcela Norte</strong><span>3,42 ha · Bedmar · punto y perímetro disponibles.</span></div>
                </div>
              ) : null}

              <button type="button" className="catastro-lab-primary" onClick={() => setStage('review')}>
                {actionLabel}<span aria-hidden="true">→</span>
              </button>
              <p className="catastro-lab-fineprint">Consulta oficial a la Dirección General del Catastro. Catastro y SIGPAC pueden mostrar límites y superficies diferentes.</p>
            </section>

            <section className="catastro-lab-map-column">
              <MapMock stage={stage} />
              <div className="catastro-lab-map-caption">
                <span><i className="dot work" />Mi parcela de trabajo</span>
                <span><i className="dot cadastre" />Parcela Catastro</span>
              </div>
            </section>
          </div>
        ) : null}

        {stage === 'review' ? (
          <div className="catastro-lab-layout review">
            <section className="catastro-lab-map-column">
              <MapMock stage={stage} />
              <button type="button" className="catastro-lab-backlink" onClick={reset}>← Cambiar búsqueda</button>
            </section>

            <section className="catastro-lab-result-card" aria-labelledby="catastro-result-title">
              <div className="catastro-lab-result-status"><span>✓</span> Parcela encontrada</div>
              <p className="catastro-lab-eyebrow">Datos oficiales · Catastro</p>
              <h2 id="catastro-result-title">Parcela 42 · Polígono 18</h2>
              <div className="catastro-lab-reference">{SAMPLE_REFERENCE}</div>

              <dl className="catastro-lab-facts">
                <div><dt>Superficie Catastro</dt><dd>3,38 ha</dd></div>
                <div><dt>Mi Campo</dt><dd>3,42 ha</dd></div>
                <div><dt>Diferencia</dt><dd className="soft-warning">0,04 ha · 1,2 %</dd></div>
                <div><dt>Geometría</dt><dd>Polígono simple</dd></div>
              </dl>

              <button type="button" className="catastro-lab-disclosure" onClick={() => setShowMore((value) => !value)} aria-expanded={showMore}>
                {showMore ? 'Ocultar detalles oficiales' : 'Ver detalles oficiales'}<span>{showMore ? '−' : '+'}</span>
              </button>
              {showMore ? (
                <div className="catastro-lab-details">
                  <span>Fuente: Dirección General del Catastro</span>
                  <span>Servicio: INSPIRE Cadastral Parcel · WFS</span>
                  <span>Última consulta: ahora · datos no protegidos</span>
                </div>
              ) : null}

              <div className="catastro-lab-info-box">
                <strong>Antes de añadir</strong>
                <span>Mágina volverá a comprobar esta referencia directamente en Catastro. No usaremos una geometría enviada por el navegador.</span>
              </div>

              <button type="button" className="catastro-lab-primary" onClick={() => setStage('confirm')}>Usar este perímetro<span>→</span></button>
              <button type="button" className="catastro-lab-secondary" onClick={reset}>No es mi parcela</button>
            </section>
          </div>
        ) : null}

        {stage === 'confirm' ? (
          <section className="catastro-lab-confirm-card">
            <div className="catastro-lab-confirm-icon">⌁</div>
            <p className="catastro-lab-eyebrow">Confirmación final</p>
            <h2>¿Sustituir el perímetro de Parcela Norte?</h2>
            <p>Guardaremos el límite oficial de Catastro como perímetro de trabajo y conservaremos la referencia y la fecha de verificación.</p>
            <div className="catastro-lab-compare">
              <div><small>Ahora</small><strong>3,42 ha</strong><span>Perímetro manual</span></div>
              <span className="catastro-lab-arrow">→</span>
              <div className="selected"><small>Después</small><strong>3,38 ha</strong><span>Catastro verificado</span></div>
            </div>
            <label className="catastro-lab-check"><input type="checkbox" defaultChecked /><span>He revisado la parcela y quiero usar este perímetro.</span></label>
            <div className="catastro-lab-confirm-actions">
              <button type="button" className="catastro-lab-secondary" onClick={() => setStage('review')}>Volver</button>
              <button type="button" className="catastro-lab-primary" onClick={() => setStage('done')}>Confirmar perímetro</button>
            </div>
          </section>
        ) : null}

        {stage === 'done' ? (
          <section className="catastro-lab-success-card">
            <div className="catastro-lab-success-mark">✓</div>
            <p className="catastro-lab-eyebrow">Parcela actualizada</p>
            <h2>Catastro está vinculado a Parcela Norte</h2>
            <p>La referencia y el perímetro oficial quedan guardados con su procedencia y fecha de comprobación.</p>
            <div className="catastro-lab-success-summary">
              <span><small>Referencia</small><strong>{SAMPLE_REFERENCE}</strong></span>
              <span><small>Superficie</small><strong>3,38 ha</strong></span>
              <span><small>Fuente</small><strong>Catastro · DGC</strong></span>
            </div>
            <div className="catastro-lab-confirm-actions">
              <button type="button" className="catastro-lab-secondary" onClick={reset}>Probar otra vez</button>
              <a className="catastro-lab-primary link" href="/">Volver a Mi Campo</a>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
