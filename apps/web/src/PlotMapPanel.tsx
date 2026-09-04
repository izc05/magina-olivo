import { useState } from 'react';
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
  holdingId: string;
  farmId: string;
  onMapFirstCompleted?: CompletedHandler;
}) {
  const [mapRevision, setMapRevision] = useState(0);

  async function refreshPrivateMap(): Promise<void> {
    setMapRevision((current) => current + 1);
  }

  async function handleMapFirstCompleted(result: Parameters<NonNullable<CompletedHandler>>[0]) {
    if (result.farmId === farmId) await refreshPrivateMap();
    await onMapFirstCompleted?.(result);
  }

  return (
    <>
      <CatastroMapFirstSelector holdingId={holdingId} farmId={farmId} onCompleted={handleMapFirstCompleted} />
      <PlotOliveCountPanel key={`${farmId}-agronomy-${mapRevision}`} farmId={farmId} onSaved={refreshPrivateMap} />
      <PlotSigpacAssociationPanel key={`${farmId}-sigpac-associations-${mapRevision}`} farmId={farmId} />
      <PlotMapEditor key={`${farmId}-${mapRevision}`} farmId={farmId} />
      <ParcelSourceComparisonPanel farmId={farmId} revision={mapRevision} />
      <SigpacRecintoPanel farmId={farmId} onImported={refreshPrivateMap} />
      <CatastroParcelPanel farmId={farmId} onImported={refreshPrivateMap} />
    </>
  );
}
