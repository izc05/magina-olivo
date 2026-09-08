import { Bell, BookOpen, CalendarCheck, CloudSun, Compass, House, Mountain, Sprout, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

export const navigationIcons = { home: House, field: Sprout, magina: Mountain, discover: Compass, profile: UserRound };
export const quickIcons = { book: BookOpen, calendar: CalendarCheck, alert: Bell, weather: CloudSun };

/** Shared brand artwork and accessible controls; no fabricated unread counts. */
export function VisualHeader({ children }: { children?: ReactNode }) {
  return <header className="visual-header">
    <a className="visual-brand" href="/" aria-label="Mágina Olivo, Inicio">
      <img src="/brand/magina-olivo-official-mark.png" alt="" width="48" height="54" />
      <span><strong>Mágina Olivo</strong><small>La herramienta digital del olivar</small></span>
    </a>
    {children ?? <a className="visual-header-action" href="/magina/campo" aria-label="Consultar alertas del campo"><Bell aria-hidden="true" /></a>}
  </header>;
}

export function TerritoryLinks() {
  return <nav className="visual-segments" aria-label="Explorar Mágina">
    <a href="/magina/noticias">Noticias</a><a href="/magina/directorio">Cooperativas</a><a href="/magina/mercado">Mercado</a><a href="/descubre">Descubre</a>
  </nav>;
}

type PhotoCreditPhoto = {
  ready: boolean;
  photoAuthor: string | null;
  photoSource: string | null;
  photoLicense: string | null;
  photoLicenseUrl: string | null;
};

export function PhotoCredit({ field = false, photo, municipality }: { field?: boolean; photo?: PhotoCreditPhoto; municipality?: string }) {
  if (photo?.ready && photo.photoAuthor && photo.photoSource && photo.photoLicense && photo.photoLicenseUrl) {
    return <small className="photo-credit">{municipality ? `${municipality} · ` : ''}Foto: <a href={photo.photoSource} target="_blank" rel="noreferrer">{photo.photoAuthor}</a> · <a href={photo.photoLicenseUrl} target="_blank" rel="noreferrer">{photo.photoLicense}</a> · Adaptación y recorte WebP para Mágina Olivo.</small>;
  }

  return <small className="photo-credit">Paisaje de Sierra Mágina · Foto ilustrativa de la comarca. <a href={field ? 'https://commons.wikimedia.org/wiki/File:Olivares_Sierra_M%C3%A1gina.jpg' : 'https://commons.wikimedia.org/wiki/File:Paisaje_de_olivar_24J_05.jpg'} target="_blank" rel="noreferrer">Veinticuatro de Jahén</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · Recorte WebP.</small>;
}
