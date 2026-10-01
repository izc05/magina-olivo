import {
  ArrowLeft,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Leaf,
  Sun,
  ThermometerSun,
  Wind,
} from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav, MainSection } from '../../components/BottomNav';
import '../../styles/weather.css';

type WeatherPageProps = {
  onBack: () => void;
  onNavigate: (section: MainSection) => void;
};

const hourly = [
  { hour: '09', temp: '18°', rain: '5%', icon: Sun },
  { hour: '12', temp: '22°', rain: '8%', icon: Sun },
  { hour: '15', temp: '25°', rain: '12%', icon: CloudSun },
  { hour: '18', temp: '23°', rain: '18%', icon: CloudSun },
  { hour: '21', temp: '19°', rain: '24%', icon: CloudRain },
];

const days = [
  { day: 'Hoy', max: '26°', min: '14°', rain: '10%', icon: Sun },
  { day: 'Jue', max: '27°', min: '15°', rain: '15%', icon: CloudSun },
  { day: 'Vie', max: '24°', min: '14°', rain: '40%', icon: CloudRain },
  { day: 'Sáb', max: '22°', min: '13°', rain: '55%', icon: CloudRain },
  { day: 'Dom', max: '25°', min: '14°', rain: '20%', icon: CloudSun },
];

export function WeatherPage({ onBack, onNavigate }: WeatherPageProps) {
  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar weather-topbar">
          <button className="icon-button" type="button" aria-label="Volver" onClick={onBack}><ArrowLeft size={20} /></button>
          <Brand compact />
          <div className="weather-topbar__spacer" />
        </header>

        <section className="weather-hero-v2">
          <div className="weather-hero-v2__glow" />
          <div className="weather-hero-v2__head">
            <div><span>Los Llanos · Bedmar</span><strong>22°</strong><p>Soleado con intervalos nubosos</p></div>
            <CloudSun size={58} />
          </div>
          <div className="weather-hero-v2__range"><span>Máx. 26°</span><span>Mín. 14°</span><span>Sensación 22°</span></div>
        </section>

        <section className="weather-action-card weather-action-card--good">
          <Leaf size={22} />
          <div><span className="eyebrow">Ventana de trabajo</span><strong>Buena mañana para labores de campo</strong><p>Viento moderado y baja probabilidad de lluvia durante las próximas horas.</p></div>
        </section>

        <section className="weather-metric-grid">
          <article><Droplets size={20} /><span>Humedad</span><strong>48%</strong></article>
          <article><Wind size={20} /><span>Viento</span><strong>12 km/h</strong></article>
          <article><Gauge size={20} /><span>Presión</span><strong>1018 hPa</strong></article>
          <article><ThermometerSun size={20} /><span>Suelo</span><strong>19°</strong></article>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Próximas horas</span><h2>Hoy</h2></div><small className="weather-demo-label">Datos demo</small></div>
          <div className="hourly-weather-list">
            {hourly.map(({ hour, temp, rain, icon: Icon }) => (
              <article key={hour}><span>{hour}:00</span><Icon size={21} /><strong>{temp}</strong><small>{rain}</small></article>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Precipitación</span><h2>Próximas 24 h</h2></div><CloudRain size={21} /></div>
          <article className="rain-chart-card">
            <div className="rain-chart-card__head"><div><strong>Riesgo bajo por la mañana</strong><span>Aumenta al final del día</span></div><span>Máx. 24%</span></div>
            <svg viewBox="0 0 520 190" role="img" aria-label="Probabilidad de lluvia durante el día">
              <g stroke="#ded8c9" strokeWidth="1"><line x1="24" y1="42" x2="500" y2="42"/><line x1="24" y1="95" x2="500" y2="95"/><line x1="24" y1="148" x2="500" y2="148"/></g>
              <path d="M28 148L110 140L190 134L270 126L350 112L430 90L500 76" fill="none" stroke="#6f8794" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M28 148L110 140L190 134L270 126L350 112L430 90L500 76L500 160L28 160Z" fill="#9fb3bf" opacity=".18"/>
            </svg>
          </article>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">5 días</span><h2>Previsión</h2></div></div>
          <div className="forecast-list">
            {days.map(({ day, max, min, rain, icon: Icon }) => (
              <article key={day}><strong>{day}</strong><Icon size={20} /><span>{rain}</span><div><b>{max}</b><small>{min}</small></div></article>
            ))}
          </div>
        </section>

        <section className="section-block section-block--last">
          <article className="weather-advice-card">
            <Wind size={22} />
            <div><span className="eyebrow">Recomendación agrícola</span><strong>Revisa el viento antes de tratamientos</strong><p>La pantalla meteorológica debe traducir la previsión en decisiones útiles para el olivar, no limitarse a mostrar números.</p></div>
          </article>
        </section>
      </main>
      <BottomNav active="home" onNavigate={onNavigate} onCreate={() => onNavigate('field')} />
    </div>
  );
}
