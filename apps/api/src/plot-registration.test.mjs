import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

// No real database or external requests are used in these route tests.
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
const { getPool, closeDatabase } = await import('./db.ts');
const { auth } = await import('./auth.ts');
const { registerPlotRoutes } = await import('./plot-routes.ts');

test('parcel registration authorizes before lookup and never inserts after a failed verification', async (t) => {
  const app = Fastify();
  registerPlotRoutes(app);
  let role = 'owner';
  let signedIn = true;
  let inserts = [];
  let lookups = 0;
  t.mock.method(auth.api, 'getSession', async () => signedIn ? { user: { id: 'test-owner' } } : null);
  t.mock.method(getPool(), 'query', async (sql, values) => {
    if (sql.includes('join holding_members')) return { rows: role ? [{ holding_id: 'test-holding', role }] : [] };
    if (sql.includes('insert into plots')) {
      inserts.push(values);
      return { rows: [{ id: values[0], name: values[3], latitude: values[7], longitude: values[8], boundary_source: values[14] }] };
    }
    throw new Error('Unexpected SQL');
  });
  t.mock.method(globalThis, 'fetch', async () => { lookups++; return new Response('Unavailable', { status: 503 }); });
  const send = (payload) => app.inject({ method: 'POST', url: '/api/v1/farms/test-farm/plots', payload });
  const cadastral = { name: 'Test parcel', cadastralReference: '03065A04600062', verifyCatastro: true };
  try {
    signedIn = false;
    assert.equal((await send(cadastral)).statusCode, 401);
    signedIn = true; role = 'viewer';
    assert.equal((await send(cadastral)).statusCode, 403);
    role = null;
    assert.equal((await send(cadastral)).statusCode, 404);
    assert.equal(lookups, 0);
    role = 'owner';
    assert.equal((await send(cadastral)).statusCode, 502);
    assert.equal(inserts.length, 0);
    assert.equal((await send({ name: 'Test parcel', verifyCatastro: true })).statusCode, 400);
    assert.equal(inserts.length, 0);
    assert.equal((await send({ name: 'GPS parcel', latitude: 37.7 })).statusCode, 400);
    const response = await send({ name: 'GPS parcel', latitude: 37.7, longitude: -3.5 });
    assert.equal(response.statusCode, 201);
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0][1], 'test-holding');
    assert.equal(inserts[0][2], 'test-farm');
    assert.equal(response.json().boundarySource, null);
    assert.equal(response.json().latitude, 37.7);
    t.mock.method(globalThis, 'fetch', async () => new Response('<FeatureCollection><member><CadastralParcel><nationalCadastralReference>03065A04600062</nationalCadastralReference><posList>0 0 111.319490793 0 111.319490793 111.319490799 0 111.319490799 0 0</posList></CadastralParcel></member></FeatureCollection>'));
    const verified = await send(cadastral);
    assert.equal(verified.statusCode, 201);
    assert.equal(inserts.length, 2);
    assert.equal(inserts[1][14], 'catastro');
    assert.equal(inserts[1][15], cadastral.cadastralReference);
    assert.equal(JSON.parse(inserts[1][12]).type, 'Polygon');
    assert.ok(inserts[1][13] > 0);
    assert.ok(inserts[1][16] instanceof Date);
  } finally { await app.close(); t.mock.restoreAll(); await closeDatabase(); }
});
