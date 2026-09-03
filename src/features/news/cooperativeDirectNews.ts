export type CooperativeDirectNewsSource = {
  label: string;
  url: string;
};

const sources: Record<string, CooperativeDirectNewsSource> = {
  'cristo-misericordia-jodar': {
    label: 'Noticias oficiales de La Quinta Esencia',
    url: 'https://laquintaesencia.com/',
  },
  'remedios-jimena': {
    label: 'Noticias oficiales de Oro de Cánava',
    url: 'https://www.orodecanava.com/es/lista-noticias-aceite-oliva',
  },
  'paz-belmez': {
    label: 'Blog oficial de La Perla de Mágina',
    url: 'https://laperlademagina.es/blog/',
  },
  'san-francisco-albanchez': {
    label: 'Noticias oficiales de Cooperativa San Francisco',
    url: 'https://www.aovesierramagina.com/',
  },
  'santa-isabel-torres': {
    label: 'Noticias oficiales de Santa Isabel de Torres',
    url: 'https://santaisabeldetorres.com/noticias/',
  },
  'union-santo-cristo-cabra': {
    label: 'Blog oficial de Salud Sierra',
    url: 'https://saludsierra.es/?page_id=18',
  },
  'union-oleicola-cambil': {
    label: 'Noticias oficiales de Esmeralda de Mágina',
    url: 'https://esmeraldamagina.es/noticias/',
  },
  'san-roque-carchelejo': {
    label: 'Noticias oficiales de Tierras del Marquesado',
    url: 'https://tierrasdelmarquesado.com/noticias/',
  },
};

export function getCooperativeDirectNewsSource(id: string): CooperativeDirectNewsSource | null {
  return sources[id] ?? null;
}
