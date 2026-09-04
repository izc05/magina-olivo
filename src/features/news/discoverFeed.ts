export type DiscoverPlace = {
  id: string;
  name: string;
  municipality: string;
  kind: string;
  summary: string;
  url: string;
  official: boolean;
};

export type DiscoverPayload = {
  generatedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  heroImage: string;
  places: DiscoverPlace[];
};

function getDiscoverPath(): string {
  const pathname = window.location.pathname;
  const base = pathname.startsWith('/magina-olivo/') ? '/magina-olivo/' : '/';
  return `${base}data/discover.json`;
}

export function resolveDiscoverAsset(path: string): string {
  const base = window.location.pathname.startsWith('/magina-olivo/') ? '/magina-olivo/' : '/';
  return `${base}${path.replace(/^\//, '')}`;
}

export async function loadDiscover(): Promise<DiscoverPayload> {
  const response = await fetch(`${getDiscoverPath()}?ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar Descubre (${response.status})`);

  const payload = await response.json() as DiscoverPayload;
  if (!Array.isArray(payload.places)) throw new Error('Formato de Descubre no válido');
  return payload;
}
