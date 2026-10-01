import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Building2,
  CloudRain,
  MapPinned,
  Sprout,
  TrendingUp,
} from 'lucide-react';
import { Brand } from '../../components/Brand';

type OnboardingTourProps = {
  onFinish: () => void;
};

const slides = [
  {
    eyebrow: 'Bienvenido a Mágina Olivo',
    title: 'Tu olivar, en un solo lugar',
    text: 'Consulta lo importante de tu explotación sin saltar entre papeles, webs y aplicaciones diferentes.',
    icon: Sprout,
    image: 'photos/home-sierra-magina.webp',
    points: ['Resumen diario de tu campo', 'Accesos rápidos a tareas y alertas', 'Información pensada para Sierra Mágina'],
  },
  {
    eyebrow: 'Mi Campo',
    title: 'Fincas, parcelas y cuaderno de campo',
    text: 'Organiza cada parcela, registra labores y conserva la historia de cada campaña desde el móvil.',
    icon: MapPinned,
    image: 'photos/field-olivares-magina.webp',
    points: ['Parcelas y mapa', 'Cuaderno, tareas y documentos', 'Entregas, rendimientos y costes'],
  },
  {
    eyebrow: 'Tiempo y alertas',
    title: 'Decide mejor antes de salir al campo',
    text: 'La meteorología se transforma en información útil: lluvia, viento, ventanas de trabajo y avisos que afectan al olivar.',
    icon: CloudRain,
    image: 'photos/home-sierra-magina.webp',
    points: ['Previsión por zona y finca', 'Alarma de lluvia', 'Alertas de campo y fitosanitarias'],
  },
  {
    eyebrow: 'Aceite y cooperativas',
    title: 'Mercado y actualidad, más cerca',
    text: 'Sigue el precio del aceite, consulta cooperativas y encuentra avisos y noticias relevantes para la campaña.',
    icon: TrendingUp,
    image: 'photos/discover-jimena.webp',
    points: ['AOVE, virgen y lampante', 'Cooperativas y servicios', 'Noticias y avisos verificados'],
  },
  {
    eyebrow: 'Sierra Mágina',
    title: 'Una app para el campo y para la comarca',
    text: 'Servicios, agenda, pueblos, rutas y contenido local completan una herramienta hecha para acompañarte campaña tras campaña.',
    icon: Building2,
    image: 'photos/discover-sierra-magina.webp',
    points: ['Servicios y agenda local', 'Descubre Sierra Mágina', 'Tus preferencias en Mi Mágina'],
  },
] as const;

export function OnboardingTour({ onFinish }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;
  const base = import.meta.env.BASE_URL;

  return (
    <div className="welcome-tour">
      <header className="welcome-tour__topbar">
        <Brand />
        <button className="welcome-tour__skip" type="button" onClick={onFinish}>Saltar</button>
      </header>

      <main className="welcome-tour__content">
        <section
          className="welcome-tour__visual"
          style={{ backgroundImage: `url(${base}${slide.image})` }}
          aria-label={`Paso ${step + 1} de ${slides.length}`}
        >
          <div className="welcome-tour__shade" />
          <div className="welcome-tour__icon"><Icon size={34} /></div>
          {step === 2 && <div className="welcome-tour__mini-badge"><BellRing size={15} /> Lluvia y avisos</div>}
        </section>

        <section className="welcome-tour__copy">
          <div className="welcome-tour__step">Paso {step + 1} de {slides.length}</div>
          <span className="eyebrow">{slide.eyebrow}</span>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
          <div className="welcome-tour__points">
            {slide.points.map((point) => <span key={point}><i />{point}</span>)}
          </div>
        </section>
      </main>

      <footer className="welcome-tour__footer">
        <div className="welcome-tour__dots" aria-label="Progreso de introducción">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Ir al paso ${index + 1}`}
              className={index === step ? 'welcome-tour__dot welcome-tour__dot--active' : 'welcome-tour__dot'}
              onClick={() => setStep(index)}
            />
          ))}
        </div>

        <div className="welcome-tour__actions">
          {step > 0 && (
            <button className="welcome-tour__back" type="button" onClick={() => setStep((current) => current - 1)}>
              <ArrowLeft size={17} /> Atrás
            </button>
          )}
          <button
            className="welcome-tour__next"
            type="button"
            onClick={() => isLast ? onFinish() : setStep((current) => current + 1)}
          >
            {isLast ? 'Entrar en Mágina Olivo' : 'Siguiente'}
            <ArrowRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
