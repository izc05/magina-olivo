export type PlotHarvestDelivery = {
  id: string;
  deliveredAt: string;
  kilograms: string;
  destination: string;
  ticketNumber: string | null;
  variety: string | null;
  yieldPercent: string | null;
  verificationStatus: string;
  notes: string | null;
};

export type PlotHarvestDocumentCount = {
  type: string;
  count: number;
};

export type PlotHarvestReportInput = {
  generatedAt: string;
  holding: {
    name: string;
    municipality: string | null;
    province: string | null;
  };
  farm: {
    name: string;
  };
  plot: {
    name: string;
    areaHa: string | null;
    sigpacReference: string | null;
    irrigationType: string | null;
    oliveTreeCount: number | null;
    notes: string | null;
  };
  campaign: {
    name: string;
    seasonStartYear: number;
    seasonEndYear: number;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
  deliveries: PlotHarvestDelivery[];
  documents: PlotHarvestDocumentCount[];
};

export type PlotHarvestSummary = {
  deliveryCount: number;
  totalKilograms: number;
  weightedYieldPercent: number | null;
  yieldCoveredKilograms: number;
  firstDeliveryAt: string | null;
  lastDeliveryAt: string | null;
  destinationTotals: Array<{ destination: string; kilograms: number }>;
};

function numberValue(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizePlotHarvest(deliveries: PlotHarvestDelivery[]): PlotHarvestSummary {
  let totalKilograms = 0;
  let yieldCoveredKilograms = 0;
  let weightedYieldSum = 0;
  const destinationMap = new Map<string, number>();

  for (const delivery of deliveries) {
    const kilograms = Math.max(0, numberValue(delivery.kilograms) ?? 0);
    totalKilograms += kilograms;
    destinationMap.set(
      delivery.destination,
      (destinationMap.get(delivery.destination) ?? 0) + kilograms,
    );

    const yieldPercent = numberValue(delivery.yieldPercent);
    if (yieldPercent != null && yieldPercent >= 0) {
      yieldCoveredKilograms += kilograms;
      weightedYieldSum += kilograms * yieldPercent;
    }
  }

  const sortedDates = deliveries
    .map((delivery) => delivery.deliveredAt)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    deliveryCount: deliveries.length,
    totalKilograms,
    weightedYieldPercent: yieldCoveredKilograms > 0
      ? weightedYieldSum / yieldCoveredKilograms
      : null,
    yieldCoveredKilograms,
    firstDeliveryAt: sortedDates[0] ?? null,
    lastDeliveryAt: sortedDates.at(-1) ?? null,
    destinationTotals: [...destinationMap.entries()]
      .map(([destination, kilograms]) => ({ destination, kilograms }))
      .sort((a, b) => b.kilograms - a.kilograms || a.destination.localeCompare(b.destination, 'es')),
  };
}

function asciiPdfText(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, '?');
}

function pdfLiteral(value: string | number | null | undefined): string {
  return asciiPdfText(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatKg(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1,
  }).format(value).replaceAll('.', ' ');
}

function formatPercent(value: number | null): string {
  return value == null ? '-' : `${value.toFixed(2)} %`;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function text(x: number, y: number, size: number, value: string, bold = false): string {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${pdfLiteral(value)}) Tj ET\n`;
}

function line(x1: number, y1: number, x2: number, y2: number, width = 0.5): string {
  return `${width} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S\n`;
}

function gray(value: number): string {
  return `${value.toFixed(2)} G ${value.toFixed(2)} g\n`;
}

function writePdf(pages: string[]): Buffer {
  const objects: Buffer[] = [];
  const pageRefs: number[] = [];
  const contentRefs: number[] = [];

  let nextObject = 5;
  for (let index = 0; index < pages.length; index += 1) {
    pageRefs.push(nextObject++);
    contentRefs.push(nextObject++);
  }

  objects[1] = Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1');
  objects[2] = Buffer.from(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] >>`,
    'latin1',
  );
  objects[3] = Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', 'latin1');
  objects[4] = Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', 'latin1');

  pages.forEach((content, index) => {
    const contentBuffer = Buffer.from(content, 'latin1');
    objects[pageRefs[index]] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRefs[index]} 0 R >>`,
      'latin1',
    );
    objects[contentRefs[index]] = Buffer.concat([
      Buffer.from(`<< /Length ${contentBuffer.length} >>\nstream\n`, 'latin1'),
      contentBuffer,
      Buffer.from('\nendstream', 'latin1'),
    ]);
  });

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = new Array(objects.length).fill(0);
  let length = parts[0].length;

  for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
    const body = objects[objectNumber];
    if (!body) continue;
    offsets[objectNumber] = length;
    const objectBuffer = Buffer.concat([
      Buffer.from(`${objectNumber} 0 obj\n`, 'latin1'),
      body,
      Buffer.from('\nendobj\n', 'latin1'),
    ]);
    parts.push(objectBuffer);
    length += objectBuffer.length;
  }

  const xrefOffset = length;
  const xrefLines = [`xref`, `0 ${objects.length}`, '0000000000 65535 f '];
  for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
    xrefLines.push(`${String(offsets[objectNumber]).padStart(10, '0')} 00000 n `);
  }
  xrefLines.push(
    'trailer',
    `<< /Size ${objects.length} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
    '',
  );
  parts.push(Buffer.from(xrefLines.join('\n'), 'latin1'));
  return Buffer.concat(parts);
}

function reportHeader(input: PlotHarvestReportInput, pageNumber: number): string {
  const season = `${input.campaign.seasonStartYear}/${String(input.campaign.seasonEndYear).slice(-2)}`;
  let output = gray(0.12);
  output += text(42, 806, 19, 'MAGINA OLIVO', true);
  output += text(42, 783, 15, 'Informe de cosecha por parcela', true);
  output += text(430, 806, 8, `Pagina ${pageNumber}`);
  output += text(430, 792, 8, `Campana ${season}`);
  output += line(42, 770, 553, 770, 0.8);
  return output;
}

function deliveriesTableHeader(y: number): string {
  let output = gray(0.22);
  output += text(42, y, 8, 'Fecha', true);
  output += text(100, y, 8, 'Kg', true);
  output += text(154, y, 8, 'Destino', true);
  output += text(330, y, 8, 'Ticket', true);
  output += text(395, y, 8, 'Variedad', true);
  output += text(492, y, 8, 'Rend.', true);
  output += line(42, y - 5, 553, y - 5, 0.5);
  return output;
}

export function buildPlotHarvestPdf(input: PlotHarvestReportInput): Buffer {
  const summary = summarizePlotHarvest(input.deliveries);
  const pages: string[] = [];
  let page = reportHeader(input, 1);

  page += text(42, 748, 10, input.holding.name, true);
  const location = [input.holding.municipality, input.holding.province].filter(Boolean).join(', ');
  if (location) page += text(42, 733, 8, location);
  page += text(42, 710, 11, `Parcela: ${input.plot.name}`, true);
  page += text(42, 694, 8, `Finca: ${input.farm.name}`);
  page += text(42, 680, 8, `SIGPAC: ${input.plot.sigpacReference ?? '-'}`);
  page += text(290, 694, 8, `Superficie: ${input.plot.areaHa ?? '-'} ha`);
  page += text(290, 680, 8, `Olivos: ${input.plot.oliveTreeCount ?? '-'}`);
  page += text(420, 680, 8, `Riego: ${input.plot.irrigationType ?? '-'}`);

  page += text(42, 650, 11, 'Resumen de campana', true);
  page += line(42, 643, 553, 643, 0.5);
  page += text(42, 625, 9, `Total entregado: ${formatKg(summary.totalKilograms)} kg`, true);
  page += text(255, 625, 9, `Entregas: ${summary.deliveryCount}`, true);
  page += text(390, 625, 9, `Rendimiento medio: ${formatPercent(summary.weightedYieldPercent)}`, true);
  page += text(42, 608, 8, `Primera entrega: ${formatDate(summary.firstDeliveryAt)}`);
  page += text(255, 608, 8, `Ultima entrega: ${formatDate(summary.lastDeliveryAt)}`);
  page += text(390, 608, 8, `Kg con rendimiento: ${formatKg(summary.yieldCoveredKilograms)}`);

  const documentTotal = input.documents.reduce((total, item) => total + item.count, 0);
  page += text(42, 586, 8, `Documentos vinculados: ${documentTotal}`);
  if (input.documents.length > 0) {
    const documentBreakdown = input.documents
      .map((item) => `${item.type}: ${item.count}`)
      .join(' | ');
    page += text(170, 586, 7, truncate(documentBreakdown, 80));
  }

  page += text(42, 558, 11, 'Entregas registradas', true);
  page += deliveriesTableHeader(541);
  let y = 521;
  let pageNumber = 1;

  if (input.deliveries.length === 0) {
    page += text(42, y, 9, 'No hay entregas registradas para esta parcela en la campana seleccionada.');
  }

  for (const delivery of input.deliveries) {
    const rowHeight = delivery.notes ? 28 : 18;
    if (y - rowHeight < 72) {
      pages.push(page);
      pageNumber += 1;
      page = reportHeader(input, pageNumber);
      page += text(42, 744, 11, 'Entregas registradas (continuacion)', true);
      page += deliveriesTableHeader(725);
      y = 705;
    }

    page += gray(0.18);
    page += text(42, y, 7.5, formatDate(delivery.deliveredAt));
    page += text(100, y, 7.5, formatKg(numberValue(delivery.kilograms) ?? 0));
    page += text(154, y, 7.5, truncate(delivery.destination, 31));
    page += text(330, y, 7.5, truncate(delivery.ticketNumber ?? '-', 11));
    page += text(395, y, 7.5, truncate(delivery.variety ?? '-', 15));
    page += text(492, y, 7.5, delivery.yieldPercent ? `${Number(delivery.yieldPercent).toFixed(2)} %` : '-');
    if (delivery.notes) {
      page += text(154, y - 11, 6.5, `Obs.: ${truncate(delivery.notes, 62)}`);
    }
    page += line(42, y - rowHeight + 6, 553, y - rowHeight + 6, 0.2);
    y -= rowHeight;
  }

  const destinationStartY = y - 12;
  if (summary.destinationTotals.length > 0 && destinationStartY > 120) {
    page += text(42, destinationStartY, 10, 'Totales por destino', true);
    let destinationY = destinationStartY - 17;
    for (const item of summary.destinationTotals.slice(0, 8)) {
      page += text(42, destinationY, 7.5, truncate(item.destination, 55));
      page += text(420, destinationY, 7.5, `${formatKg(item.kilograms)} kg`, true);
      destinationY -= 13;
    }
  }

  const footerY = 42;
  page += line(42, footerY + 17, 553, footerY + 17, 0.4);
  page += text(42, footerY, 6.5, `Generado por Magina Olivo: ${formatDate(input.generatedAt)}`);
  page += text(330, footerY, 6.5, 'Documento informativo basado en los datos registrados en la aplicacion.');
  pages.push(page);

  return writePdf(pages);
}
