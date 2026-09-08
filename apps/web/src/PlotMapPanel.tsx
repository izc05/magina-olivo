import { useEffect, useState } from 'react';
import { request } from './api';
import { ParcelRegistration } from './ParcelRegistration';
import { CatastroParcelPanel } from './CatastroParcelPanel.tsx';
import { ParcelSourceComparisonPanel } from './ParcelSourceComparisonPanel.tsx';
import { PlotMapPanel as PlotMapEditor } from './PlotMapEditor.tsx';
import { SigpacRecintoPanel } from './SigpacRecintoPanel.tsx';

export function PlotMapPanel({ farmId }: { farmId: string }) {
  return <ParcelWorkspace key={farmId} farmId={farmId} />;
}

function ParcelWorkspace({ farmId }: { farmId: string }) {
  const [mapRevision, setMapRevision] = useState(0);
  const [plots, setPlots] = useState<{ id: string; name: string }[]>([]);
  const [plotId, setPlotId] = useState('');
  const [step, setStep] = useState('map');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(() => new URLSearchParams(window.location.search).get('new') === 'plot');

  useEffect(() => {
    let cancelled = false;
    setError('');
    void request<{ items: { id: string; name: string }[] }>(`/api/v1/farms/${farmId}/plots`)
      .then(({ items }) => {
        if (cancelled) return;
        setPlots(items);
        setPlotId((current) => items.some((plot) => plot.id === current) ? current : items[0]?.id ?? '');
      }).catch(() => { if (!cancelled) setError('No se han podido cargar las parcelas. Reintenta la consulta.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [farmId, mapRevision]);

  async function refreshPrivateMap(): Promise<void> {
    setDirty(false);
    setNotice('Datos guardados. Puedes continuar con Catastro, SIGPAC o Revisar.');
    setMapRevision((current) => current + 1);
  }

  return (
    <>
      <section className="card card-body">
        <h2>Localiza y delimita tu parcela</h2>
        <p>Elige una parcela, guarda su ubicación y comprueba los límites oficiales antes de confirmarlos.</p>
        <button className="secondary-button" disabled={dirty} onClick={() => setAdding((current) => !current)}>{adding ? 'Volver a mis parcelas' : '+ Añadir parcela por GPS o Catastro'}</button>
        {dirty ? <p role="status">Tienes cambios pendientes en el mapa. Guárdalos antes de añadir otra parcela.</p> : null}
        {loading ? <p role="status">Cargando parcelas…</p> : null}
        {error ? <div role="alert">{error}<button onClick={() => void refreshPrivateMap()}>Reintentar</button></div> : null}
        {!loading && !error && !plots.length ? <p>Añade tu parcela para empezar. <a href="/mi-campo/parcelas">Ir a parcelas →</a></p> : null}
        {notice ? <p role="status">{notice}</p> : null}
        {plots.length ? <><label htmlFor="workspace-plot">Parcela de trabajo</label><select id="workspace-plot" value={plotId} onChange={(event) => { if (!dirty || window.confirm('Hay cambios sin guardar en el mapa. ¿Quieres descartarlos y cambiar de parcela?')) { setDirty(false); setNotice(''); setPlotId(event.target.value); } }}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select>
        <nav className="plot-map-mode-tabs" aria-label="Pasos de la parcela">{[['map', '1. GPS y mapa'], ['catastro', '2. Catastro'], ['sigpac', 'SIGPAC'], ['review', '3. Revisar']].map(([id, label]) => <button key={id} type="button" className={step === id ? 'active' : ''} aria-pressed={step === id} onClick={() => { if (step === id) return; if (dirty && !window.confirm('Guarda la ubicación o el perímetro antes de continuar. ¿Quieres descartar los cambios pendientes?')) return; if (dirty) { setDirty(false); setMapRevision((value) => value + 1); } setStep(id!); }}>{label}</button>)}</nav></> : null}
      </section>
      {adding ? <ParcelRegistration farmId={farmId} onCreated={(id) => { setPlotId(id); setAdding(false); setStep('map'); void refreshPrivateMap(); }} /> : null}
      {plotId ? <>
        <div hidden={step !== 'map'}><PlotMapEditor key={`${farmId}-${plotId}-${mapRevision}`} farmId={farmId} activePlotId={plotId} onSaved={refreshPrivateMap} onDirtyChange={setDirty} /></div>
        {step === 'review' ? <ParcelSourceComparisonPanel key={plotId} farmId={farmId} revision={mapRevision} activePlotId={plotId} /> : null}
        {step === 'sigpac' ? <SigpacRecintoPanel key={`${plotId}-${mapRevision}`} farmId={farmId} activePlotId={plotId} onImported={refreshPrivateMap} /> : null}
        {step === 'catastro' ? <CatastroParcelPanel key={`${plotId}-${mapRevision}`} farmId={farmId} activePlotId={plotId} onImported={refreshPrivateMap} /> : null}
      </> : null}
    </>
  );
}
