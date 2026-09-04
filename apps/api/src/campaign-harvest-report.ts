import type { CampaignExportDelivery } from './campaign-export-format.ts';

export type CampaignHarvestReportInput = {
  exportedAt: string;
  holding: {
    name: string;
    municipality: string | null;
    province: string | null;
  };
  campaign: {
    name: string;
    seasonStartYear: number;
    seasonEndYear: number;
  };
  deliveries: CampaignExportDelivery[];
};

export type CampaignParcelHarvestSummary = {
  key: string;
  farmName: string;
  plotName: string;
  kilograms: number;
  deliveriesCount: number;
  coveredKilograms: number;
  weightedYieldPercent: number | null;
  deliveries: CampaignExportDelivery[];
};

type ReportLine = {
  text: string;
  size?: number;
  bold?: boolean;
  leading?: number;
  indent?: number;
};

function finiteNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function summarizeHarvestByParcel(deliveries: CampaignExportDelivery[]): CampaignParcelHarvestSummary[] {
  const groups = new Map<string, CampaignParcelHarvestSummary>();

  for (const delivery of deliveries) {
    const key = delivery.plotId
      ? `plot:${delivery.plotId}`
      : delivery.farmId
        ? `farm:${delivery.farmId}:unassigned`
        : 'unassigned';
    const current = groups.get(key) ?? {
      key,
      farmName: delivery.farmName ?? 'Finca sin asignar',
      plotName: delivery.plotName ?? 'Sin parcela asignada',
      kilograms: 0,
      deliveriesCount: 0,
      coveredKilograms: 0,
      weightedYieldPercent: null,
      deliveries: [],
    };

    const kilograms = Math.max(0, finiteNumber(delivery.kilograms) ?? 0);
    const yieldPercent = finiteNumber(delivery.yieldPercent);
    const previousWeightedMass = current.weightedYieldPercent == null
      ? 0
      : current.weightedYieldPercent * current.coveredKilograms;

    current.kilograms += kilograms;
    current.deliveriesCount += 1;
    current.deliveries.push(delivery);

    if (yieldPercent != null && kilograms > 0) {
      current.coveredKilograms += kilograms;
      current.weightedYieldPercent = (previousWeightedMass + yieldPercent * kilograms) / current.coveredKilograms;
    }

    groups.set(key, current);
  }

  return [...groups.values()].sort((a, b) => {
    const farm = a.farmName.localeCompare(b.farmName, 'es');
    return farm !== 0 ? farm : a.plotName.localeCompare(b.plotName, 'es');
  });
}

function formatKilograms(value: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)} kg`;
}

function formatPercent(value: number | null): string {
  if (value == null) return 'Pendiente';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)} %`;
}

function wrapText(value: string, width = 88): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word.length <= width ? word : `${word.slice(0, Math.max(1, width - 1))}…`;
  }
  if (current) lines.push(current);
  return lines;
}

function reportLines(input: CampaignHarvestReportInput): ReportLine[] {
  const parcels = summarizeHarvestByParcel(input.deliveries);
  const totalKilograms = parcels.reduce((sum, parcel) => sum + parcel.kilograms, 0);
  const totalCoveredKilograms = parcels.reduce((sum, parcel) => sum + parcel.coveredKilograms, 0);
  const weightedMass = parcels.reduce(
    (sum, parcel) => sum + (parcel.weightedYieldPercent ?? 0) * parcel.coveredKilograms,
    0,
  );
  const weightedYield = totalCoveredKilograms > 0 ? weightedMass / totalCoveredKilograms : null;
  const season = `${input.campaign.seasonStartYear}/${String(input.campaign.seasonEndYear).slice(-2)}`;
  const location = [input.holding.municipality, input.holding.province].filter(Boolean).join(' · ');
  const exported = new Date(input.exportedAt).toLocaleString('es-ES');
  const lines: ReportLine[] = [
    { text: 'Mágina Olivo', size: 10, bold: true, leading: 16 },
    { text: 'Informe de cosecha por parcelas', size: 20, bold: true, leading: 27 },
    { text: `${input.campaign.name} · ${season}`, size: 12, bold: true, leading: 19 },
    { text: input.holding.name, size: 11, leading: 16 },
    ...(location ? [{ text: location, size: 10, leading: 16 } satisfies ReportLine] : []),
    { text: `Generado: ${exported}`, size: 8, leading: 20 },
    { text: `Resumen · ${formatKilograms(totalKilograms)} · ${input.deliveries.length} entregas · ${parcels.length} parcelas/grupos · rendimiento ${formatPercent(weightedYield)}`, size: 10, bold: true, leading: 22 },
  ];

  if (!parcels.length) {
    lines.push({ text: 'No hay entregas registradas en esta campaña.', size: 11, leading: 18 });
    return lines;
  }

  for (const parcel of parcels) {
    lines.push({ text: `${parcel.farmName} · ${parcel.plotName}`, size: 13, bold: true, leading: 19 });
    lines.push({
      text: `${formatKilograms(parcel.kilograms)} · ${parcel.deliveriesCount} entregas · rendimiento ponderado ${formatPercent(parcel.weightedYieldPercent)}`,
      size: 9,
      leading: 16,
    });

    for (const delivery of parcel.deliveries) {
      const date = new Date(delivery.deliveredAt).toLocaleDateString('es-ES');
      const yieldText = delivery.yieldPercent ? `${delivery.yieldPercent} %` : 'rend. pendiente';
      const ticket = delivery.ticketNumber ? ` · ticket ${delivery.ticketNumber}` : '';
      const variety = delivery.variety ? ` · ${delivery.variety}` : '';
      const raw = `${date} · ${delivery.kilograms} kg · ${yieldText} · ${delivery.destination}${ticket}${variety}`;
      for (const [index, line] of wrapText(raw).entries()) {
        lines.push({ text: `${index === 0 ? '• ' : '  '}${line}`, size: 8.5, leading: 13, indent: 58 });
      }
    }

    lines.push({ text: '', size: 5, leading: 8 });
  }

  lines.push({
    text: 'Este informe resume los datos privados registrados en Mágina Olivo. Los rendimientos pendientes no se estiman ni se inventan.',
    size: 8,
    leading: 13,
  });
  return lines;
}

function cp1252Byte(character: string): number {
  const codePoint = character.codePointAt(0) ?? 63;
  const specials: Record<number, number> = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x0192: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02c6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8a,
    0x2039: 0x8b,
    0x0152: 0x8c,
    0x017d: 0x8e,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
    0x0161: 0x9a,
    0x203a: 0x9b,
    0x0153: 0x9c,
    0x017e: 0x9e,
    0x0178: 0x9f,
  };
  if (specials[codePoint] != null) return specials[codePoint]!;
  if (codePoint >= 32 && codePoint <= 255) return codePoint;
  return 63;
}

function winAnsiHex(value: string): string {
  return [...value]
    .map((character) => cp1252Byte(character).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function paginate(lines: ReportLine[]): ReportLine[][] {
  const pages: ReportLine[][] = [[]];
  let y = 792;
  for (const line of lines) {
    const leading = line.leading ?? (line.size ?? 10) + 5;
    if (y - leading < 48 && pages[pages.length - 1]!.length > 0) {
      pages.push([]);
      y = 792;
    }
    pages[pages.length - 1]!.push(line);
    y -= leading;
  }
  return pages;
}

function streamForPage(lines: ReportLine[], pageNumber: number, pageCount: number): string {
  let y = 792;
  const commands: string[] = [];
  for (const line of lines) {
    const size = line.size ?? 10;
    const font = line.bold ? '/F2' : '/F1';
    const x = line.indent ?? 50;
    if (line.text) commands.push(`BT ${font} ${size} Tf ${x} ${y} Td <${winAnsiHex(line.text)}> Tj ET`);
    y -= line.leading ?? size + 5;
  }
  commands.push(`BT /F1 7 Tf 50 28 Td <${winAnsiHex(`Mágina Olivo · página ${pageNumber}/${pageCount}`)}> Tj ET`);
  return `${commands.join('\n')}\n`;
}

function buildPdf(pages: ReportLine[][]): Buffer {
  const objects: string[] = [];
  const pageObjectNumbers = pages.map((_, index) => 5 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  pages.forEach((page, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    const stream = streamForPage(page, index + 1, pages.length);
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`;
  });

  let pdf = '%PDF-1.4\n%MGO\n';
  const offsets: number[] = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

export function buildCampaignHarvestReportPdf(input: CampaignHarvestReportInput): Buffer {
  return buildPdf(paginate(reportLines(input)));
}
