import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_MARKET_WEEKLY_CSV_URL,
  DEFAULT_MARKET_WEEKLY_JSON_URL,
  assertTrustedMarketUrl,
} from './market-source.ts';

test('Observatorio default resources use trusted Junta HTTPS hosts', () => {
  assert.equal(assertTrustedMarketUrl(DEFAULT_MARKET_WEEKLY_CSV_URL).protocol, 'https:');
  assert.equal(assertTrustedMarketUrl(DEFAULT_MARKET_WEEKLY_JSON_URL).protocol, 'https:');
  assert.match(new URL(DEFAULT_MARKET_WEEKLY_CSV_URL).hostname, /juntadeandalucia\.es$/);
  assert.match(new URL(DEFAULT_MARKET_WEEKLY_JSON_URL).hostname, /juntadeandalucia\.es$/);
});

test('Observatorio inspector rejects non-Junta or non-HTTPS URLs', () => {
  assert.throws(() => assertTrustedMarketUrl('http://ws142.juntadeandalucia.es/file.csv'), /MARKET_SOURCE_URL_NOT_TRUSTED/);
  assert.throws(() => assertTrustedMarketUrl('https://example.com/file.csv'), /MARKET_SOURCE_URL_NOT_TRUSTED/);
  assert.throws(() => assertTrustedMarketUrl('https://juntadeandalucia.es.example.com/file.csv'), /MARKET_SOURCE_URL_NOT_TRUSTED/);
});
