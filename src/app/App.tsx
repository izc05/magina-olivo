import { useState } from 'react';
import type { MainSection } from '../components/BottomNav';
import { FieldPage } from '../features/field/FieldPage';
import { HomePage } from '../features/home/HomePage';
import { PlaceholderPage } from '../features/shared/PlaceholderPage';

export default function App() {
  const [section, setSection] = useState<MainSection>('home');

  if (section === 'field') {
    return <FieldPage onNavigate={setSection} />;
  }

  if (section === 'news' || section === 'profile') {
    return <PlaceholderPage section={section} onNavigate={setSection} />;
  }

  return <HomePage onNavigate={setSection} />;
}
