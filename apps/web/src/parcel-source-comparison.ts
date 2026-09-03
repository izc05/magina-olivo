export type DifferenceBand = 'none' | 'low' | 'medium' | 'high';

export function numericArea(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function areaDifferencePercent(declaredAreaHa: string | null, geometricAreaHa: string | null): number | null {
  const declared = numericArea(declaredAreaHa);
  const geometric = numericArea(geometricAreaHa);
  if (declared == null || geometric == null || declared === 0) return null;
  return Math.abs(geometric - declared) / declared * 100;
}

export function differenceBand(percent: number | null): DifferenceBand {
  if (percent == null) return 'none';
  if (percent < 2) return 'low';
  if (percent < 5) return 'medium';
  return 'high';
}
