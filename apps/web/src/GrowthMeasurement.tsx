import { useEffect, useState } from 'react';
import {
  isGrowthMeasurementEnabled,
  isPublicGrowthRoute,
  readGrowthConsent,
  recordGrowthEvent,
  recordPublicPageViewOnce,
  writeGrowthConsent,
  type GrowthConsent,
  type GrowthEventInput,
} from './growth-measurement';

type GrowthMeasurementProps = {
  route: string;
};

type PublicShareEventDetail = {
  event?: GrowthEventInput['event'];
  channel?: GrowthEventInput['channel'];
  route?: string;
};

export function GrowthMeasurement({ route }: GrowthMeasurementProps) {
  const [consent, setConsent] = useState<GrowthConsent>(() => readGrowthConsent());
  const enabled = isGrowthMeasurementEnabled() && isPublicGrowthRoute(route);

  useEffect(() => {
    if (!enabled || consent !== 'granted') return;
    void recordPublicPageViewOnce(route);
  }, [consent, enabled, route]);

  useEffect(() => {
    if (!enabled || consent !== 'granted') return;

    function handleShareEvent(event: Event) {
      const detail = (event as CustomEvent<PublicShareEventDetail>).detail;
      if (!detail || (detail.event !== 'share_started' && detail.event !== 'share_completed')) return;
      if (!detail.route || !isPublicGrowthRoute(detail.route)) return;
      void recordGrowthEvent({
        event: detail.event,
        route: detail.route,
        ...(detail.channel ? { channel: detail.channel } : {}),
      });
    }

    window.addEventListener('magina:public-growth-event', handleShareEvent);
    return () => window.removeEventListener('magina:public-growth-event', handleShareEvent);
  }, [consent, enabled]);

  if (!enabled || consent !== 'unset') return null;

  function chooseConsent(value: Exclude<GrowthConsent, 'unset'>) {
    writeGrowthConsent(value);
    setConsent(value);
  }

  return (
    <aside className="growth-consent" aria-label="Preferencias de medición anónima">
      <div className="growth-consent-copy">
        <strong>Ayúdanos a mejorar Mágina Olivo</strong>
        <p>
          Podemos medir de forma anónima qué páginas públicas se consultan y desde qué canal llegan las visitas.
          No medimos fincas, campañas, documentos ni datos personales.
        </p>
      </div>
      <div className="growth-consent-actions">
        <button type="button" onClick={() => chooseConsent('denied')}>Solo necesario</button>
        <button className="growth-consent-primary" type="button" onClick={() => chooseConsent('granted')}>
          Permitir medición anónima
        </button>
      </div>
    </aside>
  );
}
