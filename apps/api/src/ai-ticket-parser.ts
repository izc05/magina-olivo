export type ParsedTicketResult = {
  confidence: number;
  kilograms: string;
  fatYieldPercent?: number;
  acidityPercent?: number;
  ticketNumber?: string;
  cooperativeName?: string;
  deliveredAt?: string;
  notes?: string;
  humanExplanation: string;
};

export function parseAlmazaraTicketText(text: string): ParsedTicketResult {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  
  // Extract Kilograms
  let kilograms = '0';
  const kgMatch = normalized.match(/(?:kilos?|kg|peso neto|neto)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) 
    || normalized.match(/(\d{3,6})\s*(?:kilos?|kg)/i)
    || normalized.match(/(?:neto)\s*(\d+(?:[.,]\d+)?)/i);

  if (kgMatch && kgMatch[1]) {
    let raw = kgMatch[1];
    // Handle Spanish thousands separator (e.g. 4.250 -> 4250)
    if (/^\d{1,3}\.\d{3}$/.test(raw)) {
      raw = raw.replace('.', '');
    } else {
      raw = raw.replace(',', '.');
    }
    const val = Number(raw);
    if (Number.isFinite(val) && val > 0) {
      kilograms = String(val);
    }
  }

  // Extract Fat Yield % (Rendimiento graso)
  let fatYieldPercent: number | undefined;
  const yieldMatch = normalized.match(/(?:rendimiento|rg|rend\.?|graso)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%?/i);
  if (yieldMatch && yieldMatch[1]) {
    const val = Number(yieldMatch[1].replace(',', '.'));
    if (Number.isFinite(val) && val > 0 && val < 50) {
      fatYieldPercent = val;
    }
  }

  // Extract Acidity %
  let acidityPercent: number | undefined;
  const acidMatch = normalized.match(/(?:acidez|grado|ácid\.?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*°?%?/i);
  if (acidMatch && acidMatch[1]) {
    const val = Number(acidMatch[1].replace(',', '.'));
    if (Number.isFinite(val) && val >= 0 && val < 10) {
      acidityPercent = val;
    }
  }

  // Extract Ticket / Pesada Number
  let ticketNumber: string | undefined;
  const ticketMatch = normalized.match(/(?:ticket|pesada|nº|num)\s*[:=]?\s*([a-z0-9\-_]{3,})/i);
  if (ticketMatch && ticketMatch[1]) {
    ticketNumber = ticketMatch[1].trim();
  }

  // Extract Cooperative / Almazara name
  let cooperativeName: string | undefined;
  const coopMatch = normalized.match(/(?:cooperativa|almazara|s\.c\.a|scap|oille)\s*[:=]?\s*([a-záéíóúñ\s\.]+)/i);
  if (coopMatch && coopMatch[1]) {
    cooperativeName = coopMatch[1].trim().slice(0, 60);
  }

  const confidence = kilograms !== '0' ? (fatYieldPercent ? 0.95 : 0.85) : 0.4;

  const explanationParts = [`Leídos ${kilograms} kg de aceituna`];
  if (fatYieldPercent) explanationParts.push(`rendimiento del ${fatYieldPercent}%`);
  if (acidityPercent) explanationParts.push(`acidez de ${acidityPercent}°`);
  if (cooperativeName) explanationParts.push(`en ${cooperativeName}`);

  const res: ParsedTicketResult = {
    confidence,
    kilograms,
    notes: text.slice(0, 200),
    humanExplanation: explanationParts.join(', ') + '.',
  };
  if (fatYieldPercent != null) res.fatYieldPercent = fatYieldPercent;
  if (acidityPercent != null) res.acidityPercent = acidityPercent;
  if (ticketNumber) res.ticketNumber = ticketNumber;
  if (cooperativeName) res.cooperativeName = cooperativeName;

  return res;
}

