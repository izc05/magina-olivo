import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/data/cooperatives.json', import.meta.url), 'utf8'));
const errors = [];
const cooperatives = Array.isArray(payload.cooperatives) ? payload.cooperatives : [];

if (cooperatives.length < 14) errors.push(`Se esperaban al menos 14 cooperativas y hay ${cooperatives.length}.`);

const ids = new Set();
let websites = 0;
let catalogs = 0;
let pricedProducts = 0;

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

for (const cooperative of cooperatives) {
  const label = cooperative.name || cooperative.id || 'cooperativa sin nombre';
  for (const field of ['id', 'name', 'town', 'brand']) {
    if (!cooperative[field]) errors.push(`${label}: falta ${field}.`);
  }
  if (ids.has(cooperative.id)) errors.push(`${label}: id duplicado ${cooperative.id}.`);
  ids.add(cooperative.id);

  if (cooperative.officialWebsite) {
    websites += 1;
    if (!validUrl(cooperative.officialWebsite)) errors.push(`${label}: officialWebsite no válida.`);
  }
  if (cooperative.productSourceUrl) {
    catalogs += 1;
    if (!validUrl(cooperative.productSourceUrl)) errors.push(`${label}: productSourceUrl no válida.`);
  }

  if (cooperative.products && !Array.isArray(cooperative.products)) {
    errors.push(`${label}: products debe ser una lista.`);
    continue;
  }

  for (const product of cooperative.products ?? []) {
    if (!product.name || !product.type) errors.push(`${label}: producto incompleto.`);
    if (product.storePriceLabel) {
      pricedProducts += 1;
      if (!product.priceCapturedAt) errors.push(`${label}/${product.name}: precio sin fecha de captura.`);
      if (!product.priceSourceUrl || !validUrl(product.priceSourceUrl)) errors.push(`${label}/${product.name}: precio sin fuente válida.`);
      if (!/[0-9]/.test(product.storePriceLabel) || !product.storePriceLabel.includes('€')) errors.push(`${label}/${product.name}: etiqueta de precio no reconocible.`);
    }
  }
}

if (websites < 10) errors.push(`Cobertura web insuficiente: ${websites} fichas con web propia.`);
if (catalogs < 12) errors.push(`Cobertura de catálogo insuficiente: ${catalogs} fichas.`);
if (pricedProducts < 29) errors.push(`Cobertura de precios insuficiente: ${pricedProducts} productos con precio trazable.`);

const shopSync = payload.shopSync;
if (!shopSync || typeof shopSync !== 'object') {
  errors.push('Falta la metadata shopSync generada por el sincronizador de tiendas.');
} else {
  for (const field of ['sourceCount', 'healthySourceCount', 'verifiedProducts', 'updatedProducts']) {
    if (!Number.isFinite(shopSync[field]) || shopSync[field] < 0) errors.push(`shopSync.${field} no es válido.`);
  }
  if (shopSync.healthySourceCount > shopSync.sourceCount) errors.push('shopSync: healthySourceCount no puede superar sourceCount.');
  if (shopSync.verifiedProducts > pricedProducts) errors.push('shopSync: verifiedProducts no puede superar los productos con precio.');
  if (shopSync.collectorErrors && !Array.isArray(shopSync.collectorErrors)) errors.push('shopSync.collectorErrors debe ser una lista.');
}

console.log(`Control de cooperativas: ${cooperatives.length} fichas · ${websites} webs · ${catalogs} catálogos · ${pricedProducts} productos con precio.`);
if (shopSync) {
  console.log(`Sincronización tiendas: ${shopSync.verifiedProducts}/${pricedProducts} precios comprobados · ${shopSync.healthySourceCount}/${shopSync.sourceCount} páginas operativas · ${shopSync.updatedProducts} cambios detectados.`);
  if (shopSync.collectorErrors?.length) console.warn(`Sincronización parcial: ${shopSync.collectorErrors.length} incidencias conservando último dato válido.`);
}

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Directorio de cooperativas válido para publicación.');
