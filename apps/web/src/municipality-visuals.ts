export type MunicipalityVisual = {
  slug: string;
  name: string;
  aliases: readonly string[];
  ready: boolean;
  heroDesktop: string;
  heroMobile: string;
  thumbnail: string;
  objectPositionDesktop: string;
  objectPositionMobile: string;
  alt: string;
  photoAuthor: string | null;
  photoSource: string | null;
  photoLicense: string | null;
};

export const MUNICIPALITY_PREFERENCE_KEY = 'magina-olivo-public-municipality';
export const MUNICIPALITY_CHANGE_EVENT = 'magina:municipality-change';
export const DEFAULT_MUNICIPALITY_SLUG = 'bedmar-y-garciez';
export const DEFAULT_TERRITORY_HERO = '/photos/home-sierra-magina.webp';

function visual(slug: string, name: string, aliases: readonly string[] = []): MunicipalityVisual {
  return {
    slug,
    name,
    aliases,
    ready: false,
    heroDesktop: `/municipalities/${slug}/hero.webp`,
    heroMobile: `/municipalities/${slug}/hero-mobile.webp`,
    thumbnail: `/municipalities/${slug}/thumb.webp`,
    objectPositionDesktop: 'center center',
    objectPositionMobile: 'center center',
    alt: `Vista de ${name}, Sierra Mágina`,
    photoAuthor: null,
    photoSource: null,
    photoLicense: null,
  };
}

export const MUNICIPALITY_VISUALS = [
  visual('albanchez-de-magina', 'Albanchez de Mágina'),
  visual('bedmar-y-garciez', 'Bedmar y Garcíez', ['Bedmar', 'Garcíez']),
  visual('belmez-de-la-moraleda', 'Bélmez de la Moraleda'),
  visual('cabra-del-santo-cristo', 'Cabra del Santo Cristo'),
  visual('cambil', 'Cambil', ['Arbuniel', 'Cambil-Arbuniel']),
  visual('campillo-de-arenas', 'Campillo de Arenas'),
  visual('carcheles', 'Cárcheles', ['Carchelejo', 'Cárchel']),
  visual('guardia-de-jaen', 'La Guardia de Jaén', ['Guardia de Jaén']),
  visual('huelma', 'Huelma', ['Solera', 'Huelma-Solera']),
  visual('jimena', 'Jimena'),
  visual('jodar', 'Jódar'),
  visual('larva', 'Larva'),
  visual('mancha-real', 'Mancha Real'),
  visual('pegalajar', 'Pegalajar'),
  visual('torres', 'Torres'),
] as const satisfies readonly MunicipalityVisual[];

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveMunicipalitySlug(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const key = normalized(value);
  const match = MUNICIPALITY_VISUALS.find((item) =>
    normalized(item.slug) === key
      || normalized(item.name) === key
      || item.aliases.some((alias) => normalized(alias) === key),
  );
  return match?.slug ?? null;
}

export function municipalityVisual(slug: string | null | undefined): MunicipalityVisual {
  return MUNICIPALITY_VISUALS.find((item) => item.slug === slug)
    ?? MUNICIPALITY_VISUALS.find((item) => item.slug === DEFAULT_MUNICIPALITY_SLUG)!;
}

export function municipalityHeroSources(item: MunicipalityVisual): { desktop: string; mobile: string; alt: string } {
  if (!item.ready) {
    return {
      desktop: DEFAULT_TERRITORY_HERO,
      mobile: DEFAULT_TERRITORY_HERO,
      alt: 'Olivares y montañas de Sierra Mágina',
    };
  }
  return { desktop: item.heroDesktop, mobile: item.heroMobile, alt: item.alt };
}

export function readPreferredMunicipality(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(MUNICIPALITY_PREFERENCE_KEY);
    return value && MUNICIPALITY_VISUALS.some((item) => item.slug === value) ? value : null;
  } catch {
    return null;
  }
}

export function writePreferredMunicipality(slug: string): void {
  if (!MUNICIPALITY_VISUALS.some((item) => item.slug === slug)) return;
  try {
    localStorage.setItem(MUNICIPALITY_PREFERENCE_KEY, slug);
  } catch {
    // The visible selection can still work when storage is blocked.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MUNICIPALITY_CHANGE_EVENT, { detail: { slug } }));
}
