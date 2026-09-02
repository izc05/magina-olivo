import { Home, Mountain, Plus, Sprout, UserRound } from 'lucide-react';

export type MainSection = 'home' | 'field' | 'news' | 'profile';

type BottomNavProps = {
  active: MainSection;
  onNavigate: (section: MainSection) => void;
  onCreate?: () => void;
};

const items = [
  { id: 'home' as const, label: 'Inicio', icon: Home },
  { id: 'field' as const, label: 'Mi Campo', icon: Sprout },
  { id: 'news' as const, label: 'Mágina', icon: Mountain },
  { id: 'profile' as const, label: 'Mi Mágina', icon: UserRound },
];

export function BottomNav({ active, onNavigate, onCreate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.slice(0, 2).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`bottom-nav__item${active === id ? ' bottom-nav__item--active' : ''}`}
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}

      <button className="bottom-nav__fab" type="button" aria-label="Nueva anotación" onClick={onCreate}>
        <Plus size={26} />
      </button>

      {items.slice(2).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`bottom-nav__item${active === id ? ' bottom-nav__item--active' : ''}`}
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
