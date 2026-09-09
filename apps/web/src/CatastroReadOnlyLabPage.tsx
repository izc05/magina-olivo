import { useMemo, useState } from 'react';
import './catastro-readonly-lab.css';

type QueryMode = 'reference' | 'point';
type CatastroGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};
type CatastroParcel = {
  id: string;
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
  beginLifespanVersion: string | null;
  geometry: CatastroGeometry;
};
type CatastroSource = {
  provider: string;
  dataset: string;
  service: string;
  status: string;
  checkedAt: string;
};
type CatastroSingleResponse = { item: CatastroParcel; source: CatastroSource };
type ApiErrorBody = { error?: { message?: string; code?: string } };

type Position = [number, number];

function normalizeReference(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function validReference(value: string): boolean {
  return /^(?:[A-Z0-9]{14}|[A-Z0-9]{18}|[A-Z0-9]{20})$/.test(normalizeReference(value));
}

function finiteCoordinate(value: string, min: number, max: number): boolean {
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number >= min && number <= max;
}

async function readCatastro(url: string): Promise<CatastroSingleResponse> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    let message = response.status === 401
      ? 'Necesitas iniciar sesión en Mágina Olivo para hacer una prueba real de Catastro.'
      : `Catastro respondió con HTTP ${response.status}.`;
    try {
      const body = await response.json() as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Preserve the safe HTTP fallback when the body is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<CatastroSingleResponse>;
}

function collectPositions(value: unknown, output: Position[] = []): Position[] {
  if (!Array.isArray(value)) return output;
  if (value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    output.push([value[0] as number, value[1] as number]);
    return output;
  }
  for (const child of value) collectPositions(child, output);
  return output;
}

function GeometryPreview({ geometry }: { geometry: CatastroGeometry }) {
  const positions = useMemo(() => collectPositions(geometry.coordinates), [geometry]);
  if (!positions.length) return <div className="catastro-real-empty">Sin geometría representable</div>;

  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const width = Math.max(0.000001, maxLon - minLon);
  const height = Math.max(0.000001, maxLat - minLat);
  const points = positions.map(([longitude, latitude]) => {
    const x = 7 + (longitude - minLon) / width * 86;
    const y = 93 - (latitude - minLat) / height * 86;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="catastro-real-geometry" viewBox="0 0 100 100" role="img" aria-label="Vista de la geometría devuelta por Catastro">
      <polygon points={points} />
    </svg>
  );
}

function formatArea(areaM2: number | null): string {
  if (areaM2 == null || !Number.isFinite(areaM2)) return 'No indicada';
  const hectares = areaM2 / 10_000;
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(areaM2)} m² · ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(hectares)} ha`;
}

export function CatastroReadOnlyLabPage() {
  const [mode, setMode] = useState<QueryMode>('reference');
  const [reference, setReference] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CatastroSingleResponse | null>(null);

  const referenceReady = validReference(reference);
  const pointReady = finiteCoordinate(longitude, -180, 180) && finiteCoordinate(latitude, -85, 85);
  const ready = mode === 'reference' ? referenceReady : pointReady;

  async function runQuery() {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams();
      let endpoint: string;
      if (mode === 'reference') {
        params.set('reference', normalizeReference(reference));
        endpoint = `/api/v1/maps/catastro/parcela?${params.toString()}`;
      } else {
        params.set('longitude', String(Number(longitude.replace(',', '.'))));
        params.set('latitude', String(Number(latitude.replace(',', '.'))));
        endpoint = `/api/v1/maps/catastro/parcela-en-punto?${params.toString()}`;
      }
      setResult(await readCatastro(endpoint));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido consultar Catastro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="catastro-real-page">
      <header className="catastro-real-header">
        <a href="/lab/catastro" className="catastro-real-back">← Laboratorio visual</a>
        <span className="catastro-real-badge">REAL · SOLO LECTURA</span>
      </header>

      <section className="catastro-real-shell">
        <div className="catastro-real-heading">
          <p className="catastro-real-eyebrow">Mágina Olivo · prueba aislada</p>
          <h1>Comprobar Catastro real</h1>
          <p>Esta pantalla consulta los endpoints autenticados ya auditados. Puede leer una parcela real, pero no contiene ninguna operación para guardar, importar o modificar Mi Campo.</p>
        </div>

        <div className="catastro-real-warning" role="note">
          <strong>Modo seguro de prueba</strong>
          <span>Solo se realizan peticiones GET. Para usarlo debes tener una sesión iniciada en Mágina Olivo.</span>
        </div>

        <section className="catastro-real-card">
          <div className="catastro-real-tabs" role="tablist" aria-label="Tipo de consulta real">
            <button type="button" role="tab" aria-selected={mode === 'reference'} className={mode === 'reference' ? 'active' : ''} onClick={() => { setMode('reference'); setError(null); setResult(null); }}>Referencia catastral</button>
            <button type="button" role="tab" aria-selected={mode === 'point'} className={mode === 'point' ? 'active' : ''} onClick={() => { setMode('point'); setError(null); setResult(null); }}>Coordenadas</button>
          </div>

          {mode === 'reference' ? (
            <div className="catastro-real-form">
              <label htmlFor="real-catastro-reference">Referencia catastral</label>
              <input
                id="real-catastro-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase())}
                placeholder="14, 18 o 20 caracteres"
                maxLength={22}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={reference.length > 0 && !referenceReady}
              />
              <small>{reference.length === 0 ? 'Introduce una RC real que quieras comprobar.' : referenceReady ? '✓ Formato válido para consultar' : 'La RC debe tener 14, 18 o 20 caracteres alfanuméricos.'}</small>
            </div>
          ) : (
            <div className="catastro-real-coordinate-grid">
              <div className="catastro-real-form">
                <label htmlFor="real-catastro-longitude">Longitud</label>
                <input id="real-catastro-longitude" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-3.4..." />
                <small>WGS84 · entre -180 y 180</small>
              </div>
              <div className="catastro-real-form">
                <label htmlFor="real-catastro-latitude">Latitud</label>
                <input id="real-catastro-latitude" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="37.7..." />
                <small>WGS84 · entre -85 y 85</small>
              </div>
            </div>
          )}

          <button type="button" className="catastro-real-primary" disabled={!ready || loading} onClick={() => void runQuery()}>
            {loading ? 'Consultando Catastro…' : mode === 'reference' ? 'Comprobar referencia real' : 'Buscar parcela en este punto'}
          </button>

          {error ? <div className="catastro-real-error" role="alert">{error}</div> : null}
        </section>

        {result ? (
          <section className="catastro-real-result" aria-live="polite">
            <div className="catastro-real-result-copy">
              <div className="catastro-real-success">✓ Respuesta real recibida</div>
              <p className="catastro-real-eyebrow">{result.source.provider}</p>
              <h2>{result.item.nationalCadastralReference}</h2>
              <dl>
                <div><dt>Etiqueta</dt><dd>{result.item.label ?? '—'}</dd></div>
                <div><dt>Superficie</dt><dd>{formatArea(result.item.areaM2)}</dd></div>
                <div><dt>Geometría</dt><dd>{result.item.geometry.type}</dd></div>
                <div><dt>Servicio</dt><dd>{result.source.dataset} · {result.source.service}</dd></div>
                <div><dt>Consulta</dt><dd>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(result.source.checkedAt))}</dd></div>
              </dl>
            </div>
            <GeometryPreview geometry={result.item.geometry} />
          </section>
        ) : null}

        <footer className="catastro-real-footer">
          <strong>No hay botón “Añadir parcela” en esta pantalla.</strong>
          <span>La importación real permanece únicamente en el componente Catastro auditado y no forma parte de este laboratorio de lectura.</span>
        </footer>
      </section>
    </main>
  );
}
