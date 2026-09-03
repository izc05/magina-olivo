import { useState } from 'react';
import { PlotMapPanel as PlotMapEditor } from './PlotMapEditor.tsx';
import { SigpacRecintoPanel } from './SigpacRecintoPanel.tsx';

export function PlotMapPanel({ farmId }: { farmId: string }) {
  const [mapRevision, setMapRevision] = useState(0);

  async function refreshPrivateMap(): Promise<void> {
    setMapRevision((current) => current + 1);
  }

  return (
    <>
      <PlotMapEditor key={`${farmId}-${mapRevision}`} farmId={farmId} />
      <SigpacRecintoPanel farmId={farmId} onImported={refreshPrivateMap} />
    </>
  );
}
