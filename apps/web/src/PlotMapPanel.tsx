import { useState } from 'react';
import { CatastroMapFirstSelector } from './CatastroMapFirstSelector.tsx';
import { CatastroParcelPanel } from './CatastroParcelPanel.tsx';
import { ParcelSourceComparisonPanel } from './ParcelSourceComparisonPanel.tsx';
import { PlotMapPanel as PlotMapEditor } from './PlotMapEditor.tsx';
import { PlotSigpacAssociationPanel } from './PlotSigpacAssociationPanel.tsx';
import { SigpacRecintoPanel } from './SigpacRecintoPanel.tsx';

export function PlotMapPanel({ farmId }: { farmId: string }) {
  const [mapRevision, setMapRevision] = useState(0);

  async function refreshPrivateMap(): Promise<void> {
    setMapRevision((current) => current + 1);
  }

  return (
    <>
      <CatastroMapFirstSelector farmId={farmId} />
      <PlotSigpacAssociationPanel key={`${farmId}-sigpac-associations-${mapRevision}`} farmId={farmId} />
      <PlotMapEditor key={`${farmId}-${mapRevision}`} farmId={farmId} />
      <ParcelSourceComparisonPanel farmId={farmId} revision={mapRevision} />
      <SigpacRecintoPanel farmId={farmId} onImported={refreshPrivateMap} />
      <CatastroParcelPanel farmId={farmId} onImported={refreshPrivateMap} />
    </>
  );
}
