import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import './catastro-ui-lab.css';

type SearchMode = 'point' | 'reference' | 'nearby';
type LabStage = 'locate' | 'review' | 'confirm' | 'done';
type MapPoint = { x: number; y: number };
type NearbyCandidate = {
  reference: string;
  polygon: string;
  parcel: string;
  areaHa: string;
  difference: string;
};

const SAMPLE_REFERENCE = '23012A01800042';
const DEFAULT_POINT: MapPoint = { x: 402, y: 282 };
const NEARBY_CANDIDATES: NearbyCandidate[] = [
  { reference: '23012A01800042', polygon: '18', parcel: '42', areaHa: '3,38', difference: '1,2 %' },
  { reference: '23012A01800041', polygon: '18', parcel: '41', areaHa: '2,91', difference: '14,9 %' },
  { reference: '23012A01800043', polygon: '18', parcel: '43', areaHa: '4,07', difference: '19,0 %' },
];

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

function normalizeReference(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function isValidReference(value: string): boolean {
  return /^(?:[A-Z0-9]{14}|[A-Z0-9]{18}|[A-Z0-9]{20})$/.test(normalizeReference(value));
}

function parcelReference(value: string): string {
  return normalizeReference(value).slice(0, 14);
}

function OliveMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="catastro-lab-mark">
      <path d="M37 7c9 6 13 17 9 27-4 10-15 17-27 14 2-11 8-22 18-29" />
      <path d="M19 48c7-12 15-22 27-31" />
    </svg>
  );
}

function MapMock({
  stage,
  interactive = false,
  selectedPoint,
  onSelectPoint,
}: {
  stage: LabStage;
  interactive?: boolean;
  selectedPoint?: MapPoint | null;
  onSelectPoint?: (point: MapPoint) => void;
}) {
  const active = stage !== 'locate' || Boolean(selectedPoint);
  const pin = selectedPoint ?? DEFAULT_POINT;

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    if (!interactive || !onSelectPoint) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(760, (event.clientX - bounds.left) / bounds.width * 760));
    const y = Math.max(0, Math.min(420, (event.clientY - bounds.top) / bounds.height * 420));
    onSelectPoint({ x, y });
  }

  function selectFromKeyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (!interactive || !onSelectPoint || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onSelectPoint(DEFAULT_POINT);
  }

  return (
    <div className={`catastro-lab-map${interactive ? ' interactive' : ''}`}>
      <svg
        viewBox="0 0 760 420"
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? 'Mapa simulado. Toca o pulsa Intro para marcar un punto dentro de tu olivar.' : 'Parcelas catastrales simuladas sobre olivar'}
        onPointerDown={selectFromPointer}
        onKeyDown={selectFromKeyboard}
      >
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
        {active ? (
          <g transform={`translate(${pin.x} ${pin.y})`} className="catastro-lab-pin active" aria-hidden="true">
            <circle r="17" fill="#fff8df" stroke="#173d2e" strokeWidth="5" />
            <circle r="5" fill="#173d2e" />
          </g>
        ) : null}
      </svg>
      <div className="catastro-lab-map-topbar">
        <span className="catastro-lab-source-chip">Catastro · DGC</span>
        <button type="button" className="catastro-lab-map-control" aria-label="Centrar mapa" onClick={() => onSelectPoint?.(DEFAULT_POINT)}>◎</button>
      </div>
      {interactive ? (
        <div className={`catastro-lab-map-hint${selectedPoint ? ' selected' : ''}`} role="status">
          {selectedPoint ? '✓ Punto marcado · puedes continuar' : 'Toca dentro de tu parcela'}
        </div>
      ) : null}
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
          <li key={label} className={`catastro-lab-step ${state}`} aria-current={state === 'active' ? 'step' : undefined}>
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
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [point, setPoint] = useState<MapPoint | null>(null);
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyCandidate, setNearbyCandidate] = useState<NearbyCandidate>(NEARBY_CANDIDATES[0]!);
  const [showMore, setShowMore] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const normalizedReference = normalizeReference(reference);
  const referenceValid = isValidReference(reference);
  const resultReference = mode === 'reference'
    ? parcelReference(reference)
    : mode === 'nearby'
      ? nearbyCandidate.reference
      : SAMPLE_REFERENCE;
  const resultParcel = mode === 'nearby' ? nearbyCandidate.parcel : '42';
  const resultPolygon = mode === 'nearby' ? nearbyCandidate.polygon : '18';
  const resultArea = mode === 'nearby' ? nearbyCandidate.areaHa : '3,38';
  const resultDifference = mode === 'nearby' ? nearbyCandidate.difference : '1,2 %';

  const actionLabel = useMemo(() => {
    if (mode === 'point') return point ? 'Buscar parcela en este punto' : 'Marca un punto en el mapa';
    if (mode === 'reference') return 'Buscar referencia';
    return showNearby ? 'Actualizar búsqueda cercana' : 'Buscar parcelas cercanas';
  }, [mode, point, showNearby]);

  const locateDisabled = mode === 'point'
    ? !point
    : mode === 'reference'
      ? !referenceValid
      : false;

  function changeMode(nextMode: SearchMode) {
    setMode(nextMode);
    setShowNearby(false);
    setReferenceTouched(false);
    setConfirmed(false);
  }

  function runLocate() {
    if (mode === 'reference') {
      setReferenceTouched(true);
      if (!referenceValid) return;
      setStage('review');
      return;
    }
    if (mode === 'point') {
      if (!point) return;
      setStage('review');
      return;
    }
    setShowNearby(true);
  }

  function chooseNearby(candidate: NearbyCandidate) {
    setNearbyCandidate(candidate);
    setStage('review');
  }

  function reset() {
    setStage('locate');
    setShowMore(false);
    setConfirmed(false);
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
                    onClick={() => changeMode(key)}
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
                <div className={`catastro-lab-reference-field${referenceTouched && !referenceValid ? ' invalid' : referenceValid ? ' valid' : ''}`}>
                  <label htmlFor="lab-reference">Referencia catastral</label>
                  <input
                    id="lab-reference"
                    value={reference}
                    onChange={(event) => {
                      setReference(event.target.value.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase());
                      setReferenceTouched(true);
                    }}
                    onBlur={() => setReferenceTouched(true)}
                    maxLength={22}
                    spellCheck={false}
                    autoCapitalize="characters"
                    autoComplete="off"
                    aria-invalid={referenceTouched && !referenceValid}
                    aria-describedby="lab-reference-help"
                  />
                  <small id="lab-reference-help">
                    {referenceTouched && !referenceValid
                      ? 'Revisa la referencia: debe contener 14, 18 o 20 caracteres alfanuméricos.'
                      : referenceValid
                        ? `✓ Referencia válida · parcela ${parcelReference(reference)}`
                        : 'Admite referencias de 14, 18 o 20 caracteres.'}
                  </small>
                </div>
              ) : null}

              {mode === 'point' ? (
                <div className="catastro-lab-instruction">
                  <span className="catastro-lab-instruction-icon">1</span>
                  <div>
                    <strong>{point ? 'Punto seleccionado' : 'Toca dentro del terreno'}</strong>
                    <span>{point ? 'Puedes moverlo tocando otra zona del mapa antes de buscar.' : 'El punto solo sirve para encontrar la parcela oficial que lo contiene.'}</span>
                  </div>
                </div>
              ) : null}

              {mode === 'nearby' ? (
                <div className="catastro-lab-instruction">
                  <span className="catastro-lab-instruction-icon">⌖</span>
                  <div><strong>Usaremos Parcela Norte</strong><span>3,42 ha · Bedmar · punto y perímetro disponibles.</span></div>
                </div>
              ) : null}

              <button type="button" className="catastro-lab-primary" onClick={runLocate} disabled={locateDisabled}>
                {actionLabel}<span aria-hidden="true">→</span>
              </button>

              {mode === 'nearby' && showNearby ? (
                <div className="catastro-lab-nearby" aria-live="polite">
                  <div className="catastro-lab-nearby-heading">
                    <strong>3 parcelas encontradas</strong>
                    <span>Elige la que reconoces por número, superficie y posición.</span>
                  </div>
                  {NEARBY_CANDIDATES.map((candidate, index) => (
                    <button key={candidate.reference} type="button" className="catastro-lab-candidate" onClick={() => chooseNearby(candidate)}>
                      <span className="catastro-lab-candidate-number">{index + 1}</span>
                      <span><strong>Pol. {candidate.polygon} · Parc. {candidate.parcel}</strong><small>{candidate.reference}</small></span>
                      <span className="catastro-lab-candidate-area"><strong>{candidate.areaHa} ha</strong><small>dif. {candidate.difference}</small></span>
                    </button>
                  ))}
                </div>
              ) : null}

              <p className="catastro-lab-fineprint">Consulta oficial a la Dirección General del Catastro. Catastro y SIGPAC pueden mostrar límites y superficies diferentes.</p>
            </section>

            <section className="catastro-lab-map-column">
              <MapMock
                stage={stage}
                interactive={mode === 'point'}
                selectedPoint={point}
                onSelectPoint={mode === 'point' ? setPoint : undefined}
              />
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
              <MapMock stage={stage} selectedPoint={point} />
              <button type="button" className="catastro-lab-backlink" onClick={reset}>← Cambiar búsqueda</button>
            </section>

            <section className="catastro-lab-result-card" aria-labelledby="catastro-result-title">
              <div className="catastro-lab-result-status"><span>✓</span> Parcela encontrada</div>
              <p className="catastro-lab-eyebrow">Datos oficiales · Catastro</p>
              <h2 id="catastro-result-title">Parcela {resultParcel} · Polígono {resultPolygon}</h2>
              <div className="catastro-lab-reference">{resultReference}</div>

              <dl className="catastro-lab-facts">
                <div><dt>Superficie Catastro</dt><dd>{resultArea} ha</dd></div>
                <div><dt>Mi Campo</dt><dd>3,42 ha</dd></div>
                <div><dt>Diferencia</dt><dd className="soft-warning">{mode === 'nearby' ? `aprox. ${resultDifference}` : '0,04 ha · 1,2 %'}</dd></div>
                <div><dt>Geometría</dt><dd>Polígono simple</dd></div>
              </dl>

              {mode === 'reference' && normalizedReference.length > 14 ? (
                <div className="catastro-lab-reference-note">Has introducido una RC completa. Para el perímetro, Mágina trabajará con la referencia de parcela de 14 caracteres: <strong>{resultReference}</strong>.</div>
              ) : null}

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

              <button type="button" className="catastro-lab-primary" onClick={() => { setConfirmed(false); setStage('confirm'); }}>Usar este perímetro<span>→</span></button>
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
              <div className="selected"><small>Después</small><strong>{resultArea} ha</strong><span>Catastro verificado</span></div>
            </div>
            <label className="catastro-lab-check">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>He revisado la parcela <strong>{resultReference}</strong> y quiero usar este perímetro.</span>
            </label>
            <p className="catastro-lab-confirm-help">La confirmación es obligatoria. En el flujo real, después de pulsar confirmar el servidor consultará Catastro de nuevo antes de guardar.</p>
            <div className="catastro-lab-confirm-actions">
              <button type="button" className="catastro-lab-secondary" onClick={() => setStage('review')}>Volver</button>
              <button type="button" className="catastro-lab-primary" disabled={!confirmed} onClick={() => setStage('done')}>Confirmar perímetro</button>
            </div>
          </section>
        ) : null}

        {stage === 'done' ? (
          <section className="catastro-lab-success-card" aria-live="polite">
            <div className="catastro-lab-success-mark">✓</div>
            <p className="catastro-lab-eyebrow">Parcela actualizada</p>
            <h2>Catastro está vinculado a Parcela Norte</h2>
            <p>La referencia y el perímetro oficial quedan guardados con su procedencia y fecha de comprobación.</p>
            <div className="catastro-lab-success-summary">
              <span><small>Referencia</small><strong>{resultReference}</strong></span>
              <span><small>Superficie</small><strong>{resultArea} ha</strong></span>
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
