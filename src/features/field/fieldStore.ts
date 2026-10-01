export type ParcelRecord = {
  id: number;
  name: string;
  areaHa: number;
  variety: string;
  altitudeM: number;
  frame: string;
  slopePct: number;
  status: 'Bueno' | 'Revisar';
  note: string;
};

export type JournalKind = 'Tratamiento' | 'Riego' | 'Labor' | 'Abonado' | 'Cosecha' | 'Otro';

export type JournalRecord = {
  id: number;
  date: string;
  kind: JournalKind;
  title: string;
  detail: string;
  parcelId?: number;
};

export type DeliveryRecord = {
  id: number;
  date: string;
  kilos: number;
  yieldPct: number;
  cooperative: string;
};

export type ExpenseCategory = 'Fitosanitarios' | 'Abonado' | 'Riego y energía' | 'Maquinaria' | 'Otros';

export type ExpenseRecord = {
  id: number;
  date: string;
  category: ExpenseCategory;
  concept: string;
  amount: number;
};

export type FieldData = {
  farmName: string;
  municipality: string;
  region: string;
  parcels: ParcelRecord[];
  journal: JournalRecord[];
  deliveries: DeliveryRecord[];
  expenses: ExpenseRecord[];
};

const STORAGE_KEY = 'magina-olivo:field:v1';

export const DEFAULT_FIELD_DATA: FieldData = {
  farmName: 'Los Llanos',
  municipality: 'Bedmar',
  region: 'Sierra Mágina',
  parcels: [
    { id: 1, name: 'Parcela 1', areaHa: 5.2, variety: 'Picual', altitudeM: 650, frame: '7 × 7 m', slopePct: 12, status: 'Bueno', note: 'Desarrollo vegetativo correcto.' },
    { id: 2, name: 'Parcela 2', areaHa: 4.4, variety: 'Picual', altitudeM: 625, frame: '7 × 7 m', slopePct: 8, status: 'Bueno', note: 'Sin incidencias relevantes.' },
    { id: 3, name: 'Parcela 3', areaHa: 4.1, variety: 'Picual', altitudeM: 672, frame: '7 × 7 m', slopePct: 16, status: 'Revisar', note: 'Riesgo medio de repilo por humedad.' },
    { id: 4, name: 'Parcela 4', areaHa: 5.9, variety: 'Picual', altitudeM: 705, frame: '7 × 7 m', slopePct: 19, status: 'Bueno', note: 'Poda completada esta campaña.' },
    { id: 5, name: 'Parcela 5', areaHa: 3.85, variety: 'Picual', altitudeM: 640, frame: '7 × 7 m', slopePct: 10, status: 'Bueno', note: 'Revisar humedad de suelo en 48 h.' },
  ],
  journal: [
    { id: 1, date: '2026-09-02', kind: 'Tratamiento', title: 'Tratamiento', detail: 'Cobre + aceite · Parcela 3', parcelId: 3 },
    { id: 2, date: '2026-08-31', kind: 'Riego', title: 'Riego', detail: 'Parcela 2 · 30 mm', parcelId: 2 },
    { id: 3, date: '2026-08-29', kind: 'Labor', title: 'Poda en verde', detail: 'Parcela 1', parcelId: 1 },
    { id: 4, date: '2026-08-22', kind: 'Abonado', title: 'Abonado', detail: 'Parcela 3 · Los Llanos', parcelId: 3 },
  ],
  deliveries: [
    { id: 1, date: '2026-08-25', kilos: 4420, yieldPct: 16.4, cooperative: 'Cooperativa de referencia' },
    { id: 2, date: '2026-08-31', kilos: 5230, yieldPct: 17.8, cooperative: 'Cooperativa de referencia' },
  ],
  expenses: [
    { id: 1, date: '2026-08-12', category: 'Fitosanitarios', concept: 'Tratamiento cobre', amount: 1240 },
    { id: 2, date: '2026-08-15', category: 'Abonado', concept: 'Abonado campaña', amount: 1080 },
    { id: 3, date: '2026-08-20', category: 'Riego y energía', concept: 'Riego y energía', amount: 860 },
    { id: 4, date: '2026-08-24', category: 'Maquinaria', concept: 'Mantenimiento y combustible', amount: 730 },
    { id: 5, date: '2026-08-27', category: 'Otros', concept: 'Otros gastos', amount: 620 },
  ],
};

export function loadFieldData(): FieldData {
  if (typeof window === 'undefined') return DEFAULT_FIELD_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FIELD_DATA;
    const parsed = JSON.parse(raw) as Partial<FieldData>;
    return {
      ...DEFAULT_FIELD_DATA,
      ...parsed,
      parcels: Array.isArray(parsed.parcels) ? parsed.parcels : DEFAULT_FIELD_DATA.parcels,
      journal: Array.isArray(parsed.journal) ? parsed.journal : DEFAULT_FIELD_DATA.journal,
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : DEFAULT_FIELD_DATA.deliveries,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : DEFAULT_FIELD_DATA.expenses,
    };
  } catch {
    return DEFAULT_FIELD_DATA;
  }
}

export function saveFieldData(data: FieldData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function nextRecordId(records: Array<{ id: number }>) {
  return records.reduce((max, record) => Math.max(max, record.id), 0) + 1;
}
