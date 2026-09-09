export type ActivityDraft = {
  kind: 'activity';
  activityType: 'treatment' | 'fertilization' | 'pruning' | 'mowing' | 'tillage' | 'irrigation' | 'harvest' | 'maintenance' | 'planting' | 'sampling' | 'observation' | 'other';
  occurredAt: string;
  farmId?: string;
  plotId?: string;
  plotName?: string;
  affectedAreaHa?: number;
  productName?: string;
  productRegistrationNumber?: string;
  quantity?: number;
  quantityUnit?: string;
  costEur?: number;
  notes?: string;
};

export type DeliveryDraft = {
  kind: 'delivery';
  deliveredAt: string;
  kilograms: string;
  customDestination?: string;
  farmId?: string;
  plotId?: string;
  plotName?: string;
  ticketNumber?: string;
  variety?: string;
  notes?: string;
};

export type QueryDraft = {
  kind: 'query';
  intent: 'summary' | 'weather' | 'prices' | 'history';
  targetDate?: string;
};

export type ParsedIntentResult = {
  confidence: number;
  draft: ActivityDraft | DeliveryDraft | QueryDraft;
  humanExplanation: string;
};

export function parseNaturalLanguageIntent(
  text: string,
  contextPlots: Array<{ id: string; name: string; farmId: string; areaHa: string | null }> = [],
): ParsedIntentResult {
  const normalized = text.toLowerCase().trim();
  const now = new Date().toISOString();

  // Detect matching plot
  let matchedPlot: { id: string; name: string; farmId: string; areaHa: string | null } | undefined;
  for (const plot of contextPlots) {
    if (plot.name && normalized.includes(plot.name.toLowerCase())) {
      matchedPlot = plot;
      break;
    }
  }

  // Check for Activities first if explicitly mentioned
  const isActivity = normalized.includes('trat') || normalized.includes('cobre') || normalized.includes('curar') || normalized.includes('sulfat') || normalized.includes('abono') || normalized.includes('regar') || normalized.includes('riego') || normalized.includes('pod') || normalized.includes('desbroz') || normalized.includes('arar') || normalized.includes('laboreo');

  // Check for Delivery / Pesada / Kilos only when not an explicit farming labor
  const kgMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:kilos?|kg|kgr)/i) || normalized.match(/(?:entrega|llevado|pesada|aceitunas?)\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i);
  if (!isActivity && kgMatch && (normalized.includes('entrega') || normalized.includes('almazara') || normalized.includes('cooperativa') || normalized.includes('llevad') || normalized.includes('ticket') || normalized.includes('pesad') || normalized.includes('aceituna'))) {
    const rawKg = (kgMatch[1] ?? '0').replace(',', '.');
    const kgNumber = Number(rawKg);
    const validKg = Number.isFinite(kgNumber) && kgNumber > 0 ? String(kgNumber) : '0';

    let destination: string | undefined;
    const destMatch = normalized.match(/(?:en|a)\s+(?:la\s+)?(?:cooperativa|almazara)?\s*([a-záéíóúñ\s]+?)(?:\s+el|\s+hoy|\s+con|\s*$)/i);
    if (destMatch && destMatch[1]) {
      destination = destMatch[1].trim();
      if (destination.length > 50) destination = destination.slice(0, 50);
    }

    const deliveryDraft: DeliveryDraft = {
      kind: 'delivery',
      deliveredAt: now,
      kilograms: validKg,
      notes: text,
    };
    if (destination) deliveryDraft.customDestination = destination;
    if (matchedPlot) {
      deliveryDraft.farmId = matchedPlot.farmId;
      deliveryDraft.plotId = matchedPlot.id;
      deliveryDraft.plotName = matchedPlot.name;
    }

    return {
      confidence: 0.9,
      draft: deliveryDraft,
      humanExplanation: `Registrar entrega de ${validKg} kg de aceituna${matchedPlot ? ` procedente de ${matchedPlot.name}` : ''}${destination ? ` en ${destination}` : ''}.`,
    };
  }

  // Check for Activities
  if (isActivity) {
    let activityType: ActivityDraft['activityType'] = 'other';
    let productName: string | undefined;
    let quantity: number | undefined;
    let quantityUnit: string | undefined;

    if (normalized.includes('cobre') || normalized.includes('curar') || normalized.includes('sulfat') || normalized.includes('trat')) {
      activityType = 'treatment';
      if (normalized.includes('cobre')) productName = 'Cobre';
      else if (normalized.includes('caolin')) productName = 'Caolín';
    } else if (normalized.includes('abono') || normalized.includes('abonar') || normalized.includes('fertiliz')) {
      activityType = 'fertilization';
      if (normalized.includes('foliar')) productName = 'Abono foliar';
    } else if (normalized.includes('regar') || normalized.includes('riego')) {
      activityType = 'irrigation';
      const m3Match = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:m3|metros\s*c[uú]bicos|horas?)/i);
      if (m3Match) {
        quantity = Number(m3Match[1]?.replace(',', '.'));
        quantityUnit = normalized.includes('hora') ? 'horas' : 'm³';
      }
    } else if (normalized.includes('pod')) {
      activityType = 'pruning';
    } else if (normalized.includes('desbroz')) {
      activityType = 'mowing';
    } else if (normalized.includes('arar') || normalized.includes('laboreo')) {
      activityType = 'tillage';
    }

    const qtyMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|l|litros?|g|gramos?|m3)/i);
    if (qtyMatch && !quantity) {
      quantity = Number(qtyMatch[1]?.replace(',', '.'));
      quantityUnit = qtyMatch[2];
    }

    const activityDraft: ActivityDraft = {
      kind: 'activity',
      activityType,
      occurredAt: now,
      notes: text,
    };
    if (matchedPlot) {
      activityDraft.farmId = matchedPlot.farmId;
      activityDraft.plotId = matchedPlot.id;
      activityDraft.plotName = matchedPlot.name;
      if (matchedPlot.areaHa) activityDraft.affectedAreaHa = Number(matchedPlot.areaHa);
    }
    if (productName) activityDraft.productName = productName;
    if (quantity != null) activityDraft.quantity = quantity;
    if (quantityUnit) activityDraft.quantityUnit = quantityUnit;

    return {
      confidence: 0.88,
      draft: activityDraft,
      humanExplanation: `Anotar labor de ${activityType}${matchedPlot ? ` en la parcela ${matchedPlot.name}` : ''}${productName ? ` con ${productName}` : ''}.`,
    };
  }

  // Default Observation
  const observationDraft: ActivityDraft = {
    kind: 'activity',
    activityType: 'observation',
    occurredAt: now,
    notes: text,
  };
  if (matchedPlot) {
    observationDraft.farmId = matchedPlot.farmId;
    observationDraft.plotId = matchedPlot.id;
    observationDraft.plotName = matchedPlot.name;
  }

  return {
    confidence: 0.6,
    draft: observationDraft,
    humanExplanation: `Guardar observación de campo${matchedPlot ? ` en ${matchedPlot.name}` : ''}.`,
  };
}
