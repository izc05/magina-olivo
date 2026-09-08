import { useState } from 'react';
import { request } from './api';
import { GeometryPreview } from './CatastroParcelPanel';

export function ParcelRegistration({ farmId, onCreated }: { farmId: string; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [method, setMethod] = useState('gps');
  const [reference, setReference] = useState('');
  const [point, setPoint] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [candidate, setCandidate] = useState<{ nationalCadastralReference: string; areaM2: number | null; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } } | null>(null);
  const normalized = reference.replace(/\s/g, '').toUpperCase();
  const candidateReady = candidate?.nationalCadastralReference === normalized && candidate.geometry.type === 'Polygon' && candidate.geometry.coordinates.length === 1;
  async function lookup() {
    setBusy(true); setError(''); setConfirmed(false); setCandidate(null);
    try { setCandidate(await request(`/api/v1/maps/catastro/parcelas/by-reference/${encodeURIComponent(normalized)}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se ha podido consultar Catastro.'); }
    finally { setBusy(false); }
  }
  async function locate() {
    setBusy(true); setError(''); setConfirmed(false);
    try {
      if (!window.isSecureContext || !navigator.geolocation) throw new Error('La ubicación necesita HTTPS y permiso del navegador. Puedes usar Catastro como alternativa.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
      setPoint({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
    } catch { setError('No se ha podido obtener el GPS. Comprueba el permiso de ubicación o elige Catastro.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!confirmed || !name.trim() || busy) return;
    if (method === 'gps' && !point) return;
    if (method === 'catastro' && !candidateReady) { setError('Consulta y revisa la parcela en Catastro antes de confirmar.'); return; }
    setBusy(true); setError('');
    try {
      const plot = await request<{ id: string }>(`/api/v1/farms/${farmId}/plots`, { method: 'POST', body: JSON.stringify({ name: name.trim(), ...(method === 'gps' && point ? { latitude: point.latitude, longitude: point.longitude } : { cadastralReference: normalized, verifyCatastro: true }) }) });
      onCreated(plot.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se ha podido guardar.'); }
    finally { setBusy(false); }
  }
  return <section className="card card-body"><h2>Añadir parcela a esta finca</h2><p>Localiza primero la parcela. Solo se guardará cuando confirmes.</p>
    <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <div className="plot-map-mode-tabs"><button type="button" aria-pressed={method === 'gps'} onClick={() => { setMethod('gps'); setConfirmed(false); }}>Mi ubicación GPS</button><button type="button" aria-pressed={method === 'catastro'} onClick={() => { setMethod('catastro'); setConfirmed(false); }}>Referencia Catastro</button></div>
      <div className="field"><label htmlFor="new-map-plot-name">Nombre de la parcela</label><input id="new-map-plot-name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div>
      {method === 'gps' ? <><button className="secondary-button" onClick={() => void locate()}>Obtener mi ubicación</button>{point ? <p>Latitud {point.latitude.toFixed(6)} · Longitud {point.longitude.toFixed(6)} · Precisión aproximada {Math.round(point.accuracy)} m.</p> : null}<p>El GPS guarda un punto de trabajo. Después podrás consultar Catastro o dibujar los límites.</p></> : <div className="field"><label htmlFor="new-map-reference">Referencia de parcela (14 caracteres)</label><input id="new-map-reference" value={reference} onChange={(event) => { setReference(event.target.value); setConfirmed(false); }} /><p>El servidor verificará el perímetro en Catastro antes de guardar. La referencia de un inmueble de 20 caracteres requiere identificar primero su parcela cartográfica.</p></div>}
      {method === 'catastro' ? <><button className="secondary-button" disabled={!/^[A-Z0-9]{14}$/.test(normalized)} onClick={() => void lookup()}>Consultar y ver límites</button>{candidate && candidate.nationalCadastralReference === normalized ? <div><GeometryPreview geometry={candidate.geometry} /><p>Referencia: {candidate.nationalCadastralReference} · Superficie oficial: {candidate.areaM2 == null ? 'No disponible' : `${candidate.areaM2} m²`}</p>{!candidateReady ? <p>Esta geometría necesita revisión; no se puede importar automáticamente.</p> : null}</div> : null}</> : null}
      <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Confirmo que gestiono esta parcela y quiero añadirla a la finca seleccionada.</label>
      <div className="form-actions"><button className="primary-button" disabled={!confirmed || !name.trim() || (method === 'gps' ? !point : !candidateReady)} onClick={() => void save()}>{busy ? 'Verificando y guardando…' : 'Confirmar y guardar parcela'}</button></div>
    </fieldset>{error ? <p role="alert">{error}</p> : null}
  </section>;
}
