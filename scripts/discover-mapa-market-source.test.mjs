import assert from 'node:assert/strict';
import test from 'node:test';

import { latestMapaOliveBulletin, parseMapaOliveBulletins } from './discover-mapa-market-source.mjs';

const BASE = 'https://www.mapa.gob.es/es/agricultura/temas/producciones-agricolas/aceite-oliva-y-aceituna-mesa/evolucion_precios_ao_vegetales';

const HTML = `
  <main>
    <a href="/dam/mapa/precios/29-2026-boletin-semanal-precios-aceite-de-oliva.pdf">29 2026 Boletín semanal precios aceite de oliva 2025-26</a>
    <a href="/dam/mapa/precios/30-2026-boletin-semanal-precios-aceite-de-oliva.pdf"><span>30 2026</span> Boletín semanal precios aceite de oliva 2025-26</a>
    <a href="/dam/mapa/precios/40-2025-boletin-semanal-precios-aceite-de-oliva.pdf">40 2025 Boletín semanal precios aceite de oliva 2025-26</a>
    <a href="https://example.com/31-2026-boletin-semanal-precios-aceite-de-oliva.pdf">31 2026 Boletín semanal precios aceite de oliva 2025-26</a>
    <a href="/dam/mapa/otro-documento.pdf">Documento no relacionado</a>
  </main>
`;

test('ordena los boletines MAPA por año y semana y descarta dominios externos', () => {
  const bulletins = parseMapaOliveBulletins(HTML, BASE);
  assert.deepEqual(bulletins.map(({ week, year }) => [week, year]), [
    [30, 2026],
    [29, 2026],
    [40, 2025],
  ]);
});

test('selecciona el boletín semanal más reciente', () => {
  const latest = latestMapaOliveBulletin(HTML, BASE);
  assert.ok(latest);
  assert.equal(latest.week, 30);
  assert.equal(latest.year, 2026);
  assert.equal(latest.url, 'https://www.mapa.gob.es/dam/mapa/precios/30-2026-boletin-semanal-precios-aceite-de-oliva.pdf');
});
