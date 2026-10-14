// Disposable PostgreSQL only. Pass the existing #743 checkout as the sole argument.
// These assertions confirm observed gaps; they are NOT a passing security gate.
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(process.argv[2]);
const { PGlite } = await import(pathToFileURL(join(root, 'supabase/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
const read = path => readFileSync(join(root, path), 'utf8');
try {
  await db.exec(read('supabase/tests/fixtures/mock_supabase_environment.sql'));
  await db.exec(`INSERT INTO storage.buckets(id,name,public) VALUES ('farm-contracts','farm-contracts',true),('farm-attachments','farm-attachments',true);
    CREATE POLICY legacy_public_read ON storage.objects FOR SELECT TO authenticated USING (true);`);
  for (const name of ['20261011120000_g0_auth_workspaces_shared_farms.sql','20261011120001_g0_agricultural_sync_schema.sql','20261011120002_g0_contracts_and_storage_rls.sql'])
    await db.exec(read(`supabase/migrations/${name}`));
  const buckets = await db.query(`SELECT id,public FROM storage.buckets ORDER BY id`);
  assert.equal(buckets.rows.filter(x => x.public).length, 2);
  console.log('REPRODUCED: both pre-existing public buckets remain public', JSON.stringify(buckets.rows));
  await db.exec(`GRANT USAGE ON SCHEMA public,auth,storage TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public,storage TO authenticated;
    INSERT INTO auth.users(id,email) VALUES ('a0000000-0000-0000-0000-000000000001','owner@example.test'),('b0000000-0000-0000-0000-000000000002','delegate@example.test'),('d0000000-0000-0000-0000-000000000004','intruder@example.test');
    INSERT INTO storage.objects(bucket_id,name) VALUES ('farm-contracts','a0000000-0000-0000-0000-000000000099/private.pdf');
    SET ROLE authenticated; SET request.jwt.claim.sub='d0000000-0000-0000-0000-000000000004';`);
  const objects = await db.query(`SELECT name FROM storage.objects`);
  assert.equal(objects.rows.length,1);
  console.log('REPRODUCED: uninvited authenticated identity reads contract object through surviving permissive policy');
  await db.exec(`RESET ROLE; SET request.jwt.claim.sub='';`);
  const ws = (await db.query(`INSERT INTO public.workspaces(owner_user_id,name) VALUES ('a0000000-0000-0000-0000-000000000001','Synthetic') RETURNING id`)).rows[0].id;
  const farm = (await db.query(`INSERT INTO public.farms(workspace_id,creator_user_id,owner_id,name) VALUES ('${ws}','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Synthetic') RETURNING id`)).rows[0].id;
  const parcel = (await db.query(`INSERT INTO public.parcels(workspace_id,display_name) VALUES ('${ws}','Synthetic') RETURNING id`)).rows[0].id;
  await db.exec(`INSERT INTO public.farm_parcel_memberships(workspace_id,farm_id,parcel_id) VALUES ('${ws}','${farm}','${parcel}');
    INSERT INTO public.farm_access_grants(farm_id,user_id,granted_by_user_id,role,capabilities) VALUES ('${farm}','b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','WORKER',ARRAY['view_farm']);
    SET ROLE authenticated; SET request.jwt.claim.sub='b0000000-0000-0000-0000-000000000002';`);
  const visibleFarm = (await db.query(`SELECT id FROM public.farms WHERE id='${farm}'`)).rows.length;
  const visibleMembership = (await db.query(`SELECT id FROM public.farm_parcel_memberships WHERE farm_id='${farm}'`)).rows.length;
  const visibleParcel = (await db.query(`SELECT id FROM public.parcels WHERE id='${parcel}'`)).rows.length;
  assert.equal(visibleFarm,1); assert.equal(visibleMembership,1); assert.equal(visibleParcel,0);
  console.log('REPRODUCED: delegated view_farm sees farm/membership but cannot read linked parcel', JSON.stringify({visibleFarm,visibleMembership,visibleParcel}));
} finally { await db.close(); }
