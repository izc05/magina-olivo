import { AlertTriangle, Bell, Check, ChevronRight, Cloud, CloudRain, Droplets, Info, MapPin, Moon, Snowflake, Sprout, Sun, Thermometer, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type Holding, type Plot } from './api';
import { PublicNavigation } from './PublicNavigation';
import { VisualHeader } from './VisualChrome';

type Day = { date: string; precipitationProbabilityPercent: number | null; temperatureMinC: number | null; temperatureMaxC: number | null; windMaxKmh: number | null };
type DailyWeather = { municipality: { slug: string; name: string; province: string }; forecast: { elaboratedAt: string | null; days: Day[] }; source: { attribution: string; scopeNote: string } };
type Hour = { dateTime: string; skyDescription: string | null; precipitationProbabilityPercent: number | null; temperatureC: number | null; humidityPercent: number | null; windKmh: number | null; windDirection: string | null };
type HourlyWeather = { municipality: { slug: string; name: string; province: string }; forecast: { hours: Hour[] }; source: { attribution: string; scopeNote: string } };
const fmt = (value: number | null, suffix = '') => value == null ? '—' : `${Math.round(value)}${suffix}`;
const dateParts = (date: string) => { const value = new Date(`${date}T12:00:00`); return { weekday: new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(value), date: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(value) }; };
function WeatherIcon({ rain = 0, night = false }: { rain?: number | null | undefined; night?: boolean | undefined }) { if (night) return <Moon />; if ((rain ?? 0) >= 55) return <CloudRain />; if ((rain ?? 0) >= 20) return <Cloud />; return <Sun />; }
function WeatherShell({ children, active = '/magina/tiempo' }: { children: React.ReactNode; active?: string }) { return <><a className="skip-link" href="#main-content">Saltar al contenido</a><main id="main-content" className="weather-experience-shell"><VisualHeader /><div className="weather-experience-page">{children}</div><PublicNavigation activePath={active} /></main></>; }
function WeatherIntro({ title, copy, place }: { title: string; copy: string; place?: string }) { return <header className="weather-experience-intro"><p className="eyebrow">METEOROLOGÍA</p><h1>{title}</h1>{place ? <h2>{place}</h2> : null}<p>{copy}</p></header>; }

function useDailyWeather() {
  const [data, setData] = useState<DailyWeather | null>(null); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); void fetch('/api/v1/public/weather?municipality=huelma', { signal: controller.signal, headers: { accept: 'application/json' } }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch((e) => { if (e.name !== 'AbortError') setError('La previsión no está disponible temporalmente.'); }); return () => controller.abort(); }, []);
  return { data, error };
}

export function WeatherWeeklyPage() {
  const { data, error } = useDailyWeather(); const today = data?.forecast.days[0];
  return <WeatherShell><WeatherIntro title="Previsión semanal" place={data ? `${data.municipality.name} / Sierra Mágina` : 'Sierra Mágina'} copy="Consulta la previsión de los próximos 7 días y planifica tus labores." />
    {error ? <div className="alert">{error}</div> : null}
    <section className="card weather-current-card"><WeatherIcon rain={today?.precipitationProbabilityPercent} /><div><strong>{fmt(today?.temperatureMaxC ?? null, '°C')}</strong><p>Previsión municipal</p><small>{data ? `${data.municipality.name} · ${data.municipality.province}` : 'Consultando AEMET…'}</small></div><dl><div><dt><Droplets />Probabilidad de lluvia</dt><dd>{fmt(today?.precipitationProbabilityPercent ?? null, '%')}</dd></div><div><dt><Wind />Viento máximo</dt><dd>{fmt(today?.windMaxKmh ?? null, ' km/h')}</dd></div><div><dt><Thermometer />Mínima</dt><dd>{fmt(today?.temperatureMinC ?? null, '°')}</dd></div></dl></section>
    <section className="card weather-week-list">{data?.forecast.days.map((day) => { const label = dateParts(day.date); const caution = (day.precipitationProbabilityPercent ?? 0) >= 50; return <article key={day.date}><span><strong>{label.weekday}</strong><small>{label.date}</small></span><WeatherIcon rain={day.precipitationProbabilityPercent} /><b>{fmt(day.temperatureMaxC, '°')} <em>/ {fmt(day.temperatureMinC, '°')}</em></b><span className="weather-rain-value"><Droplets />{fmt(day.precipitationProbabilityPercent, '%')}</span><span className={`weather-condition-chip${caution ? ' caution' : ''}`}>{caution ? <AlertTriangle /> : <Sprout />}{caution ? 'Precaución lluvia' : 'Condiciones favorables'}</span></article>; })}</section>
    <div className="weather-actions"><a className="primary-button" href="/magina/tiempo/horas">Ver previsión por horas</a><a className="secondary-button" href="/magina/alertas/configurar">Configurar alertas</a></div>
    <section className="card weather-impact-card"><span className="profile-link-icon"><Sprout /></span><div><p className="eyebrow">IMPACTO EN TUS PARCELAS</p><p>Consulta la lluvia, el viento y la temperatura antes de organizar tratamientos, riego o recolección.</p></div><ChevronRight /></section>
    <p className="weather-trust-note">Fuente: {data?.source.attribution ?? 'AEMET'} · {data?.source.scopeNote ?? 'Predicción municipal.'}</p>
  </WeatherShell>;
}

export function WeatherHourlyPage() {
  const [data, setData] = useState<HourlyWeather | null>(null); const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/v1/public/weather/hourly?municipality=huelma', { headers: { accept: 'application/json' } }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => setError('La previsión horaria de AEMET no está disponible ahora.')); }, []);
  const hours = data?.forecast.hours.filter((_, index) => index % 2 === 0).slice(0, 8) ?? [];
  const selected = hours[0];
  return <WeatherShell><WeatherIntro title="Previsión por horas" copy={`Consulta la evolución del tiempo en ${data?.municipality.name ?? 'tu municipio'} y planifica tus labores en Sierra Mágina.`} />
    <section className="card weather-plot-selector"><span className="profile-link-icon"><MapPin /></span><span><small>UBICACIÓN SELECCIONADA</small><strong>{data ? `${data.municipality.name} · ${data.municipality.province}` : 'Sierra Mágina'}</strong></span></section>
    {error ? <div className="alert">{error}</div> : null}
    <section className="card weather-hour-strip">{hours.map((hour) => { const at = new Date(hour.dateTime); return <article key={hour.dateTime}><time>{at.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</time><WeatherIcon rain={hour.precipitationProbabilityPercent} night={at.getHours() >= 21 || at.getHours() < 7} /><strong>{fmt(hour.temperatureC, '°')}</strong><small><Droplets />{fmt(hour.precipitationProbabilityPercent, '%')}</small><small><Wind />{fmt(hour.windKmh, ' km/h')}</small></article>; })}</section>
    <section className="card weather-hour-summary"><div><p className="eyebrow">PRÓXIMAS HORAS</p><WeatherIcon rain={selected?.precipitationProbabilityPercent} /><strong>{fmt(selected?.temperatureC ?? null, '°')}</strong></div><dl><div><dt>Humedad</dt><dd>{fmt(selected?.humidityPercent ?? null, '%')}</dd></div><div><dt>Viento</dt><dd>{selected ? `${selected.windDirection ?? '—'} · ${fmt(selected.windKmh, ' km/h')}` : '—'}</dd></div><div><dt>Precipitación</dt><dd>{fmt(selected?.precipitationProbabilityPercent ?? null, '%')}</dd></div></dl></section>
    <section className="card weather-recommendation"><span className="profile-link-icon"><Sprout /></span><div><p className="eyebrow">CONTEXTO PARA TUS LABORES</p><strong>Revisa las horas con menor probabilidad de lluvia y viento antes de actuar.</strong><small>La predicción municipal es orientativa y no sustituye una recomendación agronómica.</small></div><ChevronRight /></section>
  </WeatherShell>;
}

type RainAlerts = { items: Array<{ municipalityName: string; forecastDate: string; precipitationProbabilityPercent: number; thresholdPercent: number; provider: string }> };
type RadarFrames = { items: Array<{ id: string; capturedAt: string; imageUrl: string }>; source: { attribution: string } };
export function WeatherAlertDetailPage() {
  const [alert, setAlert] = useState<RainAlerts['items'][number] | null>(null);
  const [radar, setRadar] = useState<RadarFrames | null>(null);
  useEffect(() => { void fetch('/api/v1/account/rain-alerts', { credentials: 'include', headers: { accept: 'application/json' } }).then((r) => r.ok ? r.json() : Promise.reject()).then((value: RainAlerts) => setAlert(value.items[0] ?? null)).catch(() => undefined); }, []);
  useEffect(() => { void fetch('/api/v1/public/weather/radar/frames', { headers: { accept: 'application/json' } }).then((r) => r.ok ? r.json() : Promise.reject()).then(setRadar).catch(() => undefined); }, []);
  const latestRadar = radar?.items.at(-1);
  return <WeatherShell><WeatherIntro title="Detalle de alerta" copy="Información sobre un aviso meteorológico que puede afectar a tu olivar." />
    <section className="card weather-alert-main"><span className="weather-alert-icon"><AlertTriangle /></span><div><h2>{alert ? `Lluvias previstas en ${alert.municipalityName}` : 'Sin alerta activa'}</h2><span className="weather-risk-chip">{alert ? 'RIESGO MODERADO' : 'VIGILANCIA'}</span><dl><div><dt><Bell />Periodo</dt><dd>{alert ? dateParts(alert.forecastDate).date : 'Próximos 2 días'}</dd></div><div><dt><CloudRain />Probabilidad</dt><dd>{alert ? `${alert.precipitationProbabilityPercent}%` : 'Por debajo del umbral'}</dd></div><div><dt><MapPin />Ámbito</dt><dd>{alert?.municipalityName ?? 'Tu municipio'}</dd></div></dl></div></section>
    <section className="card weather-detail-row"><span className="profile-link-icon"><Sprout /></span><div><p className="eyebrow">IMPACTO PREVISTO</p><p>La lluvia puede modificar la humedad del terreno y la planificación de tratamientos y accesos.</p></div></section>
    <section className="card weather-detail-row"><span className="profile-link-icon"><Info /></span><div><p className="eyebrow">RECOMENDACIONES</p><p>Mantente atento a la evolución y revisa el estado real del terreno después del episodio.</p></div></section>
    <section className="card weather-detail-row"><span className="profile-link-icon"><Check /></span><div><p className="eyebrow">ACCIONES SUGERIDAS</p><ul><li>Revisar el sistema de riego</li><li>Evitar tratamientos durante la lluvia</li><li>Vigilar accesos y caminos</li></ul></div></section>
    {latestRadar ? <figure className="weather-alert-radar"><img src={latestRadar.imageUrl} alt="Último fotograma disponible del radar de precipitación" /><figcaption><strong>Radar de precipitación</strong><span>{radar?.source.attribution}</span></figcaption></figure> : null}
    <a className="primary-button weather-detail-cta" href="/magina/tiempo/radar">Ver radar en tiempo real</a>
  </WeatherShell>;
}

type PlotAlertConfig = { enabled: boolean; push: boolean; email: boolean; sms: boolean; lead: '30 min' | '1 h' | '3 h'; intensity: 'Lluvia débil' | 'Lluvia moderada' | 'Lluvia fuerte'; schedule: string };
const defaultConfig: PlotAlertConfig = { enabled: true, push: true, email: false, sms: false, lead: '1 h', intensity: 'Lluvia moderada', schedule: 'Todo el día' };
export function WeatherAlertSettingsPage() {
  const [plots, setPlots] = useState<Array<Plot & { farmName: string }>>([]); const [configs, setConfigs] = useState<Record<string, PlotAlertConfig>>({}); const [notice, setNotice] = useState('');
  useEffect(() => { void api.holdings().then(async ({ items }: { items: Holding[] }) => { const farms = (await Promise.all(items.map((holding) => api.farms(holding.id)))).flatMap((result) => result.items); const rows = (await Promise.all(farms.map(async (farm) => (await api.plots(farm.id)).items.map((plot) => ({ ...plot, farmName: farm.name }))))).flat(); setPlots(rows); const saved = JSON.parse(localStorage.getItem('magina-plot-weather-alerts-v1') || '{}') as Record<string, PlotAlertConfig>; setConfigs(Object.fromEntries(rows.map((plot) => [plot.id, { ...defaultConfig, ...saved[plot.id] }]))); }); }, []);
  const update = (id: string, patch: Partial<PlotAlertConfig>) => setConfigs((current) => ({ ...current, [id]: { ...(current[id] ?? defaultConfig), ...patch } }));
  const save = () => { localStorage.setItem('magina-plot-weather-alerts-v1', JSON.stringify(configs)); setNotice('Configuración guardada en este dispositivo.'); };
  return <WeatherShell><WeatherIntro title="Configurar alertas" copy="Recibe avisos personalizados y anticípate a los cambios en tu olivar." />
    <nav className="weather-alert-tabs"><button className="active"><CloudRain />Lluvia</button><button disabled><Wind />Viento</button><button disabled><Thermometer />Temperatura</button><button disabled><Snowflake />Heladas</button></nav>
    <div className="weather-settings-note"><Info /><span>Configura los avisos de lluvia para cada parcela. Podrás modificar estos ajustes en cualquier momento.</span></div>
    {plots.length === 0 ? <div className="card weather-empty">Añade parcelas en Mi Campo para configurar avisos específicos.</div> : plots.map((plot, index) => { const config = configs[plot.id] ?? defaultConfig; return <section className="card weather-plot-config" key={plot.id}><header><span className="profile-link-icon"><Sprout /></span><span><strong>{plot.name}</strong><small>{plot.farmName}</small></span><label>Alertas activadas <button className={`profile-switch${config.enabled ? ' is-on' : ''}`} role="switch" aria-checked={config.enabled} onClick={() => update(plot.id, { enabled: !config.enabled })}><span /></button></label></header><div className="weather-channel-row"><span>Notificar por</span>{(['push','email','sms'] as const).map((channel) => <label key={channel}><input type="checkbox" checked={config[channel]} onChange={() => update(plot.id, { [channel]: !config[channel] })} />{channel === 'push' ? 'Push' : channel === 'email' ? 'Email' : 'SMS'}</label>)}</div><div className="weather-config-grid"><label>Avisar con antelación<select value={config.lead} onChange={(e) => update(plot.id, { lead: e.target.value as PlotAlertConfig['lead'] })}><option>30 min</option><option>1 h</option><option>3 h</option></select></label><label>Umbral de intensidad<select value={config.intensity} onChange={(e) => update(plot.id, { intensity: e.target.value as PlotAlertConfig['intensity'] })}><option>Lluvia débil</option><option>Lluvia moderada</option><option>Lluvia fuerte</option></select></label><label>Franja horaria<select value={config.schedule} onChange={(e) => update(plot.id, { schedule: e.target.value })}><option>Todo el día</option><option>Entre 08:00 y 20:00</option></select></label></div>{index === 0 ? <small className="weather-local-note">Canales e intensidad se guardan localmente; la alarma municipal AEMET sigue usando la preferencia segura de la cuenta.</small> : null}</section>; })}
    {notice ? <div className="alert success">{notice}</div> : null}<button className="primary-button weather-settings-save" onClick={save}>Guardar configuración</button>
  </WeatherShell>;
}
