import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/data/market.json', import.meta.url), 'utf8'));

if (!payload.sourceUrl || !URL.canParse(payload.sourceUrl)) throw new Error('Mercado: falta una URL de fuente válida.');
if (!Array.isArray(payload.periods) || payload.periods.length < 2) throw new Error('Mercado: faltan periodos semanales.');
if (!Array.isArray(payload.series) || payload.series.length < 3 || payload.series.length > 4) {
  throw new Error('Mercado: deben existir AOVE, Virgen y Lampante, con Refinado opcional.');
}

const allowed = new Set(['aove', 'virgen', 'lampante', 'refinado']);
const required = new Set(['aove', 'virgen', 'lampante']);
const seen = new Set();

for (const series of payload.series) {
  if (!allowed.has(series.id)) throw new Error(`Mercado: serie no esperada ${series.id}.`);
  if (seen.has(series.id)) throw new Error(`Mercado: serie duplicada ${series.id}.`);
  seen.add(series.id);
  required.delete(series.id);

  if (!Array.isArray(series.values) || series.values.length !== payload.periods.length) {
    throw new Error(`Mercado: ${series.id} no tiene un valor por periodo.`);
  }
  for (const value of series.values) {
    if (!Number.isFinite(value) || value < 1 || value > 15) throw new Error(`Mercado: precio fuera de rango en ${series.id}: ${value}.`);
  }
}

if (required.size) throw new Error(`Mercado: faltan series ${[...required].join(', ')}.`);

const latest = Object.fromEntries(payload.series.map((series) => [series.id, series.values.at(-1)]));
if (!(latest.aove >= latest.virgen && latest.virgen >= latest.lampante)) {
  throw new Error(`Mercado: jerarquía de precios anómala AOVE=${latest.aove}, Virgen=${latest.virgen}, Lampante=${latest.lampante}.`);
}

console.log(`Control de Mercado: ${payload.periods.length} semanas · ${payload.periods.at(-1)}.`);
console.log(`AOVE ${latest.aove} €/kg · Virgen ${latest.virgen} €/kg · Lampante ${latest.lampante} €/kg${latest.refinado == null ? '' : ` · Refinado ${latest.refinado} €/kg`}.`);
if (payload.collectorError) console.warn(`Mercado usa el último feed válido por error de actualización: ${payload.collectorError}`);
console.log('Feed de Mercado válido para publicación.');
