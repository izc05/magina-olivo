import {
  summarizeHoldingHarvest,
  type HoldingHarvestPlot,
  type HoldingHarvestPlotSummary,
  type HoldingHarvestSummary,
} from './holding-harvest-report-format.ts';

export type HoldingHarvestCampaignSnapshot = {
  name: string;
  seasonStartYear: number;
  seasonEndYear: number;
  plots: HoldingHarvestPlot[];
};

export type HoldingHarvestComparisonInput = {
  generatedAt: string;
  holding: { name: string; municipality: string | null; province: string | null };
  current: HoldingHarvestCampaignSnapshot;
  previous: HoldingHarvestCampaignSnapshot | null;
};

export type MetricComparison = {
  current: number | null;
  previous: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
};

export type HoldingHarvestPlotComparison = {
  id: string;
  farmName: string;
  name: string;
  currentKilograms: number;
  previousKilograms: number;
  kilogramsChange: number;
  currentKilogramsPerHectare: number | null;
  previousKilogramsPerHectare: number | null;
  kilogramsPerHectareChange: number | null;
  currentYieldPercent: number | null;
  previousYieldPercent: number | null;
  yieldPercentagePointChange: number | null;
};

export type HoldingHarvestComparison = {
  currentSummary: HoldingHarvestSummary;
  previousSummary: HoldingHarvestSummary | null;
  activeAreaHa: number;
  activeOliveTreeCount: number;
  totalKilograms: MetricComparison;
  kilogramsPerHectare: MetricComparison;
  kilogramsPerOliveTree: MetricComparison;
  weightedYieldPercent: MetricComparison;
  plots: HoldingHarvestPlotComparison[];
  improvedPlots: HoldingHarvestPlotComparison[];
  worsenedPlots: HoldingHarvestPlotComparison[];
  stablePlotCount: number;
};

function positiveNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function metric(current: number | null, previous: number | null): MetricComparison {
  const absoluteChange = current == null || previous == null ? null : current - previous;
  const percentChange = absoluteChange == null || previous == null || previous === 0
    ? null
    : (absoluteChange / previous) * 100;
  return { current, previous, absoluteChange, percentChange };
}

function summaryById(summary: HoldingHarvestSummary): Map<string, HoldingHarvestPlotSummary> {
  return new Map(summary.plots.map((plot) => [plot.id, plot]));
}

export function calculateHoldingHarvestComparison(input: HoldingHarvestComparisonInput): HoldingHarvestComparison {
  const currentSummary = summarizeHoldingHarvest(input.current.plots);
  const previousSummary = input.previous ? summarizeHoldingHarvest(input.previous.plots) : null;
  const activeAreaHa = input.current.plots.reduce((sum, plot) => sum + (positiveNumber(plot.areaHa) ?? 0), 0);
  const activeOliveTreeCount = input.current.plots.reduce(
    (sum, plot) => sum + (plot.oliveTreeCount != null && plot.oliveTreeCount > 0 ? plot.oliveTreeCount : 0),
    0,
  );

  const currentKgPerHa = activeAreaHa > 0 ? currentSummary.totalKilograms / activeAreaHa : null;
  const previousKgPerHa = previousSummary && activeAreaHa > 0 ? previousSummary.totalKilograms / activeAreaHa : null;
  const currentKgPerTree = activeOliveTreeCount > 0 ? currentSummary.totalKilograms / activeOliveTreeCount : null;
  const previousKgPerTree = previousSummary && activeOliveTreeCount > 0
    ? previousSummary.totalKilograms / activeOliveTreeCount
    : null;

  const plots: HoldingHarvestPlotComparison[] = [];
  if (previousSummary) {
    const currentById = summaryById(currentSummary);
    const previousById = summaryById(previousSummary);
    for (const plot of input.current.plots) {
      const current = currentById.get(plot.id);
      const previous = previousById.get(plot.id);
      if (!current || !previous) continue;
      plots.push({
        id: plot.id,
        farmName: plot.farmName,
        name: plot.name,
        currentKilograms: current.totalKilograms,
        previousKilograms: previous.totalKilograms,
        kilogramsChange: current.totalKilograms - previous.totalKilograms,
        currentKilogramsPerHectare: current.kilogramsPerHectare,
        previousKilogramsPerHectare: previous.kilogramsPerHectare,
        kilogramsPerHectareChange: current.kilogramsPerHectare == null || previous.kilogramsPerHectare == null
          ? null
          : current.kilogramsPerHectare - previous.kilogramsPerHectare,
        currentYieldPercent: current.weightedYieldPercent,
        previousYieldPercent: previous.weightedYieldPercent,
        yieldPercentagePointChange: current.weightedYieldPercent == null || previous.weightedYieldPercent == null
          ? null
          : current.weightedYieldPercent - previous.weightedYieldPercent,
      });
    }
  }

  const comparable = plots.filter((plot) => plot.kilogramsPerHectareChange != null);
  const improvedPlots = comparable
    .filter((plot) => (plot.kilogramsPerHectareChange ?? 0) > 0.0001)
    .slice()
    .sort((a, b) => (b.kilogramsPerHectareChange ?? 0) - (a.kilogramsPerHectareChange ?? 0));
  const worsenedPlots = comparable
    .filter((plot) => (plot.kilogramsPerHectareChange ?? 0) < -0.0001)
    .slice()
    .sort((a, b) => (a.kilogramsPerHectareChange ?? 0) - (b.kilogramsPerHectareChange ?? 0));
  const stablePlotCount = comparable.length - improvedPlots.length - worsenedPlots.length;

  return {
    currentSummary,
    previousSummary,
    activeAreaHa,
    activeOliveTreeCount,
    totalKilograms: metric(currentSummary.totalKilograms, previousSummary?.totalKilograms ?? null),
    kilogramsPerHectare: metric(currentKgPerHa, previousKgPerHa),
    kilogramsPerOliveTree: metric(currentKgPerTree, previousKgPerTree),
    weightedYieldPercent: metric(currentSummary.weightedYieldPercent, previousSummary?.weightedYieldPercent ?? null),
    plots,
    improvedPlots,
    worsenedPlots,
    stablePlotCount,
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

function format(value: number | null, digits = 1): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(value).replaceAll('.', ' ');
}

function signed(value: number | null, digits = 1, suffix = ''): string {
  if (value == null) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${format(value, digits)}${suffix}`;
}

function signedPercent(value: number | null): string {
  if (value == null) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)} %`;
}

function percent(value: number | null): string {
  return value == null ? '-' : `${value.toFixed(2)} %`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

function season(startYear: number, endYear: number): string {
  return `${startYear}/${String(endYear).slice(-2)}`;
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
    objects.set(contentRef, Buffer.concat([
      Buffer.from(`<< /Length ${body.length} >>\nstream\n`, 'latin1'),
      body,
      Buffer.from('\nendstream', 'latin1'),
    ]));
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
    parts.push(object);
    length += object.length;
  }
  const xrefOffset = length;
  const xref = ['xref', `0 ${max + 1}`, '0000000000 65535 f '];
  for (let n = 1; n <= max; n += 1) xref.push(`${String(offsets.get(n)).padStart(10, '0')} 00000 n `);
  xref.push('trailer', `<< /Size ${max + 1} /Root 1 0 R >>`, 'startxref', String(xrefOffset), '%%EOF', '');
  parts.push(Buffer.from(xref.join('\n'), 'latin1'));
  return Buffer.concat(parts);
}

function pageHeader(input: HoldingHarvestComparisonInput, pageNumber: number): string {
  let out = text(42, 806, 19, 'MAGINA OLIVO', true);
  out += text(42, 783, 15, 'Comparativa global de campanas', true);
  out += text(430, 806, 8, `Pagina ${pageNumber}`);
  out += text(430, 792, 8, `Actual ${season(input.current.seasonStartYear, input.current.seasonEndYear)}`);
  out += line(42, 770, 553, 770, 0.8);
  return out;
}

function footer(input: HoldingHarvestComparisonInput): string {
  return line(42, 58, 553, 58, 0.4)
    + text(42, 42, 6.5, `Generado por Magina Olivo: ${input.generatedAt.slice(0, 10)}`)
    + text(330, 42, 6.5, 'Comparacion basada en los datos registrados en la aplicacion.');
}

export function buildHoldingHarvestComparisonPdf(input: HoldingHarvestComparisonInput): Buffer {
  const comparison = calculateHoldingHarvestComparison(input);
  const pages: string[] = [];
  let pageNumber = 1;
  let page = pageHeader(input, pageNumber);
  const location = [input.holding.municipality, input.holding.province].filter(Boolean).join(', ');
  page += text(42, 744, 11, input.holding.name, true);
  if (location) page += text(42, 728, 8, location);
  page += text(42, 706, 8, `Campana actual: ${input.current.name} (${season(input.current.seasonStartYear, input.current.seasonEndYear)})`, true);

  if (!input.previous || !comparison.previousSummary) {
    page += text(42, 670, 12, 'Sin comparativa disponible', true);
    page += line(42, 662, 553, 662);
    page += text(42, 638, 9, 'No hay una campana anterior comparable registrada para esta explotacion.');
    page += text(42, 612, 8, `Kilos actuales: ${format(comparison.currentSummary.totalKilograms)} kg`);
    page += text(42, 594, 8, `Rendimiento actual: ${percent(comparison.currentSummary.weightedYieldPercent)}`);
    page += text(42, 576, 8, `Superficie activa usada como base futura: ${format(comparison.activeAreaHa, 2)} ha`);
    page += text(42, 558, 8, `Olivos activos usados como base futura: ${comparison.activeOliveTreeCount || '-'}`);
    page += footer(input);
    pages.push(page);
    return buildPdf(pages);
  }

  page += text(42, 690, 8, `Campana anterior: ${input.previous.name} (${season(input.previous.seasonStartYear, input.previous.seasonEndYear)})`);
  page += text(42, 663, 11, 'Resumen comparativo', true);
  page += line(42, 656, 553, 656);
  page += text(42, 638, 7, 'Metrica', true);
  page += text(230, 638, 7, 'Actual', true);
  page += text(315, 638, 7, 'Anterior', true);
  page += text(400, 638, 7, 'Cambio', true);
  page += text(492, 638, 7, 'Cambio %', true);
  page += line(42, 633, 553, 633, 0.4);

  const rows = [
    ['Kilos entregados', `${format(comparison.totalKilograms.current)} kg`, `${format(comparison.totalKilograms.previous)} kg`, `${signed(comparison.totalKilograms.absoluteChange)} kg`, signedPercent(comparison.totalKilograms.percentChange)],
    ['Kg/ha (base activa)', format(comparison.kilogramsPerHectare.current), format(comparison.kilogramsPerHectare.previous), signed(comparison.kilogramsPerHectare.absoluteChange), signedPercent(comparison.kilogramsPerHectare.percentChange)],
    ['Kg/olivo (base activa)', format(comparison.kilogramsPerOliveTree.current, 2), format(comparison.kilogramsPerOliveTree.previous, 2), signed(comparison.kilogramsPerOliveTree.absoluteChange, 2), signedPercent(comparison.kilogramsPerOliveTree.percentChange)],
    ['Rendimiento medio', percent(comparison.weightedYieldPercent.current), percent(comparison.weightedYieldPercent.previous), signed(comparison.weightedYieldPercent.absoluteChange, 2, ' pp'), '-'],
  ] as const;
  let rowY = 615;
  for (const row of rows) {
    page += text(42, rowY, 8, row[0]);
    page += text(230, rowY, 8, row[1], true);
    page += text(315, rowY, 8, row[2]);
    page += text(400, rowY, 8, row[3]);
    page += text(492, rowY, 8, row[4]);
    rowY -= 19;
  }

  page += text(42, 522, 7, `Base fija: ${format(comparison.activeAreaHa, 2)} ha activas y ${comparison.activeOliveTreeCount || '-'} olivos activos.`);
  page += text(42, 493, 11, 'Balance de parcelas', true);
  page += line(42, 486, 553, 486);
  page += text(42, 468, 8, `Mejoran en kg/ha: ${comparison.improvedPlots.length}`, true);
  page += text(210, 468, 8, `Empeoran: ${comparison.worsenedPlots.length}`, true);
  page += text(360, 468, 8, `Estables: ${comparison.stablePlotCount}`, true);

  page += text(42, 435, 10, 'Parcelas que mas mejoran', true);
  let improveY = 417;
  if (comparison.improvedPlots.length === 0) page += text(42, improveY, 8, 'Sin mejoras comparables en kg/ha.');
  for (const plot of comparison.improvedPlots.slice(0, 5)) {
    page += text(42, improveY, 8, truncate(plot.name, 28));
    page += text(260, improveY, 8, `${format(plot.previousKilogramsPerHectare)} -> ${format(plot.currentKilogramsPerHectare)} kg/ha`);
    page += text(470, improveY, 8, signed(plot.kilogramsPerHectareChange));
    improveY -= 16;
  }

  page += text(42, 325, 10, 'Parcelas que mas retroceden', true);
  let worsenY = 307;
  if (comparison.worsenedPlots.length === 0) page += text(42, worsenY, 8, 'Sin retrocesos comparables en kg/ha.');
  for (const plot of comparison.worsenedPlots.slice(0, 5)) {
    page += text(42, worsenY, 8, truncate(plot.name, 28));
    page += text(260, worsenY, 8, `${format(plot.previousKilogramsPerHectare)} -> ${format(plot.currentKilogramsPerHectare)} kg/ha`);
    page += text(470, worsenY, 8, signed(plot.kilogramsPerHectareChange));
    worsenY -= 16;
  }

  page += footer(input);
  pages.push(page);

  pageNumber += 1;
  page = pageHeader(input, pageNumber);
  page += text(42, 744, 11, 'Detalle comparativo por parcela', true);
  page += text(42, 724, 6.5, 'Parcela', true);
  page += text(156, 724, 6.5, 'Finca', true);
  page += text(244, 724, 6.5, 'Kg act.', true);
  page += text(298, 724, 6.5, 'Kg ant.', true);
  page += text(350, 724, 6.5, 'Delta kg', true);
  page += text(410, 724, 6.5, 'Kg/ha act.', true);
  page += text(468, 724, 6.5, 'Kg/ha ant.', true);
  page += text(526, 724, 6.5, 'Delta', true);
  page += line(42, 718, 553, 718, 0.4);
  let y = 700;

  for (const plot of comparison.plots) {
    if (y < 84) {
      page += footer(input);
      pages.push(page);
      pageNumber += 1;
      page = pageHeader(input, pageNumber);
      page += text(42, 744, 11, 'Detalle comparativo por parcela (continuacion)', true);
      page += text(42, 724, 6.5, 'Parcela', true);
      page += text(156, 724, 6.5, 'Finca', true);
      page += text(244, 724, 6.5, 'Kg act.', true);
      page += text(298, 724, 6.5, 'Kg ant.', true);
      page += text(350, 724, 6.5, 'Delta kg', true);
      page += text(410, 724, 6.5, 'Kg/ha act.', true);
      page += text(468, 724, 6.5, 'Kg/ha ant.', true);
      page += text(526, 724, 6.5, 'Delta', true);
      page += line(42, 718, 553, 718, 0.4);
      y = 700;
    }
    page += text(42, y, 6.5, truncate(plot.name, 18));
    page += text(156, y, 6.5, truncate(plot.farmName, 13));
    page += text(244, y, 6.5, format(plot.currentKilograms));
    page += text(298, y, 6.5, format(plot.previousKilograms));
    page += text(350, y, 6.5, signed(plot.kilogramsChange));
    page += text(410, y, 6.5, format(plot.currentKilogramsPerHectare));
    page += text(468, y, 6.5, format(plot.previousKilogramsPerHectare));
    page += text(526, y, 6.5, signed(plot.kilogramsPerHectareChange));
    y -= 17;
  }

  page += footer(input);
  pages.push(page);
  return buildPdf(pages);
}
