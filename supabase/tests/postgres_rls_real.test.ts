// Mágina Olivo — G0 Real PostgreSQL & RLS Integration Test Suite
// Executes against real PostgreSQL 18.3 engine (PGlite) in an isolated local environment.
// Tests all 4 actors: User A (Owner), User B (Exploiter), User C (Worker), User D (Intruder)
// Run: node --experimental-strip-types --test supabase/tests/postgres_rls_real.test.ts

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { pathToFileURL } from "node:url";

// Dynamically resolve PGlite from local package, supabase/node_modules, or scratch/node_modules
let PGlite: any;
const candidatePaths = [
  "@electric-sql/pglite",
  join(process.cwd(), "supabase/node_modules/@electric-sql/pglite/dist/index.js"),
  join(process.cwd(), "scratch/node_modules/@electric-sql/pglite/dist/index.js"),
  join(process.cwd(), "node_modules/@electric-sql/pglite/dist/index.js"),
  "../../scratch/node_modules/@electric-sql/pglite/dist/index.js"
];

for (const p of candidatePaths) {
  try {
    const importTarget = p.startsWith("@") || p.startsWith(".") ? p : pathToFileURL(p).href;
    const mod = await import(importTarget);
    PGlite = mod.PGlite;
    if (PGlite) break;
  } catch {
    // continue
  }
}

if (!PGlite) {
  throw new Error(
    "Could not resolve @electric-sql/pglite. Please run 'npm install --prefix supabase' or ensure package is in scratch/node_modules."
  );
}

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
  const rootDir = process.cwd();

  // 1. Run mock environment fixture (emulating native Supabase auth and storage platform objects)
  const mockEnv = readFileSync(
    join(rootDir, "supabase/tests/fixtures/mock_supabase_environment.sql"),
    "utf8"
  );
  await db.exec(mockEnv);

  // 2. Run pure production migrations in order
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
  const aFarms = await asUser(USER_A, async () => {
    return await db.query(`SELECT id, name FROM public.farms WHERE id = '${farmId}';`);
  });
  assert.equal(aFarms.rows.length, 1);
  assert.equal(aFarms.rows[0].name, "Finca Las Lagunillas");

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

  await asSuperuser(async () => {
    await db.exec(`SET request.jwt.claim.sub = '${USER_A}';`);
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

  const dInvs = await asUser(USER_D, async () => {
    return await db.query(`SELECT * FROM public.farm_invitations;`);
  });
  assert.equal(dInvs.rows.length, 0);

  const claimRes = await asUser(USER_B, async () => {
    const res = await db.query(`SELECT public.claim_farm_invitation('${tokenPlaintext}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(claimRes.success, true);
  assert.equal(claimRes.farm_id, farmId);
  assert.equal(claimRes.role, "EXPLOITER");
  assert.equal(claimRes.status, "ACCEPTED");

  const replayRes = await asUser(USER_D, async () => {
    const res = await db.query(`SELECT public.claim_farm_invitation('${tokenPlaintext}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(replayRes.success, false);
  assert.equal(replayRes.error, "invitation_invalid_or_expired");

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

  const claimRes = await asUser(USER_C, async () => {
    const res = await db.query(`SELECT public.claim_farm_invitation('${tokenPlaintext}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(claimRes.success, true);
  assert.equal(claimRes.role, "WORKER");

  const cFarms = await asUser(USER_C, async () => {
    return await db.query(`SELECT id, name FROM public.farms WHERE id = '${farmId}';`);
  });
  assert.equal(cFarms.rows.length, 1);
});

test("RLS 5: Composite FK Prevents Cross-Farm Delivery (P0-7)", async () => {
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

  const aDeliv = await asUser(USER_A, async () => {
    return await db.query(`SELECT id, net_grams, ticket_number FROM public.deliveries WHERE id = '${deliveryId}';`);
  });
  assert.equal(aDeliv.rows.length, 1);
  assert.equal(aDeliv.rows[0].ticket_number, "TK-BED-001");

  const dDeliv = await asUser(USER_D, async () => {
    return await db.query(`SELECT id FROM public.deliveries;`);
  });
  assert.equal(dDeliv.rows.length, 0);
});

test("RLS 7: Delivery Immutability & Soft-Delete Enforcement (P0-8)", async () => {
  await assert.rejects(
    asUser(USER_A, async () => {
      await db.query(
        `UPDATE public.deliveries SET farm_id = gen_random_uuid() WHERE id = '${deliveryId}';`
      );
    }),
    /Cannot alter farm_id or campaign_id of an existing delivery/i
  );

  const delAttempt = await asUser(USER_A, async () => {
    return await db.query(`DELETE FROM public.deliveries WHERE id = '${deliveryId}';`);
  });
  assert.equal(delAttempt.affectedRows, 0);

  await assert.rejects(
    asSuperuser(async () => {
      await db.query(`DELETE FROM public.deliveries WHERE id = '${deliveryId}';`);
    }),
    /Hard delete forbidden on deliveries/i
  );

  const checkDelivery = await asUser(USER_A, async () => {
    return await db.query(`SELECT id FROM public.deliveries WHERE id = '${deliveryId}';`);
  });
  assert.equal(checkDelivery.rows.length, 1);

  const softDelRes = await asUser(USER_A, async () => {
    return await db.query(
      `UPDATE public.deliveries SET deleted_at = now() WHERE id = '${deliveryId}' RETURNING version, deleted_at;`
    );
  });
  assert.equal(softDelRes.rows.length, 1);
  assert.ok(parseInt(softDelRes.rows[0].version) >= 2);
  assert.ok(softDelRes.rows[0].deleted_at);

  await asSuperuser(async () => {
    await db.query(`UPDATE public.deliveries SET deleted_at = NULL WHERE id = '${deliveryId}';`);
  });
});

test("RLS 8: Bilateral Farm Contract & 70/30 Harvest Share Agreement (P0-4, P0-5)", async () => {
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

  const aAccept = await asUser(USER_A, async () => {
    const res = await db.query(`SELECT public.accept_farm_contract('${contractId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(aAccept.success, true);
  assert.equal(aAccept.status, "PROPOSED");
  assert.ok(aAccept.accepted_by_owner_at);
  assert.equal(aAccept.accepted_by_exploiter_at, null);

  const dAccept = await asUser(USER_D, async () => {
    const res = await db.query(`SELECT public.accept_farm_contract('${contractId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(dAccept.success, false);
  assert.equal(dAccept.error, "unauthorized_not_a_contract_party");

  const bAccept = await asUser(USER_B, async () => {
    const res = await db.query(`SELECT public.accept_farm_contract('${contractId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(bAccept.success, true);
  assert.equal(bAccept.status, "ACCEPTED");
  assert.ok(bAccept.accepted_by_owner_at);
  assert.ok(bAccept.accepted_by_exploiter_at);

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

  await asUser(USER_A, async () => {
    await db.query(`SELECT public.accept_harvest_share_agreement('${agreementId}');`);
  });
  const bAgrAccept = await asUser(USER_B, async () => {
    const res = await db.query(`SELECT public.accept_harvest_share_agreement('${agreementId}') AS result;`);
    return res.rows[0].result;
  });
  assert.equal(bAgrAccept.success, true);
  assert.equal(bAgrAccept.status, "ACCEPTED");

  const cContracts = await asUser(USER_C, async () => {
    return await db.query(`SELECT * FROM public.farm_contracts WHERE id = '${contractId}';`);
  });
  assert.equal(cContracts.rows.length, 0);

  const dContracts = await asUser(USER_D, async () => {
    return await db.query(`SELECT * FROM public.farm_contracts;`);
  });
  assert.equal(dContracts.rows.length, 0);

  const totalNetGrams = 10000000;
  const exploiterGrams = Math.round((totalNetGrams * 70) / 100);
  const ownerGrams = Math.round((totalNetGrams * 30) / 100);
  assert.equal(exploiterGrams, 7000000);
  assert.equal(ownerGrams, 3000000);
  assert.equal(exploiterGrams + ownerGrams, totalNetGrams);
});

test("RLS 9: Direct Tampering of Contract Acceptance Integrity is Blocked by Triggers", async () => {
  // Create a proposed contract
  const newContractRes = await asUser(USER_A, async () => {
    return await db.query(
      `INSERT INTO public.farm_contracts
         (farm_id, contract_type, start_date, end_date, owner_user_id, exploiter_user_id)
       VALUES
         ('${farmId}', 'SHARECROPPING', '2026-10-01', '2027-09-30', '${USER_A}', '${USER_B}')
       RETURNING id;`
    );
  });
  const testContractId = newContractRes.rows[0].id;

  // Owner A attempts to directly forge accepted_by_exploiter_at on contract: BLOCKED by trigger
  await assert.rejects(
    asUser(USER_A, async () => {
      await db.query(
        `UPDATE public.farm_contracts
         SET accepted_by_exploiter_at = now()
         WHERE id = '${testContractId}';`
      );
    }),
    /Only the exploiter can accept for the exploiter/i
  );

  // User A attempts to forge status to ACCEPTED without exploiter's acceptance: BLOCKED
  await assert.rejects(
    asUser(USER_A, async () => {
      await db.query(
        `UPDATE public.farm_contracts
         SET status = 'ACCEPTED'
         WHERE id = '${testContractId}';`
      );
    }),
    /Contract cannot be ACCEPTED without bilateral acceptance timestamps/i
  );

  // Direct forgery on campaign harvest share agreement status without bilateral timestamps: BLOCKED
  const newAgrRes = await asUser(USER_A, async () => {
    return await db.query(
      `INSERT INTO public.campaign_harvest_share_agreements
         (farm_id, campaign_id, owner_user_id, exploiter_user_id, owner_percentage, exploiter_percentage, version)
       VALUES
         ('${farmId}', '${campaignId}', '${USER_A}', '${USER_B}', 30.00, 70.00, 2)
       RETURNING id;`
    );
  });
  const testAgrId = newAgrRes.rows[0].id;

  await assert.rejects(
    asUser(USER_A, async () => {
      await db.query(
        `UPDATE public.campaign_harvest_share_agreements
         SET status = 'ACCEPTED'
         WHERE id = '${testAgrId}';`
      );
    }),
    /Share agreement cannot be ACCEPTED without bilateral acceptance timestamps/i
  );
});

test("RLS 10: Storage RLS verifying Contract Parties (P0-3)", async () => {
  const contractPdfPath = `${farmId}/${contractId}/contrato_arrendamiento_2026.pdf`;

  await asSuperuser(async () => {
    await db.query(
      `INSERT INTO storage.objects (bucket_id, name, owner)
       VALUES ('farm-contracts', '${contractPdfPath}', '${USER_A}');`
    );
  });

  const aStorage = await asUser(USER_A, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(aStorage.rows.length, 1);

  const bStorage = await asUser(USER_B, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(bStorage.rows.length, 1);

  const cStorage = await asUser(USER_C, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(cStorage.rows.length, 0);

  const dStorage = await asUser(USER_D, async () => {
    return await db.query(
      `SELECT name FROM storage.objects WHERE bucket_id = 'farm-contracts' AND name = '${contractPdfPath}';`
    );
  });
  assert.equal(dStorage.rows.length, 0);
});

test("RLS 11: Grant Revocation Instantly Closes Access", async () => {
  const bDelivBefore = await asUser(USER_B, async () => {
    return await db.query(`SELECT id FROM public.deliveries WHERE farm_id = '${farmId}';`);
  });
  assert.ok(bDelivBefore.rows.length > 0);

  await asSuperuser(async () => {
    await db.query(
      `UPDATE public.farm_access_grants
       SET status = 'REVOKED', updated_at = now()
       WHERE farm_id = '${farmId}' AND user_id = '${USER_B}';`
    );
  });

  const bDelivAfter = await asUser(USER_B, async () => {
    return await db.query(`SELECT id FROM public.deliveries WHERE farm_id = '${farmId}';`);
  });
  assert.equal(bDelivAfter.rows.length, 0);

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
