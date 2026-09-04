import { useState } from 'react';
import type { MainSection } from '../components/BottomNav';
import { DiscoverPage } from '../features/discover/DiscoverPage';
import { FieldPage } from '../features/field/FieldPage';
import { HomePage } from '../features/home/HomePage';
import { NewsPage } from '../features/news/NewsPage';
import { OnboardingTour } from '../features/onboarding/OnboardingTour';
import { ProfilePage } from '../features/profile/ProfilePage';
import type { AppNavigate, FieldTarget, MaginaTarget } from './navigation';

const fieldTargets: FieldTarget[] = ['overview', 'journal', 'campaign', 'costs', 'machinery'];
const maginaTargets: MaginaTarget[] = ['actualidad', 'cooperativas', 'mercado', 'local', 'discover', 'community', 'agenda', 'alertas'];
const WELCOME_TOUR_KEY = 'magina-olivo:welcome-tour:v1';

function hasSeenWelcomeTour() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(WELCOME_TOUR_KEY) === 'seen';
}

export default function App() {
  const [section, setSection] = useState<MainSection>('home');
  const [fieldTarget, setFieldTarget] = useState<FieldTarget>('overview');
  const [maginaTarget, setMaginaTarget] = useState<MaginaTarget>('actualidad');
  const [welcomeTourOpen, setWelcomeTourOpen] = useState(() => !hasSeenWelcomeTour());

  const navigate: AppNavigate = (nextSection, target) => {
    if (nextSection === 'field') {
      setFieldTarget(target && fieldTargets.includes(target as FieldTarget) ? target as FieldTarget : 'overview');
    }

    if (nextSection === 'news') {
      setMaginaTarget(target && maginaTargets.includes(target as MaginaTarget) ? target as MaginaTarget : 'actualidad');
    }

    setSection(nextSection);
  };

  const finishWelcomeTour = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WELCOME_TOUR_KEY, 'seen');
    }
    setWelcomeTourOpen(false);
  };

  const replayWelcomeTour = () => {
    setWelcomeTourOpen(true);
  };

  if (welcomeTourOpen) {
    return <OnboardingTour onFinish={finishWelcomeTour} />;
  }

  if (section === 'field') {
    return <FieldPage onNavigate={navigate} initialTab={fieldTarget} />;
  }

  if (section === 'news') {
    return <NewsPage onNavigate={navigate} initialTab={maginaTarget} />;
  }

  if (section === 'discover') {
    return <DiscoverPage onNavigate={navigate} />;
  }

  if (section === 'profile') {
    return <ProfilePage onNavigate={navigate} onReplayWelcomeTour={replayWelcomeTour} />;
  }

  return <HomePage onNavigate={navigate} />;
}
