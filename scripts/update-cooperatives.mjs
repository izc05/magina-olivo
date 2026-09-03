import { readFile, writeFile } from 'node:fs/promises';

const OUTPUT = new URL('../public/data/cooperatives.json', import.meta.url);
const USER_AGENT = 'MaginaOlivoCoopBot/1.2 (+https://github.com/izc05/magina-olivo)';
const CONCURRENCY = 4;

const cooperativeSourceOverrides = {
  'remedios-jimena': 'https://www.aceitedeoro.es/',
};

const productRules = {
  'remedios-jimena|Oro de Cánava|Caja 8 PET · 1 L · campaña 2025/26': {
    sourceUrl: 'https://www.aceitedeoro.es/inicio/22-159-pet.html',
    lookupName: 'CAMPAÑA 2025-2026 AOVE PET',
    mode: 'single',
  },
  'san-roque-carchelejo|Tierras del Marquesado Selección Premium': {
    sourceUrl: 'https://tierrasdelmarquesado.com/product/estuche-seleccion/',
    lookupName: 'Picual D.O. Selección Premium 500 ml',
    mode: 'single',
  },
  'san-sebastian-guardia|Señorío de Mesía': {
    sourceUrl: 'https://senoriodemesia.es/tienda-online-aceite-de-oliva-jaen/',
    lookupName: 'Señorío de Mesía Aceite de Oliva Virgen Extra',
    mode: 'range',
  },
  'san-sebastian-guardia|Señorío de Mesía Cosecha Temprana': {
    sourceUrl: 'https://senoriodemesia.es/producto/senorio-de-mesiacosecha-temprana/',
    lookupName: 'Señorío de Mesía Cosecha Temprana',
    mode: 'range',
  },
  'san-sebastian-guardia|Señorío de Mesía Ecológico': {
    sourceUrl: 'https://senoriodemesia.es/producto/senorio-de-mesia-ecologico/',
    lookupName: 'Señorío de Mesía Ecológico',
    mode: 'range',
  },
};

function decodeEntities(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&euro;', '€')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function plainText(html = '') {
  return decodeEntities(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function parseAmount(label = '') {
  const match = label.match(/(\d{1,4}(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function priceVariants(value) {
  const fixed = value.toFixed(2);
  const compact = Number.isInteger(value) ? String(value) : String(value);
  return new Set([fixed, fixed.replace('.', ','), compact, compact.replace('.', ',')]);
}

function pageContainsPrice(html, value) {
  const text = plainText(html);
  return [...priceVariants(value)].some((variant) => (
    text.includes(`${variant} €`) ||
    text.includes(`${variant}€`) ||
    html.includes(`>${variant}<`) ||
    html.includes(`>${variant.replace('.', ',')}<`)
  ));
}

function textAfterProduct(html, productName, length = 700) {
  const text = plainText(html);
  const haystack = normalize(text);
  const needle = normalize(productName);
  const index = haystack.indexOf(needle);
  if (index < 0) return '';
  return text.slice(index, index + length);
}

function priceNearProduct(html, productName) {
  const nearby = textAfterProduct(html, productName);
  const matches = [...nearby.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)]
    .map((match) => Number(match[1].replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 1000);
  return matches[0] ?? null;
}

function rangeNearProduct(html, productName) {
  const nearby = textAfterProduct(html, productName, 450);
  const match = nearby.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*€?\s*[-–]\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*€/);
  if (!match) return null;
  const low = Number(match[1].replace(',', '.'));
  const high = Number(match[2].replace(',', '.'));
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high < low || high >= 1000) return null;
  return [low, high];
}

function structuredPrices(html) {
  const values = [];
  const patterns = [
    /["']price["']\s*:\s*["']?(\d{1,4}(?:[.,]\d{1,2})?)/gi,
    /["']lowPrice["']\s*:\s*["']?(\d{1,4}(?:[.,]\d{1,2})?)/gi,
    /itemprop=["']price["'][^>]*content=["'](\d{1,4}(?:[.,]\d{1,2})?)/gi,
    /property=["']product:price:amount["'][^>]*content=["'](\d{1,4}(?:[.,]\d{1,2})?)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = Number(match[1].replace(',', '.'));
      if (Number.isFinite(value) && value > 0 && value < 1000) values.push(value);
    }
  }
  return [...new Set(values)];
}

function formatNumber(value) {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRange(low, high) {
  return `${formatNumber(low)}–${formatNumber(high)} €`;
}

function replaceAmount(label, value) {
  const original = label.match(/\d{1,4}(?:[.,]\d{1,2})?/)?.[0] ?? '';
  const decimals = original.includes(',') || original.includes('.') ? 2 : (Number.isInteger(value) ? 0 : 2);
  const formatted = value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return label.replace(/\d{1,4}(?:[.,]\d{1,2})?/, formatted);
}

function isDirectProductUrl(url, productSourceUrl) {
  if (!url || url === productSourceUrl) return false;
  try {
    const { pathname } = new URL(url);
    return /\/(product|producto|productos|aceite-de-oliva|tienda)\//i.test(pathname) && pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function targetFor(cooperative, product) {
  const keyWithFormat = `${cooperative.id}|${product.name}|${product.format ?? ''}`;
  const key = `${cooperative.id}|${product.name}`;
  const rule = productRules[keyWithFormat] ?? productRules[key];
  return {
    sourceUrl: rule?.sourceUrl ?? cooperativeSourceOverrides[cooperative.id] ?? product.priceSourceUrl,
    rule: rule ?? null,
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  if (/please wait while your request is being verified/i.test(html)) throw new Error('protección anti-bot');
  return html;
}

async function main() {
  const payload = JSON.parse(await readFile(OUTPUT, 'utf8'));
  const cooperatives = Array.isArray(payload.cooperatives) ? payload.cooperatives : [];

  const targets = [];
  for (const cooperative of cooperatives) {
    for (const product of cooperative.products ?? []) {
      if (!product.storePriceLabel || !product.priceSourceUrl) continue;
      const target = targetFor(cooperative, product);
      targets.push({ cooperative, product, ...target });
    }
  }

  const byUrl = new Map();
  for (const target of targets) {
    const list = byUrl.get(target.sourceUrl) ?? [];
    list.push(target);
    byUrl.set(target.sourceUrl, list);
  }

  const urls = [...byUrl.keys()];
  const errors = [];
  let healthySources = 0;
  let verifiedProducts = 0;
  let updatedProducts = 0;
  const today = new Date().toISOString().slice(0, 10);

  async function processUrl(url) {
    const urlTargets = byUrl.get(url) ?? [];
    let html;
    try {
      html = await fetchHtml(url);
      healthySources += 1;
    } catch (error) {
      errors.push(`${url}: ${error?.message ?? String(error)}`);
      return;
    }

    for (const { cooperative, product, rule } of urlTargets) {
      const current = parseAmount(product.storePriceLabel);
      if (current == null) continue;

      if (rule?.mode === 'range') {
        const range = rangeNearProduct(html, rule.lookupName);
        if (!range) {
          errors.push(`${cooperative.brand}/${product.name}: no se pudo leer el rango oficial en ${url}`);
          continue;
        }
        const nextLabel = formatRange(range[0], range[1]);
        if (product.storePriceLabel !== nextLabel) {
          product.storePriceLabel = nextLabel;
          updatedProducts += 1;
        }
        product.priceCapturedAt = today;
        product.priceSourceUrl = url;
        verifiedProducts += 1;
        continue;
      }

      if (rule?.mode === 'single') {
        const scoped = priceNearProduct(html, rule.lookupName);
        if (scoped == null || scoped < current * 0.4 || scoped > current * 2.5) {
          errors.push(`${cooperative.brand}/${product.name}: no se pudo leer el precio oficial en ${url}`);
          continue;
        }
        const nextLabel = replaceAmount(product.storePriceLabel, scoped);
        if (product.storePriceLabel !== nextLabel) {
          product.storePriceLabel = nextLabel;
          updatedProducts += 1;
        }
        product.priceCapturedAt = today;
        product.priceSourceUrl = url;
        verifiedProducts += 1;
        continue;
      }

      if (pageContainsPrice(html, current)) {
        product.priceCapturedAt = today;
        product.priceSourceUrl = url;
        verifiedProducts += 1;
        continue;
      }

      const direct = isDirectProductUrl(url, cooperative.productSourceUrl);
      const candidates = direct ? structuredPrices(html) : [];
      const plausible = candidates
        .filter((candidate) => candidate >= current * 0.5 && candidate <= current * 2)
        .sort((a, b) => Math.abs(a - current) - Math.abs(b - current));

      if (plausible.length) {
        const next = plausible[0];
        product.storePriceLabel = replaceAmount(product.storePriceLabel, next);
        product.priceCapturedAt = today;
        product.priceSourceUrl = url;
        verifiedProducts += 1;
        if (Math.abs(next - current) > 0.001) updatedProducts += 1;
      } else {
        errors.push(`${cooperative.brand}/${product.name}: no se pudo verificar el precio en ${url}`);
      }
    }
  }

  for (let index = 0; index < urls.length; index += CONCURRENCY) {
    const batch = urls.slice(index, index + CONCURRENCY);
    await Promise.all(batch.map(processUrl));
  }

  const generatedAt = new Date().toISOString();
  const nextPayload = {
    ...payload,
    generatedAt,
    shopSync: {
      generatedAt,
      sourceCount: urls.length,
      healthySourceCount: healthySources,
      verifiedProducts,
      updatedProducts,
      collectorErrors: errors,
    },
    cooperatives,
  };

  await writeFile(OUTPUT, `${JSON.stringify(nextPayload, null, 2)}\n`);
  console.log(`Cooperativas sincronizadas: ${verifiedProducts}/${targets.length} precios verificados · ${healthySources}/${urls.length} páginas operativas · ${updatedProducts} precios actualizados.`);
  if (errors.length) console.warn(`Incidencias de sincronización: ${errors.slice(0, 12).join(' | ')}${errors.length > 12 ? ` | +${errors.length - 12} más` : ''}`);
}

await main();
