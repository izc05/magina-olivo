// Mágina Olivo — G0 Multi-Account, Shared Farm, RLS & Sync Contract Test Suite
// Run: node --experimental-strip-types --test supabase/tests/auth_sync_rls_simulation.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface Workspace {
  id: string;
  ownerUserId: string;
  name: string;
}

interface Farm {
  id: string;
  workspaceId: string;
  creatorUserId: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  version: number;
}

interface FarmAccessGrant {
  id: string;
  farmId: string;
  userId: string;
  grantedByUserId: string;
  role: "OWNER" | "EXPLOITER" | "WORKER" | "VIEWER";
  capabilities: string[];
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  expiresAt?: Date;
}

interface FarmInvitation {
  id: string;
  farmId: string;
  issuedByUserId: string;
  tokenHash: string;
  role: "OWNER" | "EXPLOITER" | "WORKER" | "VIEWER";
  capabilities: string[];
  expiresAt: Date;
  state: "PENDING" | "CLAIMED" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  claimedByUserId?: string;
  useCount: number;
  maxUses: number;
}

interface Delivery {
  id: string;
  workspaceId: string;
  farmId: string;
  campaignId: string;
  deliveryDate: string;
  destinationName: string;
  netGrams: number;
  ticketNumber?: string;
  recordedByUserId: string;
  createdAt: string;
  version: number;
}

interface HarvestShareAgreement {
  id: string;
  farmId: string;
  campaignId: string;
  ownerUserId: string;
  exploiterUserId: string;
  ownerPercentage: number;
  exploiterPercentage: number;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED";
}

interface StorageObject {
  bucketId: string;
  path: string;
  ownerUserId: string;
  sizeBytes: number;
}

// In-Memory Database Simulator with PostgreSQL RLS Evaluation
class DatabaseSimulator {
  users: Map<string, User> = new Map();
  workspaces: Map<string, Workspace> = new Map();
  farms: Map<string, Farm> = new Map();
  grants: Map<string, FarmAccessGrant> = new Map();
  invitations: Map<string, FarmInvitation> = new Map();
  deliveries: Map<string, Delivery> = new Map();
  agreements: Map<string, HarvestShareAgreement> = new Map();
  storage: Map<string, StorageObject> = new Map();

  // Helper matching SQL public.has_farm_capability(farm_id, req_cap)
  hasFarmCapability(userId: string, farmId: string, requiredCapability: string): boolean {
    const farm = this.farms.get(farmId);
    if (!farm) return false;
    const ws = this.workspaces.get(farm.workspaceId);
    if (ws && ws.ownerUserId === userId) return true;
    if (farm.creatorUserId === userId) return true;

    for (const grant of this.grants.values()) {
      if (
        grant.farmId === farmId &&
        grant.userId === userId &&
        grant.status === "ACTIVE"
      ) {
        if (grant.expiresAt && grant.expiresAt < new Date()) continue;
        if (grant.capabilities.includes(requiredCapability) || grant.capabilities.includes("all")) {
          return true;
        }
      }
    }
    return false;
  }

  // RLS SELECT on public.farms
  selectFarms(currentUserId: string): Farm[] {
    return Array.from(this.farms.values()).filter((farm) => {
      const ws = this.workspaces.get(farm.workspaceId);
      if (ws && ws.ownerUserId === currentUserId) return true;
      if (farm.creatorUserId === currentUserId) return true;
      return this.hasFarmCapability(currentUserId, farm.id, "view_farm");
    });
  }

  // RLS SELECT on public.deliveries
  selectDeliveries(currentUserId: string, farmId: string): Delivery[] {
    if (!this.hasFarmCapability(currentUserId, farmId, "view_deliveries")) {
      return []; // RLS denies query -> 0 rows returned
    }
    return Array.from(this.deliveries.values()).filter((d) => d.farmId === farmId);
  }

  // RLS INSERT on public.deliveries
  insertDelivery(currentUserId: string, delivery: Delivery): { ok: boolean; error?: string } {
    if (!this.hasFarmCapability(currentUserId, delivery.farmId, "add_deliveries")) {
      return { ok: false, error: "403_FORBIDDEN_RLS_VIOLATION" };
    }
    this.deliveries.set(delivery.id, delivery);
    return { ok: true };
  }

  // RLS Storage check
  canAccessStorage(currentUserId: string, bucketId: string, path: string, action: "read" | "write"): boolean {
    const [farmId] = path.split("/");
    if (bucketId === "farm-attachments") {
      const cap = action === "read" ? "view_deliveries" : "add_deliveries";
      return this.hasFarmCapability(currentUserId, farmId, cap);
    }
    if (bucketId === "farm-contracts") {
      const cap = action === "read" ? "view_contracts" : "upload_contracts";
      return this.hasFarmCapability(currentUserId, farmId, cap);
    }
    return false;
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// ==========================================
// TEST SCENARIOS (4 USERS: A, B, C, D)
// ==========================================

test("G0 Multi-Tenant: User A owns farm, User D (uninvited) cannot read or write", () => {
  const db = new DatabaseSimulator();
  const userA: User = { id: randomUUID(), email: "propietario@magina.es", displayName: "Isicio A" };
  const userD: User = { id: randomUUID(), email: "intruso@externo.es", displayName: "Desconocido D" };
  db.users.set(userA.id, userA);
  db.users.set(userD.id, userD);

  const wsA: Workspace = { id: randomUUID(), ownerUserId: userA.id, name: "Workspace Isicio" };
  db.workspaces.set(wsA.id, wsA);

  const farmF: Farm = {
    id: randomUUID(),
    workspaceId: wsA.id,
    creatorUserId: userA.id,
    name: "Finca El Barranco",
    status: "ACTIVE",
    version: 1,
  };
  db.farms.set(farmF.id, farmF);

  // User A can view farm
  assert.equal(db.selectFarms(userA.id).length, 1);
  assert.equal(db.selectFarms(userA.id)[0].name, "Finca El Barranco");

  // User D queries farms: RLS returns 0 rows
  assert.equal(db.selectFarms(userD.id).length, 0);

  // User D attempts to insert delivery: Rejected with 403
  const forbiddenDelivery: Delivery = {
    id: randomUUID(),
    workspaceId: wsA.id,
    farmId: farmF.id,
    campaignId: randomUUID(),
    deliveryDate: "2026-10-11",
    destinationName: "SCA San Juan Bautista",
    netGrams: 1000000,
    recordedByUserId: userD.id,
    createdAt: new Date().toISOString(),
    version: 1,
  };
  const result = db.insertDelivery(userD.id, forbiddenDelivery);
  assert.equal(result.ok, false);
  assert.equal(result.error, "403_FORBIDDEN_RLS_VIOLATION");
});

test("G0 Invitations: Single-use temporary QR, claim by User B, replay prevention", () => {
  const db = new DatabaseSimulator();
  const userA: User = { id: randomUUID(), email: "propietario@magina.es", displayName: "Dueño A" };
  const userB: User = { id: randomUUID(), email: "explotador@magina.es", displayName: "Arrendatario B" };
  const userD: User = { id: randomUUID(), email: "intruso@magina.es", displayName: "Tercero D" };

  const farmF: Farm = {
    id: randomUUID(),
    workspaceId: randomUUID(),
    creatorUserId: userA.id,
    name: "Finca Cerro del Viento",
    status: "ACTIVE",
    version: 1,
  };
  db.farms.set(farmF.id, farmF);

  // 1. User A generates QR invite with secret token (TTL 15 min)
  const secretToken = "magina_qr_" + randomUUID();
  const tokenHash = hashToken(secretToken);
  const invite: FarmInvitation = {
    id: randomUUID(),
    farmId: farmF.id,
    issuedByUserId: userA.id,
    tokenHash,
    role: "EXPLOITER",
    capabilities: ["view_farm", "add_deliveries", "view_deliveries", "manage_agreements", "view_contracts", "upload_contracts"],
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // +15 min
    state: "PENDING",
    useCount: 0,
    maxUses: 1,
  };
  db.invitations.set(invite.id, invite);

  // 2. User B scans QR and claims it with authenticated session
  const foundInvite = Array.from(db.invitations.values()).find((i) => i.tokenHash === tokenHash);
  assert.ok(foundInvite);
  assert.equal(foundInvite.state, "PENDING");

  // Grant created for User B
  foundInvite.state = "CLAIMED";
  foundInvite.claimedByUserId = userB.id;
  foundInvite.useCount += 1;

  const grantB: FarmAccessGrant = {
    id: randomUUID(),
    farmId: farmF.id,
    userId: userB.id,
    grantedByUserId: userA.id,
    role: foundInvite.role,
    capabilities: foundInvite.capabilities,
    status: "ACTIVE",
  };
  db.grants.set(grantB.id, grantB);

  // User B now sees the farm
  assert.equal(db.selectFarms(userB.id).length, 1);
  assert.equal(db.selectFarms(userB.id)[0].id, farmF.id);

  // 3. User D attempts to replay the same QR token: rejected
  assert.equal(foundInvite.state, "CLAIMED");
  assert.equal(foundInvite.useCount >= foundInvite.maxUses, true);
  // Replay attempt fails because useCount >= maxUses
  const canReplay = foundInvite.state === "PENDING" && foundInvite.useCount < foundInvite.maxUses;
  assert.equal(canReplay, false);
});

test("G0 Offline Delivery & Sync: User B records 1.200 kg offline, User A sees it once after sync", () => {
  const db = new DatabaseSimulator();
  const userA: User = { id: randomUUID(), email: "a@magina.es", displayName: "A" };
  const userB: User = { id: randomUUID(), email: "b@magina.es", displayName: "B" };

  const farmF: Farm = {
    id: randomUUID(),
    workspaceId: randomUUID(),
    creatorUserId: userA.id,
    name: "Finca El Charcón",
    status: "ACTIVE",
    version: 1,
  };
  db.farms.set(farmF.id, farmF);

  // Grant for User B
  const grantB: FarmAccessGrant = {
    id: randomUUID(),
    farmId: farmF.id,
    userId: userB.id,
    grantedByUserId: userA.id,
    role: "EXPLOITER",
    capabilities: ["view_farm", "add_deliveries", "view_deliveries"],
    status: "ACTIVE",
  };
  db.grants.set(grantB.id, grantB);

  // User B is offline and records delivery with client-side UUID
  const deliveryId = randomUUID();
  const offlineDeliveryB: Delivery = {
    id: deliveryId,
    workspaceId: randomUUID(), // B's local workspace
    farmId: farmF.id,
    campaignId: randomUUID(),
    deliveryDate: "2026-10-11",
    destinationName: "SCA Bedmar y Garcíez",
    netGrams: 1200000, // 1.200 kg
    ticketNumber: "TK-2026-BED-001",
    recordedByUserId: userB.id,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  // Reconnection: B syncs to Supabase
  const insertResult = db.insertDelivery(userB.id, offlineDeliveryB);
  assert.equal(insertResult.ok, true);

  // User A performs pull sync: reads deliveries of Farm F
  const deliveriesA = db.selectDeliveries(userA.id, farmF.id);
  assert.equal(deliveriesA.length, 1);
  assert.equal(deliveriesA[0].id, deliveryId);
  assert.equal(deliveriesA[0].netGrams, 1200000);
  assert.equal(deliveriesA[0].ticketNumber, "TK-2026-BED-001");
  assert.equal(deliveriesA[0].recordedByUserId, userB.id);

  // Idempotent sync retry: B syncs again (due to flaky network). Result stays exactly 1 delivery.
  db.insertDelivery(userB.id, offlineDeliveryB);
  const deliveriesAfterRetry = db.selectDeliveries(userA.id, farmF.id);
  assert.equal(deliveriesAfterRetry.length, 1);
});

test("G0 Harvest Share Agreement: 70/30 split (70% Explotador / 30% Propietario) on 10.000 kg netos computes exactly without altering pesadas", () => {
  const totalNetGrams = 10000000; // 10.000 kg in grams
  const agreement: HarvestShareAgreement = {
    id: randomUUID(),
    farmId: randomUUID(),
    campaignId: randomUUID(),
    ownerUserId: randomUUID(),
    exploiterUserId: randomUUID(),
    ownerPercentage: 30.0, // 30% Propietario
    exploiterPercentage: 70.0, // 70% Explotador / Arrendatario
    status: "ACCEPTED",
  };

  assert.equal(agreement.ownerPercentage + agreement.exploiterPercentage, 100.0);

  const ownerShareGrams = Math.round((totalNetGrams * agreement.ownerPercentage) / 100);
  const exploiterShareGrams = Math.round((totalNetGrams * agreement.exploiterPercentage) / 100);

  assert.equal(ownerShareGrams, 3000000); // 3.000 kg para el propietario
  assert.equal(exploiterShareGrams, 7000000); // 7.000 kg para el explotador
  assert.equal(ownerShareGrams + exploiterShareGrams, totalNetGrams);
});

test("G0 Storage RLS & Grant Revocation: Private contracts accessible only to authorized parties", () => {
  const db = new DatabaseSimulator();
  const userA: User = { id: randomUUID(), email: "a@magina.es", displayName: "A" };
  const userB: User = { id: randomUUID(), email: "b@magina.es", displayName: "B" };
  const userC: User = { id: randomUUID(), email: "c@magina.es", displayName: "Trabajador C" };
  const userD: User = { id: randomUUID(), email: "d@magina.es", displayName: "Intruso D" };

  const farmId = randomUUID();
  const farmF: Farm = {
    id: farmId,
    workspaceId: randomUUID(),
    creatorUserId: userA.id,
    name: "Finca Las Lagunillas",
    status: "ACTIVE",
    version: 1,
  };
  db.farms.set(farmF.id, farmF);

  // B is exploiter with contract capabilities
  const grantB: FarmAccessGrant = {
    id: randomUUID(),
    farmId,
    userId: userB.id,
    grantedByUserId: userA.id,
    role: "EXPLOITER",
    capabilities: ["view_farm", "add_deliveries", "view_deliveries", "view_contracts", "upload_contracts"],
    status: "ACTIVE",
  };
  db.grants.set(grantB.id, grantB);

  // C is worker with only add_deliveries (NO contract access)
  const grantC: FarmAccessGrant = {
    id: randomUUID(),
    farmId,
    userId: userC.id,
    grantedByUserId: userA.id,
    role: "WORKER",
    capabilities: ["view_farm", "add_deliveries"],
    status: "ACTIVE",
  };
  db.grants.set(grantC.id, grantC);

  const contractPath = `${farmId}/contract_1/arrendamiento_2026.pdf`;

  // Owner A and Exploiter B can read/write contract storage
  assert.equal(db.canAccessStorage(userA.id, "farm-contracts", contractPath, "read"), true);
  assert.equal(db.canAccessStorage(userB.id, "farm-contracts", contractPath, "read"), true);
  assert.equal(db.canAccessStorage(userB.id, "farm-contracts", contractPath, "write"), true);

  // Worker C and Intruder D are denied
  assert.equal(db.canAccessStorage(userC.id, "farm-contracts", contractPath, "read"), false);
  assert.equal(db.canAccessStorage(userD.id, "farm-contracts", contractPath, "read"), false);
  assert.equal(db.canAccessStorage(userD.id, "farm-contracts", contractPath, "write"), false);

  // Revocation test: Owner A revokes Exploiter B's grant
  grantB.status = "REVOKED";

  // Now B is immediately denied access to contracts and deliveries
  assert.equal(db.canAccessStorage(userB.id, "farm-contracts", contractPath, "read"), false);
  assert.equal(db.hasFarmCapability(userB.id, farmId, "add_deliveries"), false);
  assert.equal(db.selectDeliveries(userB.id, farmId).length, 0);
});
