import { useEffect, useState } from 'react';
import {
  exteriorRings,
  MAP_VIEW_SIZE,
  MIN_CATASTRO_ZOOM,
  screenPoint,
  viewportBbox,
  type CatastroGeometry,
  type MapCenter,
} from './catastro-selector-map.ts';
import './official-map-layers.css';

type PlotOverlay = {
  id: string;
  name: string;
  boundaryGeoJson: CatastroGeometry | null;
};

type SigpacRecinto = {
  id: string;
  poligono: number | null;
  parcela: number | null;
  recinto: number | null;
  usoSigpac: string | null;
  geometry: CatastroGeometry;
};

type SigpacResponse = {
  items: SigpacRecinto[];
  source: {
    provider: string;
    checkedAt: string;
  };
};

type ApiErrorBody = { error?: { message?: string } };

async function request<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    credentials: 'include',
    signal,
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json() as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Keep the HTTP fallback for non-JSON responses.
    }
    throw new Error(message);
  }
  return await response.json() as T;
}

function polygonPoints(ring: [number, number][], zoom: number, topLeft: { x: number; y: number }): string {
  return ring.map((position) => {
    const point = screenPoint(position, zoom, topLeft);
    return `${point.x},${point.y}`;
  }).join(' ');
}

export function OfficialMapOverlays({
  center,
  zoom,
  topLeft,
  plots,
}: {
  center: MapCenter;
  zoom: number;
  topLeft: { x: number; y: number };
  plots: PlotOverlay[];
}) {
  const [showSigpac, setShowSigpac] = useState(false);
  const [showMyPlots, setShowMyPlots] = useState(true);
  const [sigpacItems, setSigpacItems] = useState<SigpacRecinto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showSigpac || zoom < MIN_CATASTRO_ZOOM) {
      setSigpacItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const bbox = viewportBbox(center, zoom);
      const params = new URLSearchParams({
        minLon: String(bbox.minLon),
        minLat: String(bbox.minLat),
        maxLon: String(bbox.maxLon),
        maxLat: String(bbox.maxLat),
      });
      setLoading(true);
      setError(null);
      void request<SigpacResponse>(`/api/v1/maps/sigpac/recintos?${params.toString()}`, controller.signal)
        .then((result) => setSigpacItems(result.items))
        .catch((reason) => {
          if (controller.signal.aborted) return;
          setSigpacItems([]);
          setError(reason instanceof Error ? reason.message : 'No se ha podido consultar SIGPAC.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [center, showSigpac, zoom]);

  return (
    <>
      <div className="catastro-map-first-layer-toggle" role="group" aria-label="Capas oficiales del mapa">
        <span>Capas</span>
        <button
          type="button"
          className={showSigpac ? 'active sigpac' : ''}
          aria-pressed={showSigpac}
          onClick={() => setShowSigpac((current) => !current)}
        >
          SIGPAC
        </button>
        <button
          type="button"
          className={showMyPlots ? 'active my-plots' : ''}
          aria-pressed={showMyPlots}
          onClick={() => setShowMyPlots((current) => !current)}
        >
          Mis parcelas
        </button>
      </div>

      <svg
        className="catastro-map-first-official-overlays"
        viewBox={`0 0 ${MAP_VIEW_SIZE} ${MAP_VIEW_SIZE}`}
        aria-hidden="true"
      >
        {showSigpac ? sigpacItems.flatMap((item) => exteriorRings(item.geometry).map((ring, index) => (
          <polygon
            key={`sigpac-${item.id}-${index}`}
            className="sigpac-overlay-polygon"
            points={polygonPoints(ring, zoom, topLeft)}
          />
        ))) : null}

        {showMyPlots ? plots.flatMap((plot) => plot.boundaryGeoJson
          ? exteriorRings(plot.boundaryGeoJson).map((ring, index) => (
              <polygon
                key={`my-plot-${plot.id}-${index}`}
                className="my-plot-overlay-polygon"
                points={polygonPoints(ring, zoom, topLeft)}
              />
            ))
          : []) : null}
      </svg>

      <div className="catastro-map-first-layer-status" aria-live="polite">
        {showSigpac && zoom < MIN_CATASTRO_ZOOM ? <span>Acércate para cargar SIGPAC.</span> : null}
        {loading ? <span>Cargando recintos SIGPAC…</span> : null}
        {error ? <span> SIGPAC no disponible; Catastro sigue funcionando.</span> : null}
        {showSigpac && !loading && !error && zoom >= MIN_CATASTRO_ZOOM ? <span>{sigpacItems.length} recintos SIGPAC visibles.</span> : null}
      </div>
    </>
  );
}
