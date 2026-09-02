import { useState } from 'react';
import type { MainSection } from '../components/BottomNav';
import { FieldPage } from '../features/field/FieldPage';
import { HomePage } from '../features/home/HomePage';
import { NewsPage } from '../features/news/NewsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import type { AppNavigate, FieldTarget, MaginaTarget } from './navigation';

const fieldTargets: FieldTarget[] = ['overview', 'journal', 'campaign', 'costs', 'machinery'];
const maginaTargets: MaginaTarget[] = ['actualidad', 'cooperativas', 'mercado', 'local', 'discover', 'community', 'agenda', 'alertas'];

export default function App() {
  const [section, setSection] = useState<MainSection>('home');
  const [fieldTarget, setFieldTarget] = useState<FieldTarget>('overview');
  const [maginaTarget, setMaginaTarget] = useState<MaginaTarget>('actualidad');

  const navigate: AppNavigate = (nextSection, target) => {
    if (nextSection === 'field') {
      setFieldTarget(target && fieldTargets.includes(target as FieldTarget) ? target as FieldTarget : 'overview');
    }

    if (nextSection === 'news') {
      setMaginaTarget(target && maginaTargets.includes(target as MaginaTarget) ? target as MaginaTarget : 'actualidad');
    }

    setSection(nextSection);
  };

  if (section === 'field') {
    return <FieldPage onNavigate={navigate} initialTab={fieldTarget} />;
  }

  if (section === 'news') {
    return <NewsPage onNavigate={navigate} initialTab={maginaTarget} />;
  }

  if (section === 'profile') {
    return <ProfilePage onNavigate={navigate} />;
  }

  return <HomePage onNavigate={navigate} />;
}
