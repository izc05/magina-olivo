import { Home, Newspaper, Plus, Sprout, UserRound } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <button className="bottom-nav__item bottom-nav__item--active" type="button"><Home size={19} /><span>Inicio</span></button>
      <button className="bottom-nav__item" type="button"><Sprout size={19} /><span>Mi Campo</span></button>
      <button className="bottom-nav__fab" type="button" aria-label="Nueva anotación"><Plus size={26} /></button>
      <button className="bottom-nav__item" type="button"><Newspaper size={19} /><span>Noticias</span></button>
      <button className="bottom-nav__item" type="button"><UserRound size={19} /><span>Mi Mágina</span></button>
    </nav>
  );
}
