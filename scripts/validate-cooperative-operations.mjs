import { readFile } from 'node:fs/promises';

const SOURCE = new URL('../src/features/news/cooperativeOperations.ts', import.meta.url);
const DIRECTORY = new URL('../public/data/cooperatives.json', import.meta.url);
const MIN_PROFILES = 13;
const MIN_MEMBER_ACCESS = 2;
const MIN_WITH_PUBLIC_HOURS = 5;

function fail(message) {
  console.error(`Control operativo: ${message}`);
  process.exitCode = 1;
}

const source = await readFile(SOURCE, 'utf8');
const directory = JSON.parse(await readFile(DIRECTORY, 'utf8'));
const cooperativeIds = new Set((directory.cooperatives ?? []).map((item) => item.id));

const bodyMatch = source.match(/const profiles:[\s\S]*?=\s*\{([\s\S]*?)\n\};\n\nexport function/);
if (!bodyMatch) {
  fail('no se ha podido localizar el registro de perfiles.');
} else {
  const body = bodyMatch[1];
  const ids = [...body.matchAll(/^\s{2}'([^']+)':\s*\{/gm)].map((match) => match[1]);
  const contactUrls = [...body.matchAll(/contactSourceUrl:\s*'([^']+)'/g)].map((match) => match[1]);
  const memberAccessUrls = [...body.matchAll(/memberAccessUrl:\s*'([^']+)'/g)].map((match) => match[1]);
  const publicHoursCount = [...body.matchAll(/publicHours:\s*\[/g)].length;
  const phonesCount = [...body.matchAll(/phones:\s*\[/g)].length;

  if (ids.length < MIN_PROFILES) fail(`sólo hay ${ids.length} perfiles; se requieren al menos ${MIN_PROFILES}.`);
  if (new Set(ids).size !== ids.length) fail('hay identificadores de cooperativa duplicados.');
  if (contactUrls.length !== ids.length) fail(`hay ${contactUrls.length} fuentes de contacto para ${ids.length} perfiles.`);
  if (phonesCount < MIN_PROFILES) fail(`sólo ${phonesCount} perfiles tienen teléfono publicado.`);
  if (memberAccessUrls.length < MIN_MEMBER_ACCESS) fail(`sólo hay ${memberAccessUrls.length} accesos de socios; se requieren al menos ${MIN_MEMBER_ACCESS}.`);
  if (publicHoursCount < MIN_WITH_PUBLIC_HOURS) fail(`sólo ${publicHoursCount} perfiles tienen horario general trazable; se requieren al menos ${MIN_WITH_PUBLIC_HOURS}.`);

  const missingDirectoryIds = ids.filter((id) => !cooperativeIds.has(id));
  if (missingDirectoryIds.length) fail(`perfiles sin cooperativa en el directorio: ${missingDirectoryIds.join(', ')}.`);

  for (const url of [...contactUrls, ...memberAccessUrls]) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) fail(`URL no permitida: ${url}`);
    } catch {
      fail(`URL inválida: ${url}`);
    }
  }

  if (!process.exitCode) {
    console.log(`Control operativo: ${ids.length} perfiles · ${phonesCount} con teléfono · ${publicHoursCount} con horario general · ${memberAccessUrls.length} accesos de socios.`);
    console.log('Información operativa de cooperativas válida para publicación.');
  }
}
