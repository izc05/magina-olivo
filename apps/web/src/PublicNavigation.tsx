import { useEffect, useState } from 'react';
import { api } from './api';

type Destination = { href: string; label: string; icon: 'home' | 'field' | 'magina' | 'discover' | 'profile' };

const anonymousDestinations: Destination[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/mi-campo', label: 'Mi Campo', icon: 'field' },
  { href: '/magina', label: 'Mágina', icon: 'magina' },
  { href: '/descubre', label: 'Descubre', icon: 'discover' },
  { href: '/mi-magina', label: 'Mi Mágina', icon: 'profile' },
];
const signedInDestinations: Destination[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/mi-campo', label: 'Mi Campo', icon: 'field' },
  { href: '/magina', label: 'Mágina', icon: 'magina' },
  { href: '/mi-magina', label: 'Mi Mágina', icon: 'profile' },
];

function LineIcon({ name }: { name: Destination['icon'] }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-6h6v6" /></>,
    field: <><path d="M4 20c7 0 13-4 16-14-8 1-14 6-16 14Z" /><path d="M4 20c3-5 7-8 12-11" /></>,
    magina: <><path d="m3 19 6-8 4 5 3-4 5 7H3Z" /><path d="M14 5h.01" /></>,
    discover: <><circle cx="12" cy="12" r="8" /><path d="m10 9 5 2-3 4-2-6Z" /></>,
    profile: <><circle cx="12" cy="8" r="3" /><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" /></>,
  }[name];
  return <svg className="nav-line-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

export function PublicNavigation({ activePath }: { activePath: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void api.me().then(() => { if (!cancelled) setSignedIn(true); }).catch(() => { if (!cancelled) setSignedIn(false); });
    return () => { cancelled = true; };
  }, []);

  const destinations = signedIn ? signedInDestinations : anonymousDestinations;
  const beforeContextual = signedIn ? destinations.slice(0, 2) : destinations;
  const afterContextual = signedIn ? destinations.slice(2) : [];
  return (
    <nav className="public-navigation" aria-label="Navegación principal">
      {beforeContextual.map((destination) => <a className={activePath === destination.href ? 'active' : ''} href={destination.href} key={destination.href} aria-current={activePath === destination.href ? 'page' : undefined}><LineIcon name={destination.icon} /><span>{destination.label}</span></a>)}
      {signedIn ? <a className="public-nav-action" href="/campana" aria-label="Registrar una entrega"><span aria-hidden="true">+</span></a> : null}
      {afterContextual.map((destination) => <a className={activePath === destination.href ? 'active' : ''} href={destination.href} key={destination.href} aria-current={activePath === destination.href ? 'page' : undefined}><LineIcon name={destination.icon} /><span>{destination.label}</span></a>)}
    </nav>
  );
}
