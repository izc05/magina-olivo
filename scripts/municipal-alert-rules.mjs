const waterTerms = [
  'corte de agua', 'corte del agua', 'interrupción del suministro', 'interrupcion del suministro',
  'abastecimiento de agua', 'avería de agua', 'averia de agua', 'restricción de agua', 'restriccion de agua',
];

const roadTerms = [
  'camino rural', 'caminos rurales', 'corte de camino', 'cierre de camino',
  'camino cortado', 'camino cerrado', 'acceso rural',
];

const hazardTerms = [
  'incendio', 'riesgo de incendio', 'emergencia', 'desprendimiento',
  'inundación', 'inundacion', 'inundaciones',
];

const restrictionTerms = [
  'restricción', 'restriccion', 'prohibición', 'prohibicion',
];

const agricultureTerms = [
  'agricultura', 'agrario', 'agraria', 'agrícola', 'agricola', 'agricultor', 'agricultores',
  'olivar', 'olivo', 'aceituna', 'cosecha', 'campaña', 'pac', 'ganadería', 'ganaderia', 'regadío', 'regadio',
];

const aidTerms = [
  'ayuda', 'ayudas', 'subvención', 'subvencion', 'subvenciones', 'plazo', 'solicitud', 'solicitudes',
];

const culturalTerms = [
  'concierto', 'coro', 'música', 'musica', 'fiesta', 'fiestas', 'tobogán', 'tobogan', 'hinchable',
  'verbena', 'festival', 'teatro', 'exposición', 'exposicion', 'campeonato', 'grand prix',
];

function textFor(story) {
  return `${story?.title ?? ''} ${story?.excerpt ?? story?.summary ?? ''}`.toLocaleLowerCase('es');
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function municipalAlertEligible(story) {
  if (!story?.municipalityId || story.official !== true) return false;
  const text = textFor(story);

  const operational = includesAny(text, waterTerms)
    || includesAny(text, roadTerms)
    || includesAny(text, hazardTerms)
    || includesAny(text, restrictionTerms);
  const agrarianAid = includesAny(text, agricultureTerms) && includesAny(text, aidTerms);

  if (includesAny(text, culturalTerms) && !operational && !agrarianAid) return false;
  return operational || agrarianAid;
}

export function municipalSeverity(story) {
  const text = textFor(story);
  if (['emergencia', 'incendio', 'prohibición', 'prohibicion'].some((term) => text.includes(term))) return 'critical';
  if (includesAny(text, waterTerms) || includesAny(text, roadTerms) || ['restricción', 'restriccion', 'desprendimiento', 'inundación', 'inundacion'].some((term) => text.includes(term))) return 'warning';
  return 'info';
}

export function municipalCategory(story) {
  const text = textFor(story);
  if (includesAny(text, roadTerms)) return 'Caminos rurales';
  if (includesAny(text, waterTerms)) return 'Agua';
  if (text.includes('incendio')) return 'Incendios';
  if (includesAny(text, agricultureTerms) && includesAny(text, aidTerms)) return 'Ayudas agrarias';
  return 'Aviso municipal';
}
