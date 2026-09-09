import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./plot-timeline-routes.ts', import.meta.url), 'utf8');

test('plot timeline preserves the main agricultural value of each activity', () => {
  for (const field of ['affected_area_ha', 'product_name', 'quantity', 'quantity_unit']) {
    assert.match(source, new RegExp(field));
  }
  for (const field of ['affectedAreaHa', 'productName', 'quantity', 'quantityUnit']) {
    assert.match(source, new RegExp(field));
  }
});
