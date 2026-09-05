import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSigpacRecintoByIdUrl,
  buildSigpacRecintosUrl,
  normalizeSigpacFeature,
  validateSigpacBbox,
  validateSigpacFeatureId,
} from './sigpac-client.ts';

test('SIGPAC adapter builds a bounded official OGC API query', () => {
  const url = new URL(buildSigpacRecintosUrl({
    minLon: -3.51,
    minLat: 37.70,
    maxLon: -3.50,
    maxLat: 37.71,
  }));
  assert.equal(url.origin, 'https://sigpac-hubcloud.es');
  assert.equal(url.pathname, '/ogcapi/collections/recintos/items');
  assert.equal(url.searchParams.get('f'), 'json');
  assert.equal(url.searchParams.get('bbox'), '-3.51,37.7,-3.5,37.71');
  assert.equal(url.searchParams.get('limit'), '100');
});

test('SIGPAC adapter builds verified item lookup only from a numeric feature id', () => {
  assert.equal(validateSigpacFeatureId('233788127'), true);
  assert.equal(validateSigpacFeatureId('../items'), false);
  assert.equal(validateSigpacFeatureId('123?f=json'), false);

  const url = new URL(buildSigpacRecintoByIdUrl('233788127'));
  assert.equal(url.origin, 'https://sigpac-hubcloud.es');
  assert.equal(url.pathname, '/ogcapi/collections/recintos/items/233788127');
  assert.equal(url.searchParams.get('f'), 'json');
});

test('SIGPAC adapter rejects oversized or inverted bbox queries', () => {
  assert.match(validateSigpacBbox({ minLon: -3.5, minLat: 37.7, maxLon: -3.4, maxLat: 37.71 }) ?? '', /maximum span/);
  assert.match(validateSigpacBbox({ minLon: -3.4, minLat: 37.7, maxLon: -3.5, maxLat: 37.71 }) ?? '', /inverted/);
});

test('SIGPAC feature is normalized without trusting unknown properties', () => {
  const feature = normalizeSigpacFeature({
    id: 123,
    properties: {
      provincia: 23,
      municipio: 99,
      poligono: 12,
      parcela: 345,
      recinto: 2,
      pendiente_media: 18.5,
      altitud: 740,
      dn_surface: 11234.5,
      uso_sigpac: 'OV',
      unexpected_private_field: 'ignored',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-3.5000, 37.7000],
        [-3.4990, 37.7000],
        [-3.4990, 37.7010],
        [-3.5000, 37.7000],
      ]],
    },
  });

  assert.ok(feature);
  assert.equal(feature.id, '123');
  assert.equal(feature.provincia, 23);
  assert.equal(feature.poligono, 12);
  assert.equal(feature.parcela, 345);
  assert.equal(feature.recinto, 2);
  assert.equal(feature.surfaceM2, 11234.5);
  assert.equal(feature.usoSigpac, 'OV');
  assert.equal('unexpected_private_field' in feature, false);
});
