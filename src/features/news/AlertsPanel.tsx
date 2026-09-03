import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { formatNewsAge } from './newsFeed';
import { loadAlerts, type RealAlert } from './alertsFeed';
import '../../styles/alerts-real.css';

type LoadState = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
};

function AlertIcon({ severity }: { severity: RealAlert['severity'] }) {
  if (severity === 'critical') return <ShieldAlert size={21} />;
  if (severity === 'warning') return <AlertTriangle size={21} />;
  return <BellRing size={21} />;
}

export function AlertsPanel({ onBack }: Props) {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [generatedAt, setGeneratedAt] = useState('');
  const [sourceCount, setSourceCount] = useState(0);
  const [healthySourceCount, setHealthySourceCount] = useState(0);
  const [scope, setScope] = useState('Todos');

  const refresh = async () => {
    setState('loading');
    try {
      const payload = await loadAlerts();
      setAlerts(payload.alerts);
      setGeneratedAt(payload.generatedAt);
      setSourceCount(payload.sourceCount ?? 0);
      setHealthySourceCount(payload.healthySourceCount ?? payload.sourceCount ?? 0);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => { void refresh(); }, []);

  const scopes = useMemo(() => [...new Set(alerts.map((alert) => alert.scope))], [alerts]);
  const visible = useMemo(() => scope === 'Todos' ? alerts : alerts.filter((alert) => alert.scope === scope), [alerts, scope]);

  return (
    <section className="section-block hub-panel hub-panel--flush alerts-real section-block--last">
      <div className="alerts-real__top">
        <button type="button" className="text-action" onClick={onBack}>← Noticias</button>
        <button type="button" className="icon-button" aria-label="Actualizar alertas" onClick={() => void refresh()}><RefreshCw size={18} /></button>
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">Fuentes oficiales</span><h2>Alertas del campo</h2></div>
        <ShieldAlert size={22} />
      </div>
      <p className="alerts-real__intro">Avisos y recomendaciones del olivar con fuente y fecha visibles. No generamos una alerta técnica si no existe información trazable.</p>

      {state === 'ready' && scopes.length > 0 && (
        <div className="alerts-real__filters">
          {['Todos', ...scopes].map((item) => (
            <button key={item} type="button" className={scope === item ? 'alerts-real__filter alerts-real__filter--active' : 'alerts-real__filter'} onClick={() => setScope(item)}>{item}</button>
          ))}
        </div>
      )}

      {state === 'loading' && <div className="alerts-real__state"><RefreshCw size={20} className="real-news-spin" /><span>Actualizando avisos oficiales…</span></div>}
      {state === 'error' && <div className="alerts-real__state alerts-real__state--error"><AlertTriangle size={20} /><span>No se ha podido actualizar. Conservamos la arquitectura preparada para reintentar.</span></div>}

      {state === 'ready' && (
        <div className="alerts-real__list">
          {visible.map((alert) => (
            <a key={alert.id} className={`alerts-real__card alerts-real__card--${alert.severity}`} href={alert.url} target="_blank" rel="noreferrer">
              <div className="alerts-real__icon"><AlertIcon severity={alert.severity} /></div>
              <div className="alerts-real__copy">
                <div className="alerts-real__meta"><span>{alert.category}</span><span>{alert.scope}</span>{alert.official && <span>Oficial</span>}</div>
                <strong>{alert.title}</strong>
                <p>{alert.summary}</p>
                <small>{alert.source} · {formatNewsAge(alert.publishedAt)}</small>
              </div>
              <ExternalLink size={16} />
            </a>
          ))}
        </div>
      )}

      {state === 'ready' && visible.length === 0 && <div className="alerts-real__state"><BellRing size={20} /><span>No hay avisos para este ámbito.</span></div>}

      {state === 'ready' && (
        <div className="alerts-real__health">
          <CheckCircle2 size={17} />
          <div><strong>Control de fuente</strong><span>{sourceCount ? `${healthySourceCount}/${sourceCount} fuentes operativas.` : 'Fuente oficial identificada en cada aviso.'}</span>{generatedAt && <small>Actualizado: {new Date(generatedAt).toLocaleString('es-ES')}</small>}</div>
        </div>
      )}
    </section>
  );
}
