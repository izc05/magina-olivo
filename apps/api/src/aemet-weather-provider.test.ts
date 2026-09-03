import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAemetDailyForecast } from './aemet-weather-provider.ts';

test('normalizes AEMET daily municipality forecast for field use', () => {
  const result = parseAemetDailyForecast('23044', [
    {
      elaborado: '2026-09-03T06:00:00',
      nombre: 'Huelma',
      provincia: 'Jaén',
      prediccion: {
        dia: [
          {
            fecha: '2026-09-03',
            probPrecipitacion: [
              { value: 15, periodo: '00-12' },
              { value: 35, periodo: '12-24' },
              { value: 25, periodo: '00-24' },
            ],
            temperatura: { minima: 13, maxima: 28 },
            viento: [
              { velocidad: [5, 10, 15] },
              { velocidad: [20] },
            ],
          },
          {
            fecha: '2026-09-04',
            probPrecipitacion: [
              { value: 40, periodo: '00-12' },
              { value: 60, periodo: '12-24' },
            ],
            temperatura: { minima: '12', maxima: '24' },
            viento: [{ velocidad: ['10', '25'] }],
          },
        ],
      },
    },
  ]);

  assert.equal(result.provider, 'AEMET OpenData');
  assert.equal(result.municipalityCode, '23044');
  assert.equal(result.municipalityName, 'Huelma');
  assert.equal(result.province, 'Jaén');
  assert.equal(result.days.length, 2);
  assert.deepEqual(result.days[0], {
    date: '2026-09-03',
    precipitationProbabilityPercent: 25,
    temperatureMinC: 13,
    temperatureMaxC: 28,
    windMaxKmh: 20,
  });
  assert.equal(result.days[1]?.precipitationProbabilityPercent, 60);
  assert.equal(result.days[1]?.windMaxKmh, 25);
});

test('keeps missing AEMET values explicit instead of inventing zeroes', () => {
  const result = parseAemetDailyForecast('23044', [
    {
      nombre: 'Huelma',
      prediccion: {
        dia: [{ fecha: '2026-09-05', probPrecipitacion: [], viento: [] }],
      },
    },
  ]);

  assert.deepEqual(result.days[0], {
    date: '2026-09-05',
    precipitationProbabilityPercent: null,
    temperatureMinC: null,
    temperatureMaxC: null,
    windMaxKmh: null,
  });
});
