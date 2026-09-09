import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppShareUrl } from './share-helpers.ts';

test('buildWhatsAppShareUrl generates valid WhatsApp URL with maps link', () => {
  const url = buildWhatsAppShareUrl({
    plotName: 'Los Llanos',
    farmName: 'Finca San Juan',
    latitude: 37.74,
    longitude: -3.52,
    taskNotes: 'Comenzar recolección por la loma alta',
  });

  assert.ok(url.startsWith('https://wa.me/?text='));
  assert.ok(url.includes(encodeURIComponent('Los Llanos')));
  assert.ok(url.includes(encodeURIComponent('https://www.google.com/maps/dir/?api=1&destination=37.74,-3.52')));
});
