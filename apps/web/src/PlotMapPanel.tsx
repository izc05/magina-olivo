import { useEffect, useMemo, useState } from 'react';
import './plot-map.css';

type LocatedPlot = {
  id: string;
  name: string;
  areaHa: string | null;
  sigpacReference: string | null;
  latitude: number | null;
  longitude: number | null;
  irrigationType: string | null;
  oliveTreeCount: number | null;
  notes: string | null;
};

type ApiErrorBody = { error?: { message?: string } };

async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');

  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json() as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Keep the HTTP fallback for non-JSON errors.
    }
    throw new Error(message);
  }
  return await response.json() as T;
}

function mapEmbedUrl(latitude: number, longitude: number): string {
  const latSpan = 0.008;
  const lonSpan = 0.012;
  const bbox = [longitude - lonSpan, latitude - latSpan, longitude + lonSpan, latitude + latSpan]
    .map((value) => value.toFixed(6))
    .join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
}

function externalMapUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=17/${latitude.toFixed(6)}/${longitude.toFixed(6)}`;
}

function normalizeCoordinate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function PlotMapPanel({ farmId }: { farmId: string }) {
  const [plots, setPlots] = useState<LocatedPlot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === selectedPlotId) ?? null,
    [plots, selectedPlotId],
  );

  const locatedCount = useMemo(
    () => plots.filter((plot) => plot.latitude != null && plot.longitude != null).length,
    [plots],
  );

  async function loadPlots() {
    if (!farmId) {
      setPlots([]);
      setSelectedPlotId('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ items: LocatedPlot[] }>(`/api/v1/farms/${farmId}/plots`);
      setPlots(result.items);
      setSelectedPlotId((current) => result.items.some((plot) => plot.id === current) ? current : (result.items[0]?.id ?? ''));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar las parcelas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlots();
  }, [farmId]);

  useEffect(() => {
    setLatitude(selectedPlot?.latitude == null ? '' : String(selectedPlot.latitude));
    setLongitude(selectedPlot?.longitude == null ? '' : String(selectedPlot.longitude));
    setNotice(null);
    setError(null);
  }, [selectedPlotId, selectedPlot?.latitude, selectedPlot?.longitude]);

  function useDeviceLocation() {
    setError(null);
    setNotice(null);
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo o navegador no ofrece geolocalización. Puedes escribir las coordenadas manualmente.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setNotice(`Ubicación obtenida con una precisión aproximada de ${Math.round(position.coords.accuracy)} m. Revisa el punto y pulsa Guardar ubicación.`);
        setLocating(false);
      },
      (reason) => {
        const message = reason.code === reason.PERMISSION_DENIED
          ? 'No se ha concedido permiso de ubicación. Puedes introducir las coordenadas manualmente.'
          : 'No se ha podido obtener una ubicación fiable. Inténtalo de nuevo al aire libre o introduce las coordenadas.';
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
  }

  async function saveLocation() {
    if (!selectedPlot) return;
    const lat = normalizeCoordinate(latitude);
    const lon = normalizeCoordinate(longitude);
    if (lat == null || lon == null) {
      setError('Escribe una latitud y una longitud válidas.');
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError('Las coordenadas están fuera del rango válido.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<LocatedPlot>(`/api/v1/plots/${selectedPlot.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      setPlots((current) => current.map((plot) => plot.id === updated.id ? updated : plot));
      setLatitude(String(updated.latitude ?? ''));
      setLongitude(String(updated.longitude ?? ''));
      setNotice('Ubicación guardada en la parcela.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  async function clearLocation() {
    if (!selectedPlot) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<LocatedPlot>(`/api/v1/plots/${selectedPlot.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude: null, longitude: null }),
      });
      setPlots((current) => current.map((plot) => plot.id === updated.id ? updated : plot));
      setLatitude('');
      setLongitude('');
      setNotice('Ubicación eliminada. La parcela y su historial se conservan.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido eliminar la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  const draftLatitude = normalizeCoordinate(latitude);
  const draftLongitude = normalizeCoordinate(longitude);
  const canPreview = draftLatitude != null && draftLongitude != null
    && draftLatitude >= -90 && draftLatitude <= 90
    && draftLongitude >= -180 && draftLongitude <= 180;

  return (
    <section className="section plot-map-shell" aria-labelledby="plot-map-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Geolocalización</p>
          <h2 id="plot-map-title" className="section-title">Mapa de Parcelas</h2>
          <p className="section-copy">Localiza cada parcela y úsala como referencia para su histórico agrícola.</p>
        </div>
        <span className="badge gold">{locatedCount}/{plots.length} localizadas</span>
      </div>

      {loading ? <div className="card empty-state" role="status">Cargando parcelas…</div> : null}
      {!loading && !plots.length ? <div className="card empty-state"><strong>Sin parcelas</strong>Añade una parcela para poder situarla en el mapa.</div> : null}

      {!loading && selectedPlot ? (
        <div className="plot-map-grid">
          <div className="card card-body plot-location-card">
            <div className="field">
              <label htmlFor="map-plot-select">Parcela</label>
              <select id="map-plot-select" value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)}>
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>{plot.name}{plot.latitude != null && plot.longitude != null ? ' · localizada' : ' · pendiente'}</option>
                ))}
              </select>
            </div>

            <div className="plot-map-meta" aria-label="Datos de la parcela seleccionada">
              <span>{selectedPlot.areaHa ? `${selectedPlot.areaHa} ha` : 'Superficie pendiente'}</span>
              <span>{selectedPlot.oliveTreeCount ?? '—'} olivos</span>
              <span>{selectedPlot.sigpacReference ? 'SIGPAC informado' : 'SIGPAC pendiente'}</span>
            </div>

            <div className="inline-fields plot-coordinate-fields">
              <div className="field">
                <label htmlFor="plot-latitude">Latitud</label>
                <input id="plot-latitude" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="37.7…" />
              </div>
              <div className="field">
                <label htmlFor="plot-longitude">Longitud</label>
                <input id="plot-longitude" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-3.5…" />
              </div>
            </div>

            <div className="plot-map-actions">
              <button className="ghost-button" type="button" onClick={useDeviceLocation} disabled={locating || saving}>{locating ? 'Buscando GPS…' : 'Usar mi ubicación'}</button>
              <button className="primary-button" type="button" onClick={() => void saveLocation()} disabled={!canPreview || saving}>{saving ? 'Guardando…' : 'Guardar ubicación'}</button>
            </div>

            {selectedPlot.latitude != null && selectedPlot.longitude != null ? (
              <button className="text-button plot-clear-location" type="button" onClick={() => void clearLocation()} disabled={saving}>Quitar ubicación guardada</button>
            ) : null}

            {error ? <div className="alert" role="alert">{error}</div> : null}
            {notice ? <div className="alert success" role="status">{notice}</div> : null}
          </div>

          <div className="card plot-map-card">
            {canPreview ? (
              <>
                <iframe
                  className="plot-map-frame"
                  title={`Mapa de ${selectedPlot.name}`}
                  src={mapEmbedUrl(draftLatitude, draftLongitude)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="plot-map-footer">
                  <div>
                    <strong>{selectedPlot.name}</strong>
                    <small>{draftLatitude.toFixed(6)}, {draftLongitude.toFixed(6)}</small>
                  </div>
                  <a className="text-button" href={externalMapUrl(draftLatitude, draftLongitude)} target="_blank" rel="noreferrer">Abrir mapa ↗</a>
                </div>
              </>
            ) : (
              <div className="plot-map-placeholder">
                <span aria-hidden="true">⌖</span>
                <strong>Parcela pendiente de localizar</strong>
                <p>Usa el GPS cuando estés en la finca o introduce las coordenadas para previsualizar el punto.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <p className="plot-map-disclaimer">El punto identifica la ubicación de trabajo de la parcela. El perímetro oficial y la cartografía SIGPAC se incorporarán como una capa geoespacial separada.</p>
    </section>
  );
}
