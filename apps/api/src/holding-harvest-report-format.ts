import {
  calculatePlotHarvestProductivity,
  summarizePlotHarvest,
  type PlotHarvestDelivery,
} from './plot-harvest-report-format.ts';

export type HoldingHarvestPlot = {
  id: string;
  farmName: string;
  name: string;
  areaHa: string | null;
  oliveTreeCount: number | null;
  deliveries: PlotHarvestDelivery[];
};

export type HoldingHarvestReportInput = {
  generatedAt: string;
  holding: { name: string; municipality: string | null; province: string | null };
  campaign: { name: string; seasonStartYear: number; seasonEndYear: number };
  plots: HoldingHarvestPlot[];
};

export type HoldingHarvestPlotSummary = {
  id: string;
  farmName: string;
  name: string;
  areaHa: number | null;
  oliveTreeCount: number | null;
  deliveryCount: number;
  totalKilograms: number;
  kilogramsPerHectare: number | null;
  kilogramsPerOliveTree: number | null;
  weightedYieldPercent: number | null;
};

export type HoldingHarvestSummary = {
  plotCount: number;
  harvestedPlotCount: number;
  deliveryCount: number;
  totalKilograms: number;
  representedAreaHa: number;
  representedOliveTreeCount: number;
  kilogramsPerHectare: number | null;
  kilogramsPerOliveTree: number | null;
  weightedYieldPercent: number | null;
  plots: HoldingHarvestPlotSummary[];
  destinationTotals: Array<{ destination: string; kilograms: number }>;
  topByKilograms: HoldingHarvestPlotSummary | null;
  topByHectare: HoldingHarvestPlotSummary | null;
};

function numeric(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizeHoldingHarvest(plots: HoldingHarvestPlot[]): HoldingHarvestSummary {
  const allDeliveries = plots.flatMap((plot) => plot.deliveries);
  const holdingDeliverySummary = summarizePlotHarvest(allDeliveries);
  const plotSummaries = plots.map((plot) => {
    const summary = summarizePlotHarvest(plot.deliveries);
    const productivity = calculatePlotHarvestProductivity(
      summary.totalKilograms,
      plot.areaHa,
      plot.oliveTreeCount,
    );
    const areaHa = numeric(plot.areaHa);
    return {
      id: plot.id,
      farmName: plot.farmName,
      name: plot.name,
      areaHa: areaHa != null && areaHa > 0 ? areaHa : null,
      oliveTreeCount: plot.oliveTreeCount != null && plot.oliveTreeCount > 0 ? plot.oliveTreeCount : null,
      deliveryCount: summary.deliveryCount,
      totalKilograms: summary.totalKilograms,
      kilogramsPerHectare: productivity.kilogramsPerHectare,
      kilogramsPerOliveTree: productivity.kilogramsPerOliveTree,
      weightedYieldPercent: summary.weightedYieldPercent,
    } satisfies HoldingHarvestPlotSummary;
  });

  const harvested = plotSummaries.filter((plot) => plot.totalKilograms > 0);
  const representedAreaHa = harvested.reduce((sum, plot) => sum + (plot.areaHa ?? 0), 0);
  const representedOliveTreeCount = harvested.reduce((sum, plot) => sum + (plot.oliveTreeCount ?? 0), 0);
  const topByKilograms = harvested
    .slice()
    .sort((a, b) => b.totalKilograms - a.totalKilograms || a.name.localeCompare(b.name, 'es'))[0] ?? null;
  const topByHectare = harvested
    .filter((plot) => plot.kilogramsPerHectare != null)
    .slice()
    .sort((a, b) => (b.kilogramsPerHectare ?? 0) - (a.kilogramsPerHectare ?? 0))[0] ?? null;

  return {
    plotCount: plots.length,
    harvestedPlotCount: harvested.length,
    deliveryCount: holdingDeliverySummary.deliveryCount,
    totalKilograms: holdingDeliverySummary.totalKilograms,
    representedAreaHa,
    representedOliveTreeCount,
    kilogramsPerHectare: representedAreaHa > 0 ? holdingDeliverySummary.totalKilograms / representedAreaHa : null,
    kilogramsPerOliveTree: representedOliveTreeCount > 0 ? holdingDeliverySummary.totalKilograms / representedOliveTreeCount : null,
    weightedYieldPercent: holdingDeliverySummary.weightedYieldPercent,
    plots: plotSummaries.sort((a, b) => b.totalKilograms - a.totalKilograms || a.name.localeCompare(b.name, 'es')),
    destinationTotals: holdingDeliverySummary.destinationTotals,
    topByKilograms,
    topByHectare,
  };
}

function ascii(value: string | number | null | undefined): string {
  return (value == null ? '' : String(value))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, '?');
}

function literal(value: string | number | null | undefined): string {
  return ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function text(x: number, y: number, size: number, value: string, bold = false): string {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${literal(value)}) Tj ET\n`;
}

function line(x1: number, y1: number, x2: number, y2: number, width = 0.5): string {
  return `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

function format(value: number | null, digits = 1): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(value).replaceAll('.', ' ');
}

function percent(value: number | null): string {
  return value == null ? '-' : `${value.toFixed(2)} %`;
}

function buildPdf(pages: string[]): Buffer {
  const objects = new Map<number, Buffer>();
  const pageRefs = pages.map((_, index) => 5 + index * 2);
  objects.set(1, Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'));
  objects.set(2, Buffer.from(`<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] >>`, 'latin1'));
  objects.set(3, Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', 'latin1'));
  objects.set(4, Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', 'latin1'));
  pages.forEach((content, index) => {
    const pageRef = pageRefs[index];
    if (pageRef == null) throw new Error('Invalid PDF page reference');
    const contentRef = pageRef + 1;
    const body = Buffer.from(content, 'latin1');
    objects.set(pageRef, Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`, 'latin1'));
    objects.set(contentRef, Buffer.concat([Buffer.from(`<< /Length ${body.length} >>\nstream\n`, 'latin1'), body, Buffer.from('\nendstream', 'latin1')]));
  });

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const parts: Buffer[] = [header];
  const offsets = new Map<number, number>();
  let length = header.length;
  const max = 4 + pages.length * 2;
  for (let n = 1; n <= max; n += 1) {
    const body = objects.get(n);
    if (!body) throw new Error(`Missing PDF object ${n}`);
    offsets.set(n, length);
    const object = Buffer.concat([Buffer.from(`${n} 0 obj\n`, 'latin1'), body, Buffer.from('\nendobj\n', 'latin1')]);
    parts.push(object); length += object.length;
  }
  const xrefOffset = length;
  const xref = ['xref', `0 ${max + 1}`, '0000000000 65535 f '];
  for (let n = 1; n <= max; n += 1) xref.push(`${String(offsets.get(n)).padStart(10, '0')} 00000 n `);
  xref.push('trailer', `<< /Size ${max + 1} /Root 1 0 R >>`, 'startxref', String(xrefOffset), '%%EOF', '');
  parts.push(Buffer.from(xref.join('\n'), 'latin1'));
  return Buffer.concat(parts);
}

function header(input: HoldingHarvestReportInput, pageNumber: number): string {
  const season = `${input.campaign.seasonStartYear}/${String(input.campaign.seasonEndYear).slice(-2)}`;
  let out = text(42, 806, 19, 'MAGINA OLIVO', true);
  out += text(42, 783, 15, 'Informe global de cosecha', true);
  out += text(430, 806, 8, `Pagina ${pageNumber}`);
  out += text(430, 792, 8, `Campana ${season}`);
  out += line(42, 770, 553, 770, 0.8);
  return out;
}

function footer(input: HoldingHarvestReportInput): string {
  return line(42, 58, 553, 58, 0.4)
    + text(42, 42, 6.5, `Generado por Magina Olivo: ${input.generatedAt.slice(0, 10)}`)
    + text(330, 42, 6.5, 'Resumen basado en los datos registrados en la aplicacion.');
}

export function buildHoldingHarvestPdf(input: HoldingHarvestReportInput): Buffer {
  const summary = summarizeHoldingHarvest(input.plots);
  const pages: string[] = [];
  let pageNumber = 1;
  let page = header(input, pageNumber);
  const location = [input.holding.municipality, input.holding.province].filter(Boolean).join(', ');
  page += text(42, 744, 11, input.holding.name, true);
  if (location) page += text(42, 728, 8, location);
  page += text(42, 699, 11, 'Resumen de explotacion', true);
  page += line(42, 692, 553, 692);
  page += text(42, 673, 9, `Total entregado: ${format(summary.totalKilograms)} kg`, true);
  page += text(240, 673, 9, `Entregas: ${summary.deliveryCount}`, true);
  page += text(390, 673, 9, `Rendimiento: ${percent(summary.weightedYieldPercent)}`, true);
  page += text(42, 655, 8, `Parcelas con cosecha: ${summary.harvestedPlotCount}/${summary.plotCount}`);
  page += text(240, 655, 8, `Superficie representada: ${format(summary.representedAreaHa, 2)} ha`);
  page += text(420, 655, 8, `Olivos: ${summary.representedOliveTreeCount || '-'}`);
  page += text(42, 637, 8, `Productividad global: ${format(summary.kilogramsPerHectare)} kg/ha`, true);
  page += text(290, 637, 8, `Media global: ${format(summary.kilogramsPerOliveTree)} kg/olivo`, true);

  page += text(42, 606, 11, 'Destacados', true);
  page += line(42, 599, 553, 599);
  page += text(42, 580, 8, `Mayor cosecha: ${summary.topByKilograms ? `${summary.topByKilograms.name} - ${format(summary.topByKilograms.totalKilograms)} kg` : '-'}`);
  page += text(42, 563, 8, `Mayor kg/ha: ${summary.topByHectare ? `${summary.topByHectare.name} - ${format(summary.topByHectare.kilogramsPerHectare)} kg/ha` : '-'}`);

  page += text(42, 532, 11, 'Totales por destino', true);
  page += line(42, 525, 553, 525);
  let destinationY = 507;
  if (summary.destinationTotals.length === 0) page += text(42, destinationY, 8, 'Sin entregas registradas.');
  for (const item of summary.destinationTotals.slice(0, 7)) {
    page += text(42, destinationY, 8, truncate(item.destination, 58));
    page += text(430, destinationY, 8, `${format(item.kilograms)} kg`, true);
    destinationY -= 15;
  }

  page += text(42, 379, 11, 'Detalle por parcela', true);
  page += line(42, 372, 553, 372);
  page += text(42, 354, 7, 'Parcela', true);
  page += text(164, 354, 7, 'Finca', true);
  page += text(260, 354, 7, 'Ha', true);
  page += text(300, 354, 7, 'Olivos', true);
  page += text(350, 354, 7, 'Kg', true);
  page += text(410, 354, 7, 'Kg/ha', true);
  page += text(466, 354, 7, 'Kg/olivo', true);
  page += text(523, 354, 7, 'Rend.', true);
  page += line(42, 349, 553, 349, 0.4);
  let y = 332;

  for (const plot of summary.plots) {
    if (y < 84) {
      page += footer(input); pages.push(page); pageNumber += 1; page = header(input, pageNumber);
      page += text(42, 744, 11, 'Detalle por parcela (continuacion)', true);
      page += text(42, 725, 7, 'Parcela', true); page += text(164, 725, 7, 'Finca', true);
      page += text(260, 725, 7, 'Ha', true); page += text(300, 725, 7, 'Olivos', true);
      page += text(350, 725, 7, 'Kg', true); page += text(410, 725, 7, 'Kg/ha', true);
      page += text(466, 725, 7, 'Kg/olivo', true); page += text(523, 725, 7, 'Rend.', true);
      page += line(42, 720, 553, 720, 0.4); y = 702;
    }
    page += text(42, y, 7, truncate(plot.name, 19));
    page += text(164, y, 7, truncate(plot.farmName, 14));
    page += text(260, y, 7, format(plot.areaHa, 2));
    page += text(300, y, 7, plot.oliveTreeCount == null ? '-' : String(plot.oliveTreeCount));
    page += text(350, y, 7, format(plot.totalKilograms));
    page += text(410, y, 7, format(plot.kilogramsPerHectare));
    page += text(466, y, 7, format(plot.kilogramsPerOliveTree));
    page += text(523, y, 7, percent(plot.weightedYieldPercent));
    page += line(42, y - 5, 553, y - 5, 0.2);
    y -= 17;
  }

  page += footer(input); pages.push(page);
  return buildPdf(pages);
}
