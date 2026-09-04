import { useEffect, useState } from 'react';
import { api } from './api.ts';
import { CatastroMapFirstSelector, type CatastroMapFirstSelectorProps } from './CatastroMapFirstSelector.tsx';
import { CatastroParcelPanel } from './CatastroParcelPanel.tsx';
import { ParcelSourceComparisonPanel } from './ParcelSourceComparisonPanel.tsx';
import { PlotMapPanel as PlotMapEditor } from './PlotMapEditor.tsx';
import { PlotOliveCountPanel } from './PlotOliveCountPanel.tsx';
import { PlotSigpacAssociationPanel } from './PlotSigpacAssociationPanel.tsx';
import { SigpacRecintoPanel } from './SigpacRecintoPanel.tsx';

type CompletedHandler = CatastroMapFirstSelectorProps['onCompleted'];

export function PlotMapPanel({
  holdingId,
  farmId,
  onMapFirstCompleted,
}: {
  holdingId?: string;
  farmId: string;
  onMapFirstCompleted?: CompletedHandler;
}) {
  const [mapRevision, setMapRevision] = useState(0);
  const [resolvedHoldingId, setResolvedHoldingId] = useState(holdingId ?? '');
  const [contextError, setContextError] = useState<string | null>(null);

  useEffect(() => {
    if (holdingId) {
      setResolvedHoldingId(holdingId);
      setContextError(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const holdings = await api.holdings();
        for (const holding of holdings.items) {
          const farms = await api.farms(holding.id);
          if (farms.items.some((farm) => farm.id === farmId)) {
            if (!cancelled) {
              setResolvedHoldingId(holding.id);
              setContextError(null);
            }
            return;
          }
        }
        if (!cancelled) setContextError('No se ha podido relacionar esta finca con tu explotación.');
      } catch {
        if (!cancelled) setContextError('No se ha podido preparar el alta rápida de parcelas.');
      }
    })();

    return () => { cancelled = true; };
  }, [farmId, holdingId]);

  async function refreshPrivateMap(): Promise<void> {
    setMapRevision((current) => current + 1);
  }

  async function handleMapFirstCompleted(result: Parameters<NonNullable<CompletedHandler>>[0]) {
    if (result.farmId === farmId) {
      await refreshPrivateMap();
    }
    if (onMapFirstCompleted) {
      await onMapFirstCompleted(result);
      return;
    }
    if (result.farmId !== farmId) {
      window.location.reload();
    }
  }

  return (
    <>
      {resolvedHoldingId ? (
        <CatastroMapFirstSelector holdingId={resolvedHoldingId} farmId={farmId} onCompleted={handleMapFirstCompleted} />
      ) : contextError ? (
        <section className="section card card-body">
          <p className="section-copy">{contextError}</p>
        </section>
      ) : (
        <section className="section card card-body" role="status">Preparando alta rápida de parcelas…</section>
      )}
      <PlotOliveCountPanel key={`${farmId}-agronomy-${mapRevision}`} farmId={farmId} onSaved={refreshPrivateMap} />
      <PlotSigpacAssociationPanel key={`${farmId}-sigpac-associations-${mapRevision}`} farmId={farmId} />
      <PlotMapEditor key={`${farmId}-${mapRevision}`} farmId={farmId} />
      <ParcelSourceComparisonPanel farmId={farmId} revision={mapRevision} />
      <SigpacRecintoPanel farmId={farmId} onImported={refreshPrivateMap} />
      <CatastroParcelPanel farmId={farmId} onImported={refreshPrivateMap} />
    </>
  );
}
