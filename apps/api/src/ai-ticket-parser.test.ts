import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAlmazaraTicketText } from './ai-ticket-parser.ts';

test('parseAlmazaraTicketText parses standard ticket text', () => {
  const text = `
    COOPERATIVA SAN JUAN S.C.A.
    Pesada Nº: TK-2026-881
    Kilos Neto: 4.250 kg
    Rendimiento Graso: 21,5%
    Acidez: 0,3°
  `;

  const result = parseAlmazaraTicketText(text);

  assert.equal(result.kilograms, '4250');
  assert.equal(result.fatYieldPercent, 21.5);
  assert.equal(result.acidityPercent, 0.3);
  assert.equal(result.ticketNumber, 'TK-2026-881');
  assert.ok(result.cooperativeName?.includes('SAN JUAN'));
  assert.ok(result.confidence >= 0.9);
});

test('parseAlmazaraTicketText parses minimal ticket text', () => {
  const text = 'Entrega 1250 kg en Almazara Sierra Mágina';

  const result = parseAlmazaraTicketText(text);

  assert.equal(result.kilograms, '1250');
  assert.equal(result.fatYieldPercent, undefined);
  assert.equal(result.cooperativeName, 'Sierra Mágina');
});
