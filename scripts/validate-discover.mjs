import { readFile } from 'node:fs/promises';

const path = new URL('../public/data/discover.json', import.meta.url);
const payload = JSON.parse(await readFile(path, 'utf8'));
const places = Array.isArray(payload.places) ? payload.places : [];

if (places.length < 4) throw new Error(`Descubre sólo contiene ${places.length} lugares; mínimo esperado: 4.`);
if (!URL.canParse(payload.sourceUrl ?? '')) throw new Error('Descubre no tiene sourceUrl válido.');
if (!String(payload.sourceLabel ?? '').includes('Diputación')) throw new Error('Descubre no identifica la fuente institucional.');
if (!String(payload.heroImage ?? '').startsWith('/photos/')) throw new Error('Descubre no usa una fotografía aprobada como portada.');

const ids = new Set();
const urls = new Set();
for (const place of places) {
  for (const field of ['id', 'name', 'municipality', 'kind', 'summary', 'url']) {
    if (!place[field]) throw new Error(`Lugar sin ${field}: ${place.name ?? place.id ?? 'sin identificar'}`);
  }
  if (place.official !== true) throw new Error(`Lugar no marcado como oficial: ${place.name}`);
  if (!URL.canParse(place.url)) throw new Error(`URL no válida en Descubre: ${place.url}`);
  const host = new URL(place.url).hostname;
  if (host !== 'www.jaenparaisointerior.es') throw new Error(`Fuente no permitida en Descubre: ${host}`);
  if (ids.has(place.id)) throw new Error(`ID duplicado en Descubre: ${place.id}`);
  if (urls.has(place.url)) throw new Error(`URL duplicada en Descubre: ${place.url}`);
  ids.add(place.id);
  urls.add(place.url);
}

console.log(`Descubre válido: ${places.length} lugares oficiales · ${new Set(places.map((place) => place.municipality)).size} ámbitos territoriales.`);
places.forEach((place, index) => console.log(`${index + 1}. [${place.kind}] ${place.name} — ${place.municipality}`));
