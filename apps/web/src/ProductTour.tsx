import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const TOUR_KEY = 'magina-olivo:product-tour:v2';

type TourSlide = {
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
  art: 'olive' | 'field' | 'weather' | 'market' | 'magina';
};

const slides: TourSlide[] = [
  {
    eyebrow: 'Bienvenido a Mágina Olivo',
    title: 'Tu olivar, en un solo lugar',
    text: 'Gestiona tu olivar y consulta la información clave de Sierra Mágina sin saltar entre papeles, webs y aplicaciones diferentes.',
    bullets: ['Resumen diario de tu campo', 'Tareas, alertas y campaña', 'Diseñada para usarla desde el móvil'],
    art: 'olive',
  },
  {
    eyebrow: 'Mi Campo',
    title: 'Fincas, parcelas y cuaderno',
    text: 'Organiza tu explotación, localiza las parcelas y conserva el histórico de labores, entregas, documentos y costes.',
    bullets: ['Mapa y parcelas', 'Cuaderno de campo', 'Campañas, kilos y rendimientos'],
    art: 'field',
  },
  {
    eyebrow: 'Tiempo y alertas',
    title: 'Decide mejor antes de salir al campo',
    text: 'Consulta previsión, lluvia y viento con avisos pensados para ayudarte a decidir cuándo trabajar y qué revisar.',
    bullets: ['Meteorología por zona', 'Alarma de lluvia', 'Alertas fitosanitarias y de campo'],
    art: 'weather',
  },
  {
    eyebrow: 'Aceite y cooperativas',
    title: 'Mercado y actualidad, más cerca',
    text: 'Sigue la evolución del aceite, consulta cooperativas y reúne noticias y avisos relevantes para la campaña.',
    bullets: ['AOVE, virgen y lampante', 'Cooperativas verificadas', 'Noticias y avisos con fuente'],
    art: 'market',
  },
  {
    eyebrow: 'Sierra Mágina',
    title: 'Una herramienta para el campo y la comarca',
    text: 'Servicios, agenda, pueblos, rutas y contenido local completan una app hecha para acompañarte campaña tras campaña.',
    bullets: ['Servicios y agenda local', 'Descubre Sierra Mágina', 'Preferencias en Mi Mágina'],
    art: 'magina',
  },
];

function shouldOpenTour() {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  return query.get('tour') === '1' || window.localStorage.getItem(TOUR_KEY) !== 'seen';
}

export function ProductTourGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(shouldOpenTour);
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const logoSrc = `${import.meta.env.BASE_URL}brand/magina-olivo-mark.svg`;
  const progress = useMemo(() => `${step + 1} de ${slides.length}`, [step]);

  function finish() {
    window.localStorage.setItem(TOUR_KEY, 'seen');
    const url = new URL(window.location.href);
    if (url.searchParams.get('tour') === '1') {
      url.searchParams.delete('tour');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setOpen(false);
  }

  if (!open) return <>{children}</>;

  return (
    <main className="product-tour" aria-label="Introducción a Mágina Olivo">
      <header className="product-tour__header">
        <div className="product-tour__brand">
          <img src={logoSrc} alt="" />
          <div><strong>Mágina Olivo</strong><span>La herramienta digital del olivar</span></div>
        </div>
        <button className="product-tour__skip" type="button" onClick={finish}>Saltar</button>
      </header>

      <section className="product-tour__body">
        <div className={`product-tour__art product-tour__art--${slide.art}`}>
          <TourArt kind={slide.art} />
          <span className="product-tour__art-label">{progress}</span>
        </div>

        <div className="product-tour__copy">
          <span className="product-tour__eyebrow">{slide.eyebrow}</span>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
          <div className="product-tour__bullets">
            {slide.bullets.map((bullet) => <span key={bullet}><i aria-hidden="true">✓</i>{bullet}</span>)}
          </div>
        </div>
      </section>

      <footer className="product-tour__footer">
        <div className="product-tour__dots" aria-label={`Paso ${progress}`}>
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === step ? 'active' : ''}
              aria-label={`Ir al paso ${index + 1}`}
              aria-current={index === step ? 'step' : undefined}
              onClick={() => setStep(index)}
            />
          ))}
        </div>
        <div className="product-tour__actions">
          {step > 0 ? <button className="product-tour__back" type="button" onClick={() => setStep((current) => current - 1)}>← Atrás</button> : <span />}
          <button className="product-tour__next" type="button" onClick={() => isLast ? finish() : setStep((current) => current + 1)}>
            {isLast ? 'Entrar en Mágina Olivo' : 'Siguiente →'}
          </button>
        </div>
      </footer>
    </main>
  );
}

function TourArt({ kind }: { kind: TourSlide['art'] }) {
  if (kind === 'olive') {
    return (
      <svg viewBox="0 0 360 250" role="img" aria-label="Ilustración de olivar y Sierra Mágina">
        <path d="M0 175C70 138 120 149 181 132C240 116 278 92 360 105V250H0Z" className="tour-fill-soft" />
        <path d="M0 205C79 165 133 184 199 159C260 136 300 131 360 143V250H0Z" className="tour-fill" />
        <path d="M42 176C86 158 111 159 149 150M174 145C218 126 259 119 316 125" className="tour-line" />
        <path d="M135 173C155 150 165 123 169 84M169 116C148 104 139 88 135 73M170 103C191 90 201 73 204 57" className="tour-branch" />
        <ellipse cx="142" cy="91" rx="13" ry="6" transform="rotate(30 142 91)" className="tour-leaf" />
        <ellipse cx="191" cy="78" rx="13" ry="6" transform="rotate(-32 191 78)" className="tour-leaf" />
        <circle cx="166" cy="119" r="6" className="tour-oil" />
      </svg>
    );
  }

  if (kind === 'field') {
    return (
      <svg viewBox="0 0 360 250" role="img" aria-label="Ilustración de parcelas y mapa">
        <rect x="48" y="39" width="264" height="174" rx="26" className="tour-card" />
        <path d="M72 72L151 58L183 109L133 150L77 129Z" className="tour-plot-a" />
        <path d="M188 61L286 75L279 142L202 132L183 109Z" className="tour-plot-b" />
        <path d="M77 129L133 150L194 188L80 190Z" className="tour-plot-c" />
        <path d="M133 150L202 132L279 142L263 190L194 188Z" className="tour-plot-d" />
        <circle cx="204" cy="113" r="12" className="tour-pin" />
        <path d="M204 103C198 103 194 107 194 113C194 121 204 132 204 132C204 132 214 121 214 113C214 107 210 103 204 103Z" className="tour-pin-shape" />
      </svg>
    );
  }

  if (kind === 'weather') {
    return (
      <svg viewBox="0 0 360 250" role="img" aria-label="Ilustración de meteorología y lluvia">
        <circle cx="119" cy="91" r="38" className="tour-sun" />
        <path d="M121 160C121 127 147 105 177 105C197 105 214 114 224 130C231 126 239 124 248 124C274 124 294 143 294 168C294 191 276 208 250 208H118C91 208 70 190 70 165C70 143 87 127 110 125" className="tour-cloud" />
        <path d="M130 215L119 236M181 215L170 236M232 215L221 236" className="tour-rain" />
        <path d="M80 64L66 52M159 55L168 38M84 105L65 108" className="tour-rays" />
      </svg>
    );
  }

  if (kind === 'market') {
    return (
      <svg viewBox="0 0 360 250" role="img" aria-label="Ilustración de evolución del precio del aceite">
        <rect x="42" y="36" width="276" height="177" rx="26" className="tour-card" />
        <path d="M76 174L117 151L154 158L195 122L231 130L282 82" className="tour-chart-line" />
        <path d="M76 174L117 151L154 158L195 122L231 130L282 82L282 184L76 184Z" className="tour-chart-area" />
        <circle cx="282" cy="82" r="8" className="tour-oil" />
        <path d="M86 72C99 50 120 50 133 72C145 92 135 111 109 121C82 111 73 92 86 72Z" className="tour-drop" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 250" role="img" aria-label="Ilustración de Sierra Mágina y sus pueblos">
      <path d="M0 183L80 109L125 151L184 70L229 123L268 95L360 180V250H0Z" className="tour-mountain" />
      <path d="M0 205L78 160L137 198L205 151L270 188L360 150V250H0Z" className="tour-fill" />
      <rect x="91" y="159" width="47" height="39" rx="4" className="tour-house" />
      <path d="M82 162L115 137L148 162Z" className="tour-roof" />
      <rect x="229" y="147" width="55" height="47" rx="4" className="tour-house" />
      <path d="M220 151L256 123L293 151Z" className="tour-roof" />
      <circle cx="53" cy="63" r="17" className="tour-sun" />
    </svg>
  );
}
