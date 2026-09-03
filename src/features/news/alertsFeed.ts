export type AlertSeverity = 'critical' | 'warning' | 'info';

export type RealAlert = {
  id: string;
  severity: AlertSeverity;
  category: string;
  scope: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  official: boolean;
};

export type AlertsPayload = {
  generatedAt: string;
  sourceCount?: number;
  healthySourceCount?: number;
  collectorErrors?: string[];
  alerts: RealAlert[];
};

function getAlertsPath(): string {
  const pathname = window.location.pathname;
  const base = pathname.startsWith('/magina-olivo/') ? '/magina-olivo/' : '/';
  return `${base}data/alerts.json`;
}

export async function loadAlerts(): Promise<AlertsPayload> {
  const response = await fetch(`${getAlertsPath()}?ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudieron cargar las alertas (${response.status})`);

  const payload = await response.json() as AlertsPayload;
  if (!Array.isArray(payload.alerts)) throw new Error('Formato de alertas no válido');
  return payload;
}
