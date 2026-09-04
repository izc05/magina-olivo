import { municipalAlertEligible, municipalCategory, municipalSeverity } from './municipal-alert-rules.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const base = {
  municipalityId: 'test-municipio',
  municipalityName: 'Municipio de prueba',
  official: true,
  excerpt: '',
};

const negatives = [
  { ...base, title: 'ACTUACIÓN CORO MÚSICO-VOCAL' },
  { ...base, title: 'TOBOGÁN DESLIZADOR / HINCHABLES' },
  { ...base, title: 'Bando de fiestas patronales 2026' },
  { ...base, title: 'Aviso: exposición de fotografía local' },
];

for (const story of negatives) {
  assert(!municipalAlertEligible(story), `Falso positivo municipal: ${story.title}`);
}

const positives = [
  {
    story: { ...base, title: 'Corte de agua por avería en el suministro' },
    severity: 'warning',
    category: 'Agua',
  },
  {
    story: { ...base, title: 'Cierre de camino rural por desprendimiento' },
    severity: 'warning',
    category: 'Caminos rurales',
  },
  {
    story: { ...base, title: 'Ayudas PAC para agricultores: abierto el plazo de solicitud' },
    severity: 'info',
    category: 'Ayudas agrarias',
  },
  {
    story: { ...base, title: 'Prohibición de acceso por riesgo de incendio' },
    severity: 'critical',
    category: 'Incendios',
  },
];

for (const { story, severity, category } of positives) {
  assert(municipalAlertEligible(story), `Falso negativo municipal: ${story.title}`);
  assert(municipalSeverity(story) === severity, `Severidad incorrecta para: ${story.title}`);
  assert(municipalCategory(story) === category, `Categoría incorrecta para: ${story.title}`);
}

console.log(`Reglas municipales válidas: ${negatives.length} falsos positivos bloqueados · ${positives.length} casos operativos aceptados.`);
