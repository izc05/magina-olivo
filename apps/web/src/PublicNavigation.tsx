import { useEffect, useState } from 'react';
import { api } from './api';
import { Plus } from 'lucide-react';
import { navigationIcons } from './VisualChrome';

type Destination = { href: string; label: string; icon: 'home' | 'field' | 'magina' | 'discover' | 'profile' };

const publicDestinations: Destination[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/mi-campo', label: 'Mi Campo', icon: 'field' },
  { href: '/magina', label: 'Mágina', icon: 'magina' },
  { href: '/descubre', label: 'Descubre', icon: 'discover' },
  { href: '/cuenta', label: 'Perfil', icon: 'profile' },
];
function LineIcon({ name }: { name: Destination['icon'] }) {
  const Icon = navigationIcons[name];
  return <Icon className="nav-line-icon" aria-hidden="true" strokeWidth={1.7} />;
}

export function PublicNavigation({ activePath, showAction = true }: { activePath: string; showAction?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void api.me().then(() => { if (!cancelled) setSignedIn(true); }).catch(() => { if (!cancelled) setSignedIn(false); });
    return () => { cancelled = true; };
  }, []);

  const isActive = (href: string) => activePath === href || (href === '/magina' && activePath.startsWith('/magina/'));
  return (
    <nav className="public-navigation" aria-label="Navegación principal">
      {publicDestinations.map((destination) => <a className={isActive(destination.href) ? 'active' : ''} href={destination.href} key={destination.href} aria-label={destination.label} aria-current={isActive(destination.href) ? 'page' : undefined}><LineIcon name={destination.icon} /><span>{destination.label}</span></a>)}
      {signedIn && showAction ? <a className="public-nav-action" href="/campana" aria-label="Registrar una entrega"><Plus aria-hidden="true" /></a> : null}
    </nav>
  );
}
