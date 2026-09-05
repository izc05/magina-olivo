import type { MainSection } from '../components/BottomNav';

export type FieldTarget = 'overview' | 'journal' | 'campaign' | 'costs' | 'machinery';

export type MaginaTarget = 'actualidad' | 'cooperativas' | 'mercado' | 'local' | 'discover' | 'community' | 'agenda' | 'alertas';

export type NavigationTarget = FieldTarget | MaginaTarget;

export type AppNavigate = (section: MainSection, target?: NavigationTarget) => void;
