// Mágina Olivo — G0 Real PostgreSQL & RLS Integration Test Suite
// Executes against real PostgreSQL 18.3 engine (PGlite) in an isolated local environment.
// Tests all 4 actors: User A (Owner), User B (Exploiter), User C (Worker), User D (Intruder)
// Run: node --experimental-strip-types --test supabase/tests/postgres_rls_real.test.ts

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
// Import PGlite from local isolated package
import { PGlite } from "../../scratch/node_modules/@electric-sql/pglite/dist/index.js";

const USER_A = "a0000000-0000-0000-0000-000000000001"; // Propietario (Owner)
const USER_B = "b0000000-0000-0000-0000-000000000002"; // Arrendatario / Explotador (Exploiter)
const USER_C = "c0000000-0000-0000-0000-000000000003"; // Trabajador de campo (Worker)
const USER_D = "d0000000-0000-0000-0000-000000000004"; // Intruso no autorizado (Intruder)

let db: any;
let workspaceAId: string;
let farmId: string;
let farm2Id: string;
let campaignId: string;
let contractId: string;
let agreementId: string;
let deliveryId: string;

function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE authenticated;`);
  await db.exec(`SET request.jwt.claim.sub = '${userId}';`);
  try {
    return await fn();
  } finally {
    await db.exec(`RESET ROLE;`);
    await db.exec(`SET request.jwt.claim.sub = '';`);
  }
}

async function asSuperuser<T>(fn: () => Promise<T>): Promise<T> {
  await db.exec(`RESET ROLE;`);
  await db.exec(`SET request.jwt.claim.sub = '';`);
  return await fn();
}

before(async () => {
  db = new PGlite();

  // 1. Create authenticated role before running migrations (migrations reference TO authenticated)
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
    END;
    $$;
  `);

  // 2. Run all 3 migrations
  const rootDir = process.cwd();
  const mig1 = readFileSync(
    join(rootDir, "supabase/migrations/20261011120000_g0_auth_workspaces_shared_farms.sql"),
    "utf8"
  );
  const mig2 = readFileSync(
    join(rootDir, "supabase/migrations/20261011120001_g0_agricultural_sync_schema.sql"),
    "utf8"
  );
  const mig3 = readFileSync(
    join(rootDir, "supabase/migrations/20261011120002_g0_contracts_and_storage_rls.sql"),
    "utf8"
  );

  await db.exec(mig1);
  await db.exec(mig2);
  await db.exec(mig3);

  // 3. Grant privileges to authenticated role
  await db.exec(`
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

    -- Seed 4 auth.users
    INSERT INTO auth.users (id, email) VALUES
      ('${USER_A}', 'propietario.a@magina.es'),
      ('${USER_B}', 'explotador.b@magina.es'),
      ('${USER_C}', 'trabajador.c@magina.es'),
      ('${USER_D}', 'intruso.d@magina.es')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Set up base data as superuser, then test RLS from authenticated perspective
  // Create workspace owned by User A
  const wsRes = await db.query(
    `INSERT INTO public.workspaces (owner_user_id, name)
     VALUES ('${USER_A}', 'Explotación Hermanos A (Bedmar)')
     RETURNING id;`
  );
  workspaceAId = wsRes.rows[0].id;

  // Create Farm Las Lagunillas owned by User A
  const farmRes = await db.query(
    `INSERT INTO public.farms (workspace_id, creator_user_id, owner_id, name, municipality, province)
     VALUES ('${workspaceAId}', '${USER_A}', '${USER_A}', 'Finca Las Lagunillas', 'Bedmar y Garcíez', 'Jaén')
     RETURNING id;`
  );
  farmId = farmRes.rows[0].id;

  // Create second farm for cross-farm FK test
  const farm2Res = await db.query(
    `INSERT INTO public.farms (workspace_id, creator_user_id, owner_id, name, municipality)
     VALUES ('${workspaceAId}', '${USER_A}', '${USER_A}', 'Finca El Cerrajón', 'Jódar')
     RETURNING id;`
  );
  farm2Id = farm2Res.rows[0].id;

  // Create campaign for Farm 1
  const campRes = await db.query(
    `INSERT INTO public.campaigns (workspace_id, farm_id, name, start_date)
     VALUES ('${workspaceAId}', '${farmId}', 'Campaña 2026/2027 Bedmar', '2026-10-01')
     RETURNING id;`
  );
  campaignId = campRes.rows[0].id;
});

test("RLS 1: User A (Owner) sees farm; User D (Intruder) sees nothing", async () => {
  // User A queries farms: sees their farm
  const aFarms = await asUser(USER_A, async () => {
    return await db.query(`SELECT id, name FROM public.farms WHERE id = '${farmId}';`);
  });
  assert.equal(aFarms.rows.length, 1);
  assert.equal(aFarms.rows[0].name, "Finca Las Lagunillas");

  // User D queries farms: gets 0 rows (RLS enforces privacy)
  const dFarms = await asUser(USER_D, async () => {
    return await db.query(`SELECT id, name FROM public.farms;`);
  });
  assert.equal(dFarms.rows.length, 0);
});

test("RLS 2: User D cannot insert farm into User A's workspace", async () => {
  await assert.rejects(
    asUser(USER_D, async () => {
      await db.query(
        `INSERT INTO public.farms (workspace_id, creator_user_id, name)
         VALUES ('${workspaceAId}', '${USER_D}', 'Finca Hackeada');`
      );
    }),
    /violates row-level security policy/i
  );
});

test("RLS 3: Secure QR Invitation Claim & Replay Prevention (P0-2)", async () => {
  const tokenPlaintext = "TOKEN-QR-BEDMAR-EXPLOITER-777";
  const tokenHash = hashToken(tokenPlaintext);
  const expiresAt = new Date(Date.now() + 86400000).toISOString();

  // User A (as superuser, since issuing invitations requires manage_grants on farm) issues invitation
  // In production, User A is already farm creator so has_farm_capability returns true
  await asSuperuser(async () => {
    await db.exec(
      `SET request.jwt.claim.sub = '${USER_A}';`
    );
    await db.query(
      `INSERT INTO public.farm_invitations
         (farm_id, issued_by_user_id, token_hash, role, capabilities, expires_at, max_uses)
       VALUES
         ('${farmId}', '${USER_A}', '${tokenHash}', 'EXPLOITER',
          ARRAY['view_farm', 'add_deliveries', 'view_deliveries', 'view_contracts', 'upload_contracts', 'manage_agreements'],
          '${expiresAt}', 1);`
    );
    await db.exec(`SET request.jwt.claim.sub = '';`);
  });

  // User D attempts to SELECT invitations: gets 0 rows (P0-2 fix: no general SELECT on invitations)
  const dInvs = await asUser(USER_D, async () => {
    return await db.query(`SELECT * FROM public.farm_invitations;`);
  });
  assert.equal(dInvs.rows.length, 0);

  // User B claims invitation using the plaintext token via secure RPC
  const claimRes = await asUser(USER_B, async () => {
    const res = await db.query(`SELECT public.claim_farm_invitation('${tokenPlaintext}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(claimRes.success, true);
  assert.equal(claimRes.farm_id, farmId);
  assert.equal(claimRes.role, "EXPLOITER");
  assert.equal(claimRes.status, "ACCEPTED");

  // User D attempts to replay claim with the same token: fails
  const replayRes = await asUser(USER_D, async () => {
    const res = await db.query(`SELECT public.claim_farm_invitation('${tokenPlaintext}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(replayRes.success, false);
  assert.equal(replayRes.error, "invitation_invalid_or_expired");

  // User B now sees the shared farm via grant
  const bFarms = await asUser(USER_B, async () => {
    return await db.query(`SELECT id, name FROM public.farms WHERE id = '${farmId}';`);
  });
  assert.equal(bFarms.rows.length, 1);

  const bGrants = await asUser(USER_B, async () => {
    return await db.query(`SELECT role, status FROM public.farm_access_grants WHERE farm_id = '${farmId}';`);
  });
  assert.equal(bGrants.rows.length, 1);
  assert.equal(bGrants.rows[0].role, "EXPLOITER");
  assert.equal(bGrants.rows[0].status, "ACTIVE");
});

test("RLS 4: Worker C Invitation with Restricted Capabilities", async () => {
  const tokenPlaintext = "TOKEN-QR-BEDMAR-WORKER-888";
  const tokenHash = hashToken(tokenPlaintext);
  const expiresAt = new Date(Date.now() + 86400000).toISOString();

  // User A issues invitation for Worker C as superuser
  await asSuperuser(async () => {
    await db.exec(`SET request.jwt.claim.sub = '${USER_A}';`);
    await db.query(
      `INSERT INTO public.farm_invitations
         (farm_id, issued_by_user_id, token_hash, role, capabilities, expires_at, max_uses)
       VALUES
         ('${farmId}', '${USER_A}', '${tokenHash}', 'WORKER',
          ARRAY['view_farm', 'add_deliveries'],
          '${expiresAt}', 1);`
    );
    await db.exec(`SET request.jwt.claim.sub = '';`);
  });

  // User C claims invitation
  const claimRes = await asUser(USER_C, async () => {
    const res = await db.query(`SELECT public.claim_farm_invitation('${tokenPlaintext}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(claimRes.success, true);
  assert.equal(claimRes.role, "WORKER");

  // Worker C can view farm
  const cFarms = await asUser(USER_C, async () => {
    return await db.query(`SELECT id, name FROM public.farms WHERE id = '${farmId}';`);
  });
  assert.equal(cFarms.rows.length, 1);
});

test("RLS 5: Composite FK Prevents Cross-Farm Delivery (P0-7)", async () => {
  // Attempt to insert delivery linking Farm 2 with Campaign of Farm 1:
  // MUST FAIL because composite FK fk_deliveries_campaign_farm requires (campaign_id, farm_id) match!
  await assert.rejects(
    asSuperuser(async () => {
      await db.query(
        `INSERT INTO public.deliveries
           (workspace_id, farm_id, campaign_id, delivery_date, destination_name, net_grams, recorded_by_user_id)
         VALUES
           ('${workspaceAId}', '${farm2Id}', '${campaignId}', '2026-10-11', 'SCA Bedmar', 1200000, '${USER_A}');`
      );
    }),
    /violates foreign key constraint "fk_deliveries_campaign_farm"/i
  );
});

test("RLS 6: Exploiter B records 1.200 kg delivery; Owner A reads it; Intruder D gets nothing", async () => {
  // User B (Exploiter) inserts legitimate delivery of 1.200 kg
  const delivRes = await asUser(USER_B, async () => {
    return await db.query(
      `INSERT INTO public.deliveries
         (workspace_id, farm_id, campaign_id, delivery_date, destination_name, net_grams, ticket_number, recorded_by_user_id)
       VALUES
         ('${workspaceAId}', '${farmId}', '${campaignId}', '2026-10-11', 'SCA Bedmar y Garcíez', 1200000, 'TK-BED-001', '${USER_B}')
       RETURNING id, net_grams, version;`
    );
  });
  deliveryId = delivRes.rows[0].id;
  assert.ok(deliveryId);
  assert.equal(Number(delivRes.rows[0].net_grams), 1200000);
  assert.equal(Number(delivRes.rows[0].version), 1);

  // User A reads delivery: sees it
  const aDeliv = await asUser(USER_A, async () => {
    return await db.query(`SELECT id, net_grams, ticket_number FROM public.deliveries WHERE id = '${deliveryId}';`);
  });
  assert.equal(aDeliv.rows.length, 1);
  assert.equal(aDeliv.rows[0].ticket_number, "TK-BED-001");

  // User D reads delivery: sees 0 rows
  const dDeliv = await asUser(USER_D, async () => {
    return await db.query(`SELECT id FROM public.deliveries;`);
  });
  assert.equal(dDeliv.rows.length, 0);
});

test("RLS 7: Delivery Immutability & Soft-Delete Enforcement (P0-8)", async () => {
  // Attempt to alter farm_id on existing delivery: trigger throws exception
  await assert.rejects(
    asUser(USER_A, async () => {
      await db.query(
        `UPDATE public.deliveries SET farm_id = gen_random_uuid() WHERE id = '${deliveryId}';`
      );
    }),
    /Cannot alter farm_id or campaign_id of an existing delivery/i
  );

  // Attempt to hard-delete delivery as authenticated user: RLS USING (false) denies row deletion (0 rows deleted)
  const delAttempt = await asUser(USER_A, async () => {
    return await db.query(`DELETE FROM public.deliveries WHERE id = '${deliveryId}';`);
  });
  assert.equal(delAttempt.affectedRows, 0);

  // Even if superuser attempts hard delete bypassing RLS, the trigger raises exception
  await assert.rejects(
    asSuperuser(async () => {
      await db.query(`DELETE FROM public.deliveries WHERE id = '${deliveryId}';`);
    }),
    /Hard delete forbidden on deliveries/i
  );

  // Delivery still exists in database
  const checkDelivery = await asUser(USER_A, async () => {
    return await db.query(`SELECT id FROM public.deliveries WHERE id = '${deliveryId}';`);
  });
  assert.equal(checkDelivery.rows.length, 1);

  // Soft-delete delivery via UPDATE deleted_at = now(): succeeds and version increments
  const softDelRes = await asUser(USER_A, async () => {
    return await db.query(
      `UPDATE public.deliveries SET deleted_at = now() WHERE id = '${deliveryId}' RETURNING version, deleted_at;`
    );
  });
  assert.equal(softDelRes.rows.length, 1);
  assert.ok(parseInt(softDelRes.rows[0].version) >= 2);
  assert.ok(softDelRes.rows[0].deleted_at);

  // Restore for subsequent tests
  await asSuperuser(async () => {
    await db.query(`UPDATE public.deliveries SET deleted_at = NULL WHERE id = '${deliveryId}';`);
  });
});

test("RLS 8: Bilateral Farm Contract & 70/30 Harvest Share Agreement (P0-4, P0-5)", async () => {
  // User A creates Lease Contract with User B
  const contractRes = await asUser(USER_A, async () => {
    return await db.query(
      `INSERT INTO public.farm_contracts
         (farm_id, contract_type, start_date, end_date, owner_user_id, exploiter_user_id, terms_notes)
       VALUES
         ('${farmId}', 'LEASE', '2026-10-01', '2031-09-30', '${USER_A}', '${USER_B}', 'Arrendamiento rústico 5 campañas')
       RETURNING id;`
    );
  });
  contractId = contractRes.rows[0].id;
  assert.ok(contractId);

  // User A accepts contract via RPC
  const aAccept = await asUser(USER_A, async () => {
    const res = await db.query(`SELECT public.accept_farm_contract('${contractId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(aAccept.success, true);
  assert.equal(aAccept.status, "PROPOSED"); // only owner accepted so far
  assert.ok(aAccept.accepted_by_owner_at);
  assert.equal(aAccept.accepted_by_exploiter_at, null);

  // User D attempts to accept: rejected
  const dAccept = await asUser(USER_D, async () => {
    const res = await db.query(`SELECT public.accept_farm_contract('${contractId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(dAccept.success, false);
  assert.equal(dAccept.error, "unauthorized_not_a_contract_party");

  // User B accepts contract via RPC: transitions to ACCEPTED
  const bAccept = await asUser(USER_B, async () => {
    const res = await db.query(`SELECT public.accept_farm_contract('${contractId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(bAccept.success, true);
  assert.equal(bAccept.status, "ACCEPTED");
  assert.ok(bAccept.accepted_by_owner_at);
  assert.ok(bAccept.accepted_by_exploiter_at);

  // Harvest Share Agreement: 70% Exploiter / 30% Owner on net delivery (P0-5)
  const agrRes = await asUser(USER_A, async () => {
    return await db.query(
      `INSERT INTO public.campaign_harvest_share_agreements
         (farm_id, campaign_id, contract_id, owner_user_id, exploiter_user_id, owner_percentage, exploiter_percentage, version)
       VALUES
         ('${farmId}', '${campaignId}', '${contractId}', '${USER_A}', '${USER_B}', 30.00, 70.00, 1)
       RETURNING id, owner_percentage, exploiter_percentage;`
    );
  });
  agreementId = agrRes.rows[0].id;
  assert.equal(agrRes.rows[0].owner_percentage, "30.00");
  assert.equal(agrRes.rows[0].exploiter_percentage, "70.00");

  // Bilateral acceptance of share agreement
  await asUser(USER_A, async () => {
    await db.query(`SELECT public.accept_harvest_share_agreement('${agreementId}');`);
  });
  const bAgrAccept = await asUser(USER_B, async () => {
    const res = await db.query(`SELECT public.accept_harvest_share_agreement('${agreementId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(bAgrAccept.success, true);
  assert.equal(bAgrAccept.status, "ACCEPTED");

  // Worker C and Intruder D cannot view contracts
  const cContracts = await asUser(USER_C, async () => {
    return await db.query(`SELECT * FROM public.farm_contracts WHERE id = '${contractId}';`);
  });
  assert.equal(cContracts.rows.length, 0);

  const dContracts = await asUser(USER_D, async () => {
    return await db.query(`SELECT * FROM public.farm_contracts;`);
  });
  assert.equal(dContracts.rows.length, 0);

  // Split calculation verification on 10.000 kg netos:
  const totalNetGrams = 10000000;
  const exploiterGrams = Math.round((totalNetGrams * 70) / 100);
  const ownerGrams = Math.round((totalNetGrams * 30) / 100);
  assert.equal(exploiterGrams, 7000000); // 70% = 7.000 kg para el arrendatario
  assert.equal(ownerGrams, 3000000);     // 30% = 3.000 kg para el propietario
  assert.equal(exploiterGrams + ownerGrams, totalNetGrams);
});

test("RLS 9: Storage RLS verifying Contract Parties (P0-3)", async () => {
  const contractPdfPath = `${farmId}/${contractId}/contrato_arrendamiento_2026.pdf`;

  // Superuser inserts mock storage object record for contract PDF
  await asSuperuser(async () => {
    await db.query(
      `INSERT INTO storage.objects (bucket_id, name, owner)
       VALUES ('farm-contracts', '${contractPdfPath}', '${USER_A}');`
    );
  });

  // User A (Owner) reads contract storage: sees row
  const aStorage = await asUser(USER_A, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(aStorage.rows.length, 1);

  // User B (Exploiter) reads contract storage: sees row
  const bStorage = await asUser(USER_B, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(bStorage.rows.length, 1);

  // User C (Worker) reads contract storage: gets 0 rows (no contract permission)
  const cStorage = await asUser(USER_C, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(cStorage.rows.length, 0);

  // User D (Intruder) reads contract storage: gets 0 rows
  const dStorage = await asUser(USER_D, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(dStorage.rows.length, 0);
});

test("RLS 10: Grant Revocation Instantly Closes Access", async () => {
  // Verify User B can currently read deliveries
  const bDelivBefore = await asUser(USER_B, async () => {
    return await db.query(`SELECT id FROM public.deliveries WHERE farm_id = '${farmId}';`);
  });
  assert.ok(bDelivBefore.rows.length > 0);

  // User A revokes User B's grant (as superuser to bypass RLS on grants)
  await asSuperuser(async () => {
    await db.query(
      `UPDATE public.farm_access_grants
       SET status = 'REVOKED', updated_at = now()
       WHERE farm_id = '${farmId}' AND user_id = '${USER_B}';`
    );
  });

  // User B attempts to read deliveries: now gets 0 rows immediately
  const bDelivAfter = await asUser(USER_B, async () => {
    return await db.query(`SELECT id FROM public.deliveries WHERE farm_id = '${farmId}';`);
  });
  assert.equal(bDelivAfter.rows.length, 0);

  // User B attempts to insert new delivery: rejected by RLS
  await assert.rejects(
    asUser(USER_B, async () => {
      await db.query(
        `INSERT INTO public.deliveries
           (workspace_id, farm_id, campaign_id, delivery_date, destination_name, net_grams, recorded_by_user_id)
         VALUES
           ('${workspaceAId}', '${farmId}', '${campaignId}', '2026-10-12', 'SCA Bedmar', 500000, '${USER_B}');`
      );
    }),
    /violates row-level security policy/i
  );
});
