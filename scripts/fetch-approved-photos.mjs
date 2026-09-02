import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(process.cwd());

const assets = [
  {
    output: 'public/photos/home-sierra-magina.webp',
    source: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Paisaje_de_olivar_24J_05.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Paisaje_de_olivar_24J_05.jpg',
    author: 'Veinticuatro de Jahén',
    license: 'CC BY-SA 4.0',
    width: 1600,
    height: 900,
    position: 'centre',
  },
  {
    output: 'public/photos/field-olivares-magina.webp',
    source: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Olivares_Sierra_M%C3%A1gina.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Olivares_Sierra_M%C3%A1gina.jpg',
    author: 'Veinticuatro de Jahén',
    license: 'CC BY-SA 4.0',
    width: 1600,
    height: 1000,
    position: 'centre',
  },
  {
    output: 'public/photos/discover-sierra-magina.webp',
    source: 'https://upload.wikimedia.org/wikipedia/commons/2/20/SIERRA_M%C3%81GINA.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:SIERRA_M%C3%81GINA.jpg',
    author: 'Manuel Francisco Parrilla Cabezas',
    license: 'CC BY-SA 4.0',
    width: 1600,
    height: 900,
    position: 'centre',
  },
  {
    output: 'public/photos/discover-jimena.webp',
    source: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Jimena_Ja%C3%A9n01.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Jimena_Ja%C3%A9n01.jpg',
    author: 'Veinticuatro de Jahén',
    license: 'CC BY-SA 4.0',
    width: 1400,
    height: 1000,
    position: 'centre',
  },
];

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Magina-Olivo-asset-pipeline/1.0 (project asset preparation)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al descargar ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function buildAsset(asset) {
  const output = resolve(ROOT, asset.output);
  await mkdir(dirname(output), { recursive: true });

  console.log(`↓ ${asset.sourcePage}`);
  const input = await fetchBuffer(asset.source);

  const result = await sharp(input)
    .rotate()
    .resize(asset.width, asset.height, {
      fit: 'cover',
      position: asset.position,
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toBuffer();

  await writeFile(output, result);
  console.log(`✓ ${asset.output} · ${(result.length / 1024).toFixed(0)} KB · ${asset.author} · ${asset.license}`);
}

console.log('Mágina Olivo · sincronización de fotografía aprobada');
console.log('Las fotografías se descargan desde Wikimedia Commons y se generan como adaptaciones WebP.');

for (const asset of assets) {
  await buildAsset(asset);
}

console.log('\nListo. Revisa visualmente los recortes antes de publicar y conserva public/photos/README.md con los créditos/licencias.');
