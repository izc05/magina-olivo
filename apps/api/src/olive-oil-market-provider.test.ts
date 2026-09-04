import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertTrustedOliveOilMarketUrl,
  parseOliveOilMarketHtml,
} from './olive-oil-market-provider.ts';

const fixture = `
<table>
  <tr>
    <th>Producto</th><th>Tipo</th><th>Subtipo</th>
    <th>Semana 32:<br>(3/8/26 - 9/8/26)</th>
    <th>Semana 33:<br>(10/8/26 - 16/8/26)</th>
    <th>Semana 34:<br>(17/8/26 - 23/8/26)</th>
    <th>Semana 35:<br>(24/8/26 - 30/8/26)</th>
  </tr>
  <tr><td>ACEITES DE OLIVA</td><td>VÍRGENES</td><td>LAMPANTE (1 g)</td><td>3,01</td><td>3,04</td><td>3,09</td><td>3,14</td></tr>
  <tr><td>VIRGEN</td><td>3,15</td><td>3,28</td><td>3,25</td><td>3,29</td></tr>
  <tr><td>VIRGEN-EXTRA</td><td>3,63</td><td>3,42</td><td>3,48</td><td>3,61</td></tr>
</table>`;

test('parses synchronized weekly extra, virgin and lampante series from the official table shape', () => {
  const result = parseOliveOilMarketHtml(fixture, 'https://www.juntadeandalucia.es/example');

  assert.equal(result.position, 'Almazara o Bodega');
  assert.equal(result.scope, 'Andalucía');
  assert.equal(result.unit, '€/kg');
  assert.deepEqual(result.weeks.map((item) => item.week), [32, 33, 34, 35]);
  assert.equal(result.weeks[3]?.endDate, '2026-08-30');
  assert.deepEqual(result.series.find((item) => item.key === 'extra')?.values, [3.63, 3.42, 3.48, 3.61]);
  assert.deepEqual(result.series.find((item) => item.key === 'virgin')?.values, [3.15, 3.28, 3.25, 3.29]);
  assert.deepEqual(result.series.find((item) => item.key === 'lampante')?.values, [3.01, 3.04, 3.09, 3.14]);
});

test('rejects incomplete tables instead of inventing missing market categories', () => {
  const incomplete = fixture.replace(/<tr><td>VIRGEN-EXTRA[\s\S]*?<\/tr>/, '');
  assert.throws(() => parseOliveOilMarketHtml(incomplete), /SERIES_EXTRA_NOT_FOUND/);
});

test('market reader accepts only trusted Junta HTTPS hosts', () => {
  assert.equal(assertTrustedOliveOilMarketUrl('https://www.juntadeandalucia.es/path').hostname, 'www.juntadeandalucia.es');
  assert.throws(() => assertTrustedOliveOilMarketUrl('http://www.juntadeandalucia.es/path'), /NOT_TRUSTED/);
  assert.throws(() => assertTrustedOliveOilMarketUrl('https://example.com/path'), /NOT_TRUSTED/);
});
