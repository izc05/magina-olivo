import { useEffect, useMemo, useState } from 'react';

type Freshness = {
  status: 'current' | 'review' | 'stale' | 'unknown';
  ageDays: number | null;
};

type FieldAlertResponse = {
  source: {
    provider: string;
    label: string;
    licenseLabel: string | null;
    updateFrequency: string | null;
    sourceUpdatedAt: string | null;
    lastCheckedAt: string | null;
    lastSuccessAt: string | null;
    hasError: boolean;
  };
  freshness: Freshness;
  scope: {
    crop: string;
    coverage: string;
    provinceFocus: string;
  };
  latestDemonstrationObservation: string | null;
  resources: Array<{ key: string; label: string; url: string }>;
};

function dateLabel(value?: string | null): string {
  if (!value) return 'Pendiente';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-ES');
}

const statusCopy: Record<Freshness['status'], { label: string; text: string }> = {
  current: {
    label: 'Fuente al día',
    text: 'La última actualización registrada está dentro del margen esperado para una fuente semanal.',
  },
  review: {
    label: 'Revisar fecha',
    text: 'La fuente supera el margen semanal habitual. Consulta la fecha antes de tomar decisiones de campo.',
  },
  stale: {
    label: 'Información antigua',
    text: 'No usamos esta fuente como señal actual. Abre RAIF directamente para comprobar si hay una publicación más reciente.',
  },
  unknown: {
    label: 'Sin verificar',
    text: 'No podemos clasificar la frescura de la fuente en este momento.',
  },
};

export function MaginaFieldAlertsPage() {
  const [data, setData] = useState<FieldAlertResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/field-alerts', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<FieldAlertResponse>;
    }).then(setData).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, []);

  const freshness = data?.freshness.status ?? 'unknown';
  const status = statusCopy[freshness];
  const sourceDate = data?.source.sourceUpdatedAt ?? null;
  const checkedDate = data?.source.lastSuccessAt ?? data?.source.lastCheckedAt ?? null;
  const resourceCount = useMemo(() => data?.resources.length ?? 0, [data]);

  return (
    <main className="field-alert-shell" id="main-content">
      <header className="directory-header">
        <a className="directory-brand" href="/magina" aria-label="Volver a Mágina">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Campo · Alertas</small></span>
        </a>
        <a className="directory-back" href="/magina">Volver a Mágina</a>
      </header>

      <section className="field-alert-hero" aria-labelledby="field-alert-title">
        <p className="eyebrow">Mágina · Campo</p>
        <h1 id="field-alert-title">Estado fitosanitario, sin falsas certezas</h1>
        <p>Seguimiento público RAIF del olivar con fecha y procedencia visibles. Sirve como contexto regional; no diagnostica tu parcela ni sustituye el criterio de un técnico.</p>
      </section>

      {error ? <div className="alert" role="alert">No se ha podido consultar ahora el estado de RAIF.</div> : null}

      <section className="field-alert-status card" aria-busy={loading}>
        <div>
          <span className={`badge ${freshness === 'current' ? 'gold' : ''}`}>{status.label}</span>
          <h2>{data?.source.provider ?? 'RAIF · Junta de Andalucía'}</h2>
          <p>{status.text}</p>
        </div>
        <dl className="field-alert-facts">
          <div><dt>Datos actualizados</dt><dd>{dateLabel(sourceDate)}</dd></div>
          <div><dt>Fuente comprobada</dt><dd>{dateLabel(checkedDate)}</dd></div>
          <div><dt>Frecuencia</dt><dd>{data?.source.updateFrequency ?? 'Semanal'}</dd></div>
          <div><dt>Ámbito</dt><dd>{data ? `${data.scope.crop} · ${data.scope.provinceFocus}` : 'Olivar · Jaén'}</dd></div>
        </dl>
      </section>

      {data?.source.hasError ? (
        <div className="alert" role="status">La última comprobación de la fuente registró una incidencia. Usa los enlaces oficiales antes de interpretar el estado como actual.</div>
      ) : null}

      <section className="field-alert-grid" aria-label="Recursos fitosanitarios oficiales">
        {data?.resources.map((resource) => (
          <a className="card field-alert-resource" href={resource.url} target="_blank" rel="noreferrer" key={resource.key}>
            <span className="badge">Fuente oficial</span>
            <h2>{resource.label}</h2>
            <p>Abrir en la web de la Junta de Andalucía.</p>
            <strong>Consultar →</strong>
          </a>
        ))}
        {!loading && !error && resourceCount === 0 ? (
          <div className="card field-alert-resource"><h2>Recursos no disponibles</h2><p>No se han podido validar enlaces HTTPS de la fuente.</p></div>
        ) : null}
      </section>

      <section className="card field-alert-rule">
        <p className="eyebrow page-eyebrow">Regla de producto</p>
        <h2>Alerta regional ≠ diagnóstico de tu finca</h2>
        <p>Los muestreos RAIF proceden de parcelas de seguimiento y sirven para conocer la evolución fitosanitaria. Antes de recomendar actuaciones por parcela, Mágina Olivo necesitará ubicación, fenología, observaciones propias y una regla técnica validada.</p>
        {data?.latestDemonstrationObservation ? <p><strong>Referencia demostrativa reciente:</strong> {dateLabel(data.latestDemonstrationObservation)}.</p> : null}
      </section>

      <footer className="directory-footer">
        <p>Fuente: {data?.source.label ?? 'Red de Alerta e Información Fitosanitaria (RAIF)'}{data?.source.licenseLabel ? ` · ${data.source.licenseLabel}` : ''}.</p>
      </footer>
    </main>
  );
}
