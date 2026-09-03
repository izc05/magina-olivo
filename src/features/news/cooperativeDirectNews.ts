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
    url: 'https://www.orodecanava.com/',
  },
  'san-francisco-albanchez': {
    label: 'Noticias oficiales de Cooperativa San Francisco',
    url: 'https://www.aovesierramagina.com/',
  },
  'san-roque-carchelejo': {
    label: 'Noticias oficiales de Tierras del Marquesado',
    url: 'https://tierrasdelmarquesado.com/noticias/',
  },
};

export function getCooperativeDirectNewsSource(id: string): CooperativeDirectNewsSource | null {
  return sources[id] ?? null;
}
