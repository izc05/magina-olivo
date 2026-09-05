import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(process.cwd());
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const assets = [
  { output: 'public/photos/home-sierra-magina.webp', file: 'Paisaje de olivar 24J 05.jpg', sourcePage: 'https://commons.wikimedia.org/wiki/File:Paisaje_de_olivar_24J_05.jpg', author: 'Veinticuatro de Jahén', license: 'CC BY-SA 4.0', width: 1600, height: 900 },
  { output: 'public/photos/field-olivares-magina.webp', file: 'Olivares Sierra Mágina.jpg', sourcePage: 'https://commons.wikimedia.org/wiki/File:Olivares_Sierra_M%C3%A1gina.jpg', author: 'Veinticuatro de Jahén', license: 'CC BY-SA 4.0', width: 1600, height: 1000 },
  { output: 'public/photos/discover-sierra-magina.webp', file: 'SIERRA MÁGINA.jpg', sourcePage: 'https://commons.wikimedia.org/wiki/File:SIERRA_M%C3%81GINA.jpg', author: 'Manuel Francisco Parrilla Cabezas', license: 'CC BY-SA 4.0', width: 1600, height: 900 },
  { output: 'public/photos/discover-jimena.webp', file: 'Jimena Jaén01.jpg', sourcePage: 'https://commons.wikimedia.org/wiki/File:Jimena_Ja%C3%A9n01.jpg', author: 'Veinticuatro de Jahén', license: 'CC BY-SA 4.0', width: 1400, height: 1000 },
];

const headers = { 'user-agent': 'Magina-Olivo-asset-pipeline/1.0 (project asset preparation)' };

async function request(url, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, { headers, redirect: 'follow' });
    if (response.ok) return response;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === maxAttempts) throw new Error(`HTTP ${response.status} al solicitar ${url}`);

    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2500 * attempt;
    console.warn(`↻ HTTP ${response.status}; reintento ${attempt}/${maxAttempts} en ${Math.ceil(waitMs / 1000)} s`);
    await sleep(waitMs);
  }
  throw new Error(`No se pudo solicitar ${url}`);
}

async function resolveCommonsImage(asset) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: String(asset.width),
    titles: `File:${asset.file}`,
  });
  const response = await request(`https://commons.wikimedia.org/w/api.php?${params}`);
  const data = await response.json();
  const info = data?.query?.pages?.[0]?.imageinfo?.[0];
  const url = info?.thumburl ?? info?.url;
  if (!url) throw new Error(`Commons no devolvió URL para ${asset.file}`);
  return url;
}

async function buildAsset(asset) {
  const output = resolve(ROOT, asset.output);
  await mkdir(dirname(output), { recursive: true });
  console.log(`↓ ${asset.sourcePage}`);

  const imageUrl = await resolveCommonsImage(asset);
  await sleep(900);
  const response = await request(imageUrl);
  const input = Buffer.from(await response.arrayBuffer());

  const result = await sharp(input)
    .rotate()
    .resize(asset.width, asset.height, { fit: 'cover', position: 'centre', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toBuffer();

  await writeFile(output, result);
  console.log(`✓ ${asset.output} · ${(result.length / 1024).toFixed(0)} KB · ${asset.author} · ${asset.license}`);
}

console.log('Mágina Olivo · sincronización de fotografía aprobada');
for (const [index, asset] of assets.entries()) {
  await buildAsset(asset);
  if (index < assets.length - 1) await sleep(1800);
}
console.log('\nListo. Revisa visualmente los recortes antes de publicar y conserva public/photos/README.md con los créditos/licencias.');
