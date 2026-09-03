import { readFile } from 'node:fs/promises';

const FEED = new URL('../public/data/news.json', import.meta.url);
const MIN_STORIES = 8;
const MIN_HEALTHY_SOURCES = 3;

const payload = JSON.parse(await readFile(FEED, 'utf8'));
const stories = Array.isArray(payload.stories) ? payload.stories : [];
const healthySourceCount = Number(payload.healthySourceCount ?? payload.sourceCount ?? 0);
const sourceCount = Number(payload.sourceCount ?? healthySourceCount);

const errors = [];

if (stories.length < MIN_STORIES) {
  errors.push(`Sólo hay ${stories.length} noticias; mínimo esperado: ${MIN_STORIES}.`);
}

if (sourceCount > 0 && healthySourceCount < MIN_HEALTHY_SOURCES) {
  errors.push(`Sólo hay ${healthySourceCount}/${sourceCount} fuentes operativas; mínimo esperado: ${MIN_HEALTHY_SOURCES}.`);
}

const ids = new Set();
const urls = new Set();
for (const [index, story] of stories.entries()) {
  const label = `noticia ${index + 1}`;
  for (const field of ['id', 'title', 'source', 'url', 'publishedAt', 'category']) {
    if (!story[field]) errors.push(`${label}: falta ${field}.`);
  }

  if (story.id) {
    if (ids.has(story.id)) errors.push(`${label}: id duplicado ${story.id}.`);
    ids.add(story.id);
  }

  if (story.url) {
    if (urls.has(story.url)) errors.push(`${label}: URL duplicada ${story.url}.`);
    urls.add(story.url);
    try {
      const url = new URL(story.url);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push(`${label}: protocolo de URL no permitido.`);
    } catch {
      errors.push(`${label}: URL no válida.`);
    }
  }

  if (story.publishedAt && Number.isNaN(new Date(story.publishedAt).getTime())) {
    errors.push(`${label}: publishedAt no es una fecha válida.`);
  }
}

console.log(`Control de calidad: ${stories.length} noticias · ${healthySourceCount}/${sourceCount || healthySourceCount} fuentes operativas.`);
console.log('Top 5 seleccionadas:');
stories.slice(0, 5).forEach((story, index) => {
  console.log(`${index + 1}. [${story.scope ?? story.category}] ${story.title} — ${story.source}`);
});

if (errors.length) {
  console.error('El feed no supera el control de calidad:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Feed válido para publicación.');
