export type CampaignExportDelivery = {
  id: string;
  deliveredAt: string;
  kilograms: string;
  cooperativeId: string | null;
  cooperativeName: string | null;
  customDestination: string | null;
  destination: string;
  farmId: string | null;
  farmName: string | null;
  plotId: string | null;
  plotName: string | null;
  ticketNumber: string | null;
  variety: string | null;
  yieldPercent: string | null;
  verificationStatus: string;
  notes: string | null;
};

function spreadsheetSafe(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const safe = spreadsheetSafe(raw);
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildCampaignCsv(deliveries: CampaignExportDelivery[]): string {
  const headers = [
    'delivery_id',
    'delivered_at',
    'kilograms',
    'destination',
    'cooperative_id',
    'farm',
    'plot',
    'ticket_number',
    'variety',
    'yield_percent',
    'verification_status',
    'notes',
  ];

  const lines = [headers.map(csvCell).join(',')];
  for (const delivery of deliveries) {
    lines.push([
      delivery.id,
      delivery.deliveredAt,
      delivery.kilograms,
      delivery.destination,
      delivery.cooperativeId,
      delivery.farmName,
      delivery.plotName,
      delivery.ticketNumber,
      delivery.variety,
      delivery.yieldPercent,
      delivery.verificationStatus,
      delivery.notes,
    ].map(csvCell).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
