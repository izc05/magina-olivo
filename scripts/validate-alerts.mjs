import { readFile } from 'node:fs/promises';

const path = new URL('../public/data/alerts.json', import.meta.url);
const payload = JSON.parse(await readFile(path, 'utf8'));
const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];

if (!alerts.length) throw new Error('El feed de alertas está vacío.');
if ((payload.healthySourceCount ?? payload.sourceCount ?? 0) < 1) throw new Error('No hay ninguna fuente de alertas operativa.');

const ids = new Set();
const urls = new Set();
for (const alert of alerts) {
  for (const field of ['id', 'severity', 'category', 'scope', 'title', 'source', 'url', 'publishedAt']) {
    if (!alert[field]) throw new Error(`Alerta sin campo obligatorio: ${field}`);
  }
  if (!['critical', 'warning', 'info'].includes(alert.severity)) throw new Error(`Severidad no válida: ${alert.severity}`);
  if (!alert.official) throw new Error(`Alerta no oficial detectada: ${alert.title}`);
  if (!URL.canParse(alert.url)) throw new Error(`URL no válida: ${alert.url}`);
  if (Number.isNaN(new Date(alert.publishedAt).getTime())) throw new Error(`Fecha no válida: ${alert.publishedAt}`);
  if (ids.has(alert.id)) throw new Error(`ID duplicado: ${alert.id}`);
  if (urls.has(alert.url)) throw new Error(`URL duplicada: ${alert.url}`);
  ids.add(alert.id);
  urls.add(alert.url);
}

console.log(`Control de alertas: ${alerts.length} avisos · ${(payload.healthySourceCount ?? 0)}/${(payload.sourceCount ?? 0)} fuentes operativas.`);
alerts.slice(0, 5).forEach((alert, index) => console.log(`${index + 1}. [${alert.severity}] [${alert.scope}] ${alert.title} — ${alert.source}`));
console.log('Feed de alertas válido para publicación.');
