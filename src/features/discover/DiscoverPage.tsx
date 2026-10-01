import { Bell } from 'lucide-react';
import type { AppNavigate } from '../../app/navigation';
import { Brand } from '../../components/Brand';
import { BottomNav } from '../../components/BottomNav';
import { LocalDiscoverPanel } from '../news/LocalDiscoverPanel';

type DiscoverPageProps = {
  onNavigate: AppNavigate;
};

export function DiscoverPage({ onNavigate }: DiscoverPageProps) {
  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button
            className="icon-button"
            type="button"
            aria-label="Alertas de Mágina"
            onClick={() => onNavigate('news', 'alertas')}
          >
            <Bell size={20} />
          </button>
        </header>

        <LocalDiscoverPanel mode="discover" />
      </main>

      <BottomNav active="discover" onNavigate={onNavigate} />
    </div>
  );
}
