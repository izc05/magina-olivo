import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = name => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
const hardening = sql('20261016041222_g0_legacy_storage_parcel_hardening.sql');
async function fixture() {
  const db = new PGlite();
  await db.exec(readFileSync(new URL('./fixtures/mock_supabase_environment.sql', import.meta.url), 'utf8'));
  for (const name of ['20261011120000_g0_auth_workspaces_shared_farms.sql', '20261011120001_g0_agricultural_sync_schema.sql', '20261011120002_g0_contracts_and_storage_rls.sql']) await db.exec(sql(name));
  return db;
}

test('inherited agricultural buckets become private without changing other buckets or objects', async () => {
  const db = await fixture();
  try {
    await db.exec(`UPDATE storage.buckets SET public=true; INSERT INTO storage.buckets(id,name,public) VALUES('avatars','avatars',true); INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('farm-contracts','preserve.pdf','{"fixture":true}');`);
    await db.exec(hardening);
    const buckets = (await db.query('SELECT id,public FROM storage.buckets ORDER BY id')).rows;
    assert.deepEqual(buckets, [{id:'avatars',public:true},{id:'farm-attachments',public:false},{id:'farm-contracts',public:false}]);
    assert.deepEqual((await db.query('SELECT name,metadata FROM storage.objects')).rows, [{name:'preserve.pdf',metadata:{fixture:true}}]);
  } finally { await db.close(); }
});

for (const [table, name] of [['storage.objects','legacy_public_read'],['public.parcels','legacy_parcel_read']]) {
  test(`unknown permissive policy on ${table} blocks migration without dropping policies`, async () => {
    const db = await fixture();
    try {
      await db.exec(`CREATE POLICY ${name} ON ${table} FOR SELECT USING(true); UPDATE storage.buckets SET public=true;`);
      await assert.rejects(db.exec(`BEGIN; ${hardening}; COMMIT;`), /Unknown.*polic.*review/i);
      await db.exec('ROLLBACK;');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM pg_policies WHERE policyname=$1',[name])).rows[0].n, 1);
      assert.equal((await db.query('SELECT bool_and(public) AS preserved FROM storage.buckets')).rows[0].preserved, true);
    } finally { await db.close(); }
  });
}

test('delegated parcel read is farm-scoped, read-only and revoked immediately', async () => {
  const db = await fixture();
  const owner='a0000000-0000-0000-0000-000000000001', delegate='b0000000-0000-0000-0000-000000000002';
  try {
    await db.exec(hardening);
    await db.exec(`INSERT INTO auth.users(id) VALUES('${owner}'),('${delegate}'); GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated; GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public,auth TO authenticated;`);
    const workspace=(await db.query(`INSERT INTO public.workspaces(owner_user_id,name) VALUES('${owner}','fixture') RETURNING id`)).rows[0].id;
    const farm=(await db.query(`INSERT INTO public.farms(workspace_id,creator_user_id,owner_id,name) VALUES('${workspace}','${owner}','${owner}','shared') RETURNING id`)).rows[0].id;
    const parcels=(await db.query(`INSERT INTO public.parcels(workspace_id,display_name) VALUES('${workspace}','shared'),('${workspace}','private') RETURNING id,display_name`)).rows;
    await db.exec(`INSERT INTO public.farm_parcel_memberships(workspace_id,farm_id,parcel_id) VALUES('${workspace}','${farm}','${parcels[0].id}'); INSERT INTO public.farm_access_grants(farm_id,user_id,granted_by_user_id,role,capabilities) VALUES('${farm}','${delegate}','${owner}','WORKER',ARRAY['view_farm']);`);
    async function read() {
      await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${delegate}';`);
      try { return (await db.query('SELECT display_name FROM public.parcels')).rows; }
      finally { await db.exec('RESET ROLE;'); }
    }
    assert.deepEqual(await read(), [{display_name:'shared'}]);
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${delegate}';`);
    assert.equal((await db.query(`UPDATE public.parcels SET display_name='illegal' RETURNING id`)).rows.length,0);
    assert.equal((await db.query('DELETE FROM public.parcels RETURNING id')).rows.length,0);
    await db.exec('RESET ROLE;');
    for (const change of ["valid_from=now()+interval '1 day'", "valid_from=now()-interval '1 day',valid_until=now()-interval '1 hour'", 'valid_until=NULL,deleted_at=now()']) {
      await db.exec(`UPDATE public.farm_parcel_memberships SET ${change}`);
      assert.deepEqual(await read(),[]);
    }
    await db.exec(`UPDATE public.farm_parcel_memberships SET deleted_at=NULL,valid_from=now()-interval '1 day',valid_until=NULL; UPDATE public.farm_access_grants SET status='REVOKED'`);
    assert.deepEqual(await read(),[]);
  } finally { await db.close(); }
});
