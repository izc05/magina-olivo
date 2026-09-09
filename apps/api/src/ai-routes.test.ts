import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNaturalLanguageIntent } from './ai-parser.ts';

test('parseNaturalLanguageIntent detects olive delivery with kilos and matching plot', () => {
  const plots = [
    { id: 'plot-1', name: 'El Cerrillo', farmId: 'farm-1', areaHa: '2.5' },
    { id: 'plot-2', name: 'Los Llanos', farmId: 'farm-1', areaHa: '1.8' },
  ];

  const result = parseNaturalLanguageIntent('Hoy hemos entregado 3250 kg de aceituna en la cooperativa San Sebastian de la parcela El Cerrillo', plots);
  assert.equal(result.confidence >= 0.8, true);
  assert.equal(result.draft.kind, 'delivery');
  if (result.draft.kind === 'delivery') {
    assert.equal(result.draft.kilograms, '3250');
    assert.equal(result.draft.plotId, 'plot-1');
    assert.equal(result.draft.plotName, 'El Cerrillo');
    assert.match(result.draft.customDestination ?? '', /San Sebastian/i);
  }
});

test('parseNaturalLanguageIntent detects treatment labor with copper', () => {
  const plots = [
    { id: 'plot-1', name: 'La Hoya', farmId: 'farm-1', areaHa: '3.0' },
  ];

  const result = parseNaturalLanguageIntent('Tratamiento con cobre 5 kilos en La Hoya por presencia de repilo', plots);
  assert.equal(result.draft.kind, 'activity');
  if (result.draft.kind === 'activity') {
    assert.equal(result.draft.activityType, 'treatment');
    assert.equal(result.draft.productName, 'Cobre');
    assert.equal(result.draft.quantity, 5);
    assert.equal(result.draft.plotId, 'plot-1');
  }
});

test('parseNaturalLanguageIntent detects irrigation activity', () => {
  const result = parseNaturalLanguageIntent('Riego de 25 m3 por goteo');
  assert.equal(result.draft.kind, 'activity');
  if (result.draft.kind === 'activity') {
    assert.equal(result.draft.activityType, 'irrigation');
    assert.equal(result.draft.quantity, 25);
    assert.equal(result.draft.quantityUnit, 'm³');
  }
});
