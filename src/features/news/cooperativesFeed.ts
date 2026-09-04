export type CooperativeProduct = {
  name: string;
  type: string;
  format?: string;
  storePriceLabel?: string;
  priceCapturedAt?: string;
  priceSourceUrl?: string;
};

export type CooperativeRecord = {
  id: string;
  name: string;
  town: string;
  brand: string;
  dop: boolean;
  officialWebsite?: string;
  productSourceUrl?: string;
  products?: CooperativeProduct[];
};

export type CooperativeShopSync = {
  generatedAt: string;
  sourceCount: number;
  healthySourceCount: number;
  verifiedProducts: number;
  updatedProducts: number;
  collectorErrors?: string[];
};

export type CooperativesPayload = {
  generatedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  shopSync?: CooperativeShopSync;
  cooperatives: CooperativeRecord[];
};

function getDataPath(file: string): string {
  const pathname = window.location.pathname;
  const base = pathname.startsWith('/magina-olivo/') ? '/magina-olivo/' : '/';
  return `${base}data/${file}`;
}

export async function loadCooperatives(): Promise<CooperativesPayload> {
  const response = await fetch(`${getDataPath('cooperatives.json')}?ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar el directorio (${response.status})`);

  const payload = await response.json() as CooperativesPayload;
  if (!Array.isArray(payload.cooperatives)) throw new Error('Directorio de cooperativas no válido');
  return payload;
}
