export type RealNewsStory = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  source: string;
  url: string;
  publishedAt: string;
  region?: string;
};

export type RealNewsPayload = {
  generatedAt: string;
  stories: RealNewsStory[];
};

export async function loadRealNews(): Promise<RealNewsPayload> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/news.json?ts=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar el feed de noticias (${response.status})`);
  }

  const payload = await response.json() as RealNewsPayload;
  if (!Array.isArray(payload.stories)) {
    throw new Error('Formato de noticias no válido');
  }

  return payload;
}

export function formatNewsAge(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  const diffMs = Date.now() - date.getTime();
  const hours = Math.max(0, Math.floor(diffMs / 3_600_000));

  if (hours < 1) return 'Hace menos de 1 h';
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
