package com.isivoltpro.maginaolivo.data.local

import android.content.Context
import android.os.Bundle
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.core.common.AppResult
import com.isivoltpro.maginaolivo.core.dispatchers.DefaultAppDispatchers
import com.isivoltpro.maginaolivo.core.id.UuidGenerator
import com.isivoltpro.maginaolivo.core.regional.RegionalContext
import com.isivoltpro.maginaolivo.core.time.SystemAppClock
import com.isivoltpro.maginaolivo.data.local.entity.WorkspaceAuthorizationCacheEntity
import com.isivoltpro.maginaolivo.data.local.model.CampaignStatus
import com.isivoltpro.maginaolivo.data.local.model.OutboxOperation
import com.isivoltpro.maginaolivo.data.local.model.OutboxStatus
import com.isivoltpro.maginaolivo.data.local.model.SyncEntityType
import com.isivoltpro.maginaolivo.data.local.model.SyncStatus
import com.isivoltpro.maginaolivo.data.repository.AndroidFarmLinkLedger
import com.isivoltpro.maginaolivo.data.repository.HistoricalDeliveryRoute
import com.isivoltpro.maginaolivo.data.repository.HttpsWorkspaceAuthorizationRemote
import com.isivoltpro.maginaolivo.data.repository.LocalFarmLinkRepository
import com.isivoltpro.maginaolivo.data.repository.LocalWorkspaceRepository
import com.isivoltpro.maginaolivo.data.repository.OfflineFirstCampaignRepository
import com.isivoltpro.maginaolivo.data.repository.OfflineFirstDeliveryRepository
import com.isivoltpro.maginaolivo.data.repository.OfflineFirstFarmRepository
import com.isivoltpro.maginaolivo.data.repository.OfflineFirstParcelRepository
import com.isivoltpro.maginaolivo.data.repository.ServerWorkspaceOwnerVerifier
import com.isivoltpro.maginaolivo.data.repository.sync.CampaignReceiveCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.CampaignReceiveOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.DeliveryDispatchLease
import com.isivoltpro.maginaolivo.data.repository.sync.DeliveryDispatchWorker
import com.isivoltpro.maginaolivo.data.repository.sync.DeliveryRpcAdapter
import com.isivoltpro.maginaolivo.data.repository.sync.DispatchOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.FarmSendCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.FarmSendOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.HarvestReceiveCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.HarvestReceiveOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.HarvestSendCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.HarvestSendOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.HttpsDeliveryRpcTransport
import com.isivoltpro.maginaolivo.data.repository.sync.HttpsDeliveryRpcTransport.RpcScope
import com.isivoltpro.maginaolivo.data.repository.sync.ParcelSendCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.ParcelSendOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.ParentReceiveCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.ParentReceiveOutcome
import com.isivoltpro.maginaolivo.data.repository.sync.ReceiveLimit
import com.isivoltpro.maginaolivo.data.repository.sync.WorkspaceDraft
import com.isivoltpro.maginaolivo.data.repository.sync.WorkspaceSendCoordinator
import com.isivoltpro.maginaolivo.data.repository.sync.WorkspaceSendOutcome
import com.isivoltpro.maginaolivo.domain.campaign.NewCampaign
import com.isivoltpro.maginaolivo.domain.delivery.DeliveryDraft
import com.isivoltpro.maginaolivo.domain.delivery.DeliveryShareInput
import com.isivoltpro.maginaolivo.domain.delivery.PesadaOrigin
import com.isivoltpro.maginaolivo.domain.farm.NewFarm
import com.isivoltpro.maginaolivo.domain.parcel.NewParcel
import com.isivoltpro.maginaolivo.feature.account.AccountRecord
import com.isivoltpro.maginaolivo.feature.account.AccountRepository
import com.isivoltpro.maginaolivo.feature.account.AuthConfiguration
import com.isivoltpro.maginaolivo.feature.account.AuthSession
import com.isivoltpro.maginaolivo.feature.account.HttpsAuthTransport
import com.isivoltpro.maginaolivo.feature.account.MemoryAccountSessionStore
import com.isivoltpro.maginaolivo.feature.account.SupabaseAuthApi
import java.io.File
import java.net.URL
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Base64
import java.util.UUID
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Phase 2: the first REAL sync between two disposable emulators (A2 and B2), each its own process, Room and session of the
 * same owner account, through a disposable local Supabase (`supabase/tests/g26-ab-two-devices/run.sh`).
 *
 * One step per device, chosen by `-e ab_role A|B`; without it the class is skipped (opt-in, like the other device probes).
 * - A2 creates a workspace, a farm, a parcel and a campaign with the app's own repositories, records a Pesada, and sends
 *   them with the real senders (#798 workspace, #799 farm, #800 parcel, campaign CAS, #824 Jornada, #808 Pesada v3 + HEAD).
 *   The only QA stand-in: Android has no CAMPAIGN CREATE sender yet, so A2 publishes its own local campaign with the
 *   server's real `create_own_campaign` RPC under its own session and records the confirmation as that sender would.
 * - B2, an empty device, receives with the real receivers (parents, campaign, Jornadas with their Pesadas) and checks that
 *   everything equals A2's records, with no duplicate and a repeat receive that changes nothing.
 */
@RunWith(AndroidJUnit4::class)
class AbTwoDeviceStepTest {
    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val issuer = "https://zubpicdibqbmewxeurhm.supabase.co"
    private val endpoint = "https://10.0.2.2:54443"
    private val zone = ZoneId.of("Europe/Madrid")
    private val args = InstrumentationRegistry.getArguments()
    private val role = args.getString("ab_role")
    private lateinit var originalTls: SSLSocketFactory
    private lateinit var fixture: JSONObject
    private lateinit var config: AuthConfiguration
    private lateinit var authorizations: HttpsWorkspaceAuthorizationRemote
    private lateinit var leaseDirectory: File
    private lateinit var lease: DeliveryDispatchLease
    private val clock = SystemAppClock()
    private val ids = UuidGenerator()
    private val dispatchers = DefaultAppDispatchers()

    @Before fun setup() {
        assumeTrue("Two-device probe: opt in with -e ab_role A|B", role == "A" || role == "B")
        val encoded = args.getString("g26_test_cert") ?: error("Disposable TLS certificate required")
        val certificate = CertificateFactory.getInstance("X.509").generateCertificate(Base64.getDecoder().decode(encoded).inputStream())
        val store = KeyStore.getInstance(KeyStore.getDefaultType()).apply { load(null); setCertificateEntry("ab-ephemeral", certificate) }
        val manager = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply { init(store) }
        val tls = javax.net.ssl.SSLContext.getInstance("TLS").apply { init(null, manager.trustManagers, null) }
        originalTls = HttpsURLConnection.getDefaultSSLSocketFactory()
        HttpsURLConnection.setDefaultSSLSocketFactory(tls.socketFactory)
        fixture = JSONObject(get("/__g26_fixture"))
        config = AuthConfiguration(endpoint, fixture.getString("anonKey"), "qa://auth/callback")
        authorizations = HttpsWorkspaceAuthorizationRemote(endpoint, fixture.getString("anonKey"))
        leaseDirectory = File(context.noBackupFilesDir, "ab-lease-$role")
        lease = DeliveryDispatchLease.tryAcquire(leaseDirectory)!!
    }

    @After fun cleanup() {
        if (::lease.isInitialized) lease.close()
        if (::originalTls.isInitialized) HttpsURLConnection.setDefaultSSLSocketFactory(originalTls)
    }

    // ------------------------------------------------------------------------------------------------------- device A2

    @Test fun a2CreatesFarmCampaignAndPesadaAndSendsThem() = runBlocking<Unit> {
        assumeTrue(role == "A")
        val actor = UUID.fromString(fixture.getString("actor"))
        val session = session(actor, "tokenA")
        val account = account(session)
        val db = MaginaOlivoDatabase.create(context, "ab-harness-a2.db")
        try {
            // 1. Workspace: created and confirmed by the real #798 sender.
            val workspaceSend = WorkspaceSendCoordinator(db, account, issuer, transport(RpcScope.WORKSPACE_SEND))
            val staged = workspaceSend.createOwned(WorkspaceDraft("Olivar A2", "ES", "Europe/Madrid", "es-ES", "EUR"))
            assertEquals(WorkspaceSendOutcome.SYNCED, workspaceSend.send(staged.operationId!!, lease))
            val workspace = staged.workspaceId!!
            refreshAuthorization(db, actor, session)
            val selector = selector(db, account)
            assertTrue(selector.selectWorkspace(workspace) is AppResult.Success)
            val links = LocalFarmLinkRepository(context, db, account, issuer, AndroidFarmLinkLedger(File(context.noBackupFilesDir, "ab-ledger-a2.json")),
                ServerWorkspaceOwnerVerifier(authorizations, issuer))

            // 2. Farm: the app's repository, explicit G1b consent, real #799 sender.
            val farm = ok(OfflineFirstFarmRepository(db, clock, ids, dispatchers, selector)
                .create(NewFarm(workspace, "Finca A2", municipality = "Bedmar", province = "Jaén")))
            links.consent(actor, links.choices().filter { it.id == farm }, accepted = true)
            val farmOp = db.syncOutboxDao().listForEntity(SyncEntityType.FARM, farm).single().id
            val farmSend = FarmSendCoordinator(db, account, issuer, transport(RpcScope.FARM_SEND), { links.ledgerFor(it) })
            assertEquals("farm stage", FarmSendOutcome.STAGED, farmSend.stage(farmOp)); assertEquals(FarmSendOutcome.SYNCED, farmSend.send(farmOp, lease))

            // 3. Parcel: the app's repository, real #800 sender.
            val parcel = ok(OfflineFirstParcelRepository(db, clock, ids, dispatchers, workspaceRepository = selector)
                .create(NewParcel(farm, "Parcela A2", municipality = "Bedmar", province = "Jaén", managedAreaM2 = 1500.0)))
            val parcelOp = db.syncOutboxDao().listForEntity(SyncEntityType.PARCEL, parcel).single().id
            val parcelSend = ParcelSendCoordinator(db, account, issuer, transport(RpcScope.PARCEL_SEND), { links.ledgerFor(it) })
            assertEquals("parcel stage", ParcelSendOutcome.STAGED, parcelSend.stage(parcelOp)); assertEquals(ParcelSendOutcome.SYNCED, parcelSend.send(parcelOp, lease))

            // 4. Campaign: created, activated and put into harvest with the app's repository, then published as ONE server
            //    create (create_own_campaign, its current snapshots) under A2's own session.
            //    Known gaps, not hidden: Android has no CAMPAIGN CREATE sender; and activate() rebuilds the snapshots
            //    locally (new ids, PENDING), which the CAMPAIGN CAS sender refuses, so a campaign confirmed in PREPARATION
            //    and activated later cannot be sent today (see the phase 2 report).
            val today = LocalDate.now(zone)
            val campaigns = OfflineFirstCampaignRepository(db, clock, ids, dispatchers, selector)
            val campaign = ok(campaigns.create(NewCampaign(farm, "Campaña A2", today.minusDays(30), setOf(parcel))))
            assertTrue(campaigns.activate(campaign) is AppResult.Success)
            assertTrue(campaigns.markHarvest(campaign) is AppResult.Success)
            publishCampaignCreate(db, session, campaign)
            assertEquals(CampaignStatus.HARVEST, db.campaignDao().findById(campaign)!!.status)
            assertTrue("campaign ${casDiagnostics(db, campaign, farm, parcel)}",
                db.syncOutboxDao().listForEntity(SyncEntityType.CAMPAIGN, campaign).all { it.status == OutboxStatus.CONFIRMED })

            // 5. Pesada: the app's repository (v3), its automatic Jornada through the real #824 sender, the Pesada through
            //    the real #808 v3 writer and its HEAD confirmation.
            val net = 1_234_000L
            val deliveries = OfflineFirstDeliveryRepository(db, clock, ids, dispatchers, workspaceRepository = selector, writeScope = links,
                payloadRoute = HistoricalDeliveryRoute { _, _ -> true }) { zone }
            val pesada = ok(deliveries.create(DeliveryDraft(farmId = farm, deliveryDate = today, destinationOrganizationId = null,
                destinationName = "Cooperativa San Isidro", netGrams = net, shares = listOf(DeliveryShareInput(parcel, net)), origin = PesadaOrigin.TREE)))
            val pesadaOp = db.syncOutboxDao().listForEntity(SyncEntityType.DELIVERY, pesada).single()
            val jornada = db.deliveryDao().findById(pesada)!!.harvestId!!
            val marker = db.syncOutboxDao().listForEntity(SyncEntityType.HARVEST, jornada).single { it.status == OutboxStatus.PENDING && it.payloadJson == null }
            val harvests = HarvestSendCoordinator(db, account, issuer, transport(RpcScope.HARVEST_SEND), { links.ledgerFor(it) },
                ServerWorkspaceOwnerVerifier(authorizations, issuer), ids)
            assertEquals("jornada stage", HarvestSendOutcome.STAGED, harvests.stage(marker.id))
            val sent = harvests.send(marker.id, lease)
            assertTrue("$sent", sent == HarvestSendOutcome.SYNCED || sent == HarvestSendOutcome.CONFIRMED_LOCAL_PENDING)
            val worker = DeliveryDispatchWorker(db, links, DeliveryRpcAdapter(transport(RpcScope.DELIVERY)))
            val dispatched = worker.dispatch(pesadaOp.id, lease)
            assertEquals("pesada dispatch: ${db.syncOutboxDao().findById(pesadaOp.id)?.let { "${it.status}/${it.lastErrorCode}/${it.lastErrorMessage}" }} " +
                "jornada=${db.harvestDao().findById(jornada)?.metadata?.let { "${it.syncStatus}/rv=${it.remoteVersion}" }} " +
                "pesada=${db.deliveryDao().findById(pesada)?.let { "${it.deliveryDate}/${it.netGrams}/${it.metadata.syncStatus}" }}",
                DispatchOutcome.V3_ACK_AWAITING_HEAD, dispatched)
            assertEquals(DispatchOutcome.SYNCED, worker.resolveAwaitingHead(pesadaOp.id, lease))

            // Everything A2 recorded is confirmed by the server; nothing is left pending.
            for (type in listOf(SyncEntityType.WORKSPACE, SyncEntityType.FARM, SyncEntityType.PARCEL, SyncEntityType.CAMPAIGN, SyncEntityType.DELIVERY))
                assertTrue("$type", (db.syncOutboxDao().listForEntity(type, mapOf(SyncEntityType.WORKSPACE to workspace, SyncEntityType.FARM to farm,
                    SyncEntityType.PARCEL to parcel, SyncEntityType.CAMPAIGN to campaign, SyncEntityType.DELIVERY to pesada).getValue(type)))
                    .all { it.status == OutboxStatus.CONFIRMED })
            assertEquals(SyncStatus.SYNCED, db.deliveryDao().findById(pesada)!!.metadata.syncStatus)

            val result = JSONObject().put("workspace", "$workspace").put("farm", "$farm").put("parcel", "$parcel")
                .put("campaign", "$campaign").put("jornada", "$jornada").put("pesada", "$pesada").put("net", net)
                .put("farmName", "Finca A2").put("parcelName", "Parcela A2").put("campaignName", "Campaña A2")
                .put("jornadaWeight", db.harvestDao().findById(jornada)!!.weightGrams)
                .put("pesadaVersion", db.deliveryDao().findById(pesada)!!.metadata.remoteVersion)
                .put("jornadaVersion", db.harvestDao().findById(jornada)!!.metadata.remoteVersion)
            report("ab_result", result.toString())
        } finally { db.close() }
    }

    // ------------------------------------------------------------------------------------------------------- device B2

    @Test fun b2ReceivesEverythingAndMatchesWithoutDuplicates() = runBlocking<Unit> {
        assumeTrue(role == "B")
        val expected = JSONObject(String(Base64.getDecoder().decode(args.getString("ab_expected") ?: error("ab_expected required"))))
        val workspace = UUID.fromString(expected.getString("workspace")); val farm = UUID.fromString(expected.getString("farm"))
        val parcel = UUID.fromString(expected.getString("parcel")); val campaign = UUID.fromString(expected.getString("campaign"))
        val jornada = UUID.fromString(expected.getString("jornada")); val pesada = UUID.fromString(expected.getString("pesada"))
        val actor = UUID.fromString(fixture.getString("actor"))
        val session = session(actor, "tokenB")
        val account = account(session)
        val db = MaginaOlivoDatabase.create(context, "ab-harness-b2.db")
        try {
            assertEquals("B2 starts empty", 0, count(db, "farms") + count(db, "deliveries"))
            refreshAuthorization(db, actor, session)
            // Parents (workspace, farm, parcel) with their original UUIDs.
            val parents = ParentReceiveCoordinator(db, account, issuer, transport(RpcScope.PARENT_RECEIVE))
            assertEquals(ParentReceiveOutcome.IMPORTED, parents.receive(workspace).outcome)
            assertTrue(selector(db, account).selectWorkspace(workspace) is AppResult.Success)
            // The campaign with its parcel snapshots.
            val campaigns = CampaignReceiveCoordinator(db, account, issuer, transport(RpcScope.CAMPAIGN_RECEIVE))
            assertEquals(CampaignReceiveOutcome.IMPORTED, campaigns.receive(campaign))
            // Explicit consent on B2 for the farm of its own workspace, then the Jornadas with their Pesadas.
            val links = LocalFarmLinkRepository(context, db, account, issuer, AndroidFarmLinkLedger(File(context.noBackupFilesDir, "ab-ledger-b2.json")),
                ServerWorkspaceOwnerVerifier(authorizations, issuer))
            links.consent(actor, links.choices().filter { it.id == farm }, accepted = true)
            val receiver = HarvestReceiveCoordinator(db, account, issuer, transport(RpcScope.HARVEST_RECEIVE), { links.ledgerFor(it) },
                ServerWorkspaceOwnerVerifier(authorizations, issuer), ids, tokenIssuer = "$issuer/auth/v1")
            val received = receiver.receive(workspace, farm, campaign, ReceiveLimit())
            assertEquals("${received.outcome} ${received.held.map { it.cause + ":" + it.entityId }}", HarvestReceiveOutcome.IMPORTED, received.outcome)

            // Same records as A2, same UUIDs, exactly once.
            assertEquals(expected.getString("farmName"), db.farmDao().findById(farm)!!.name)
            assertEquals(expected.getString("parcelName"), db.parcelDao().findById(parcel)!!.displayName)
            val c = db.campaignDao().findById(campaign)!!
            assertEquals(expected.getString("campaignName"), c.name); assertEquals(CampaignStatus.HARVEST, c.status)
            val j = db.harvestDao().findById(jornada)!!
            assertEquals(expected.getLong("jornadaWeight"), j.weightGrams); assertEquals(expected.getLong("jornadaVersion"), j.metadata.remoteVersion)
            val p = db.deliveryDao().findById(pesada)!!
            assertEquals(expected.getLong("net"), p.netGrams); assertEquals(jornada, p.harvestId)
            assertEquals(expected.getLong("pesadaVersion"), p.metadata.remoteVersion)
            assertEquals(listOf(parcel), db.deliveryDao().listParcels(pesada).map { it.parcelId })
            val counts = listOf("workspaces", "farms", "parcels", "campaigns", "harvests", "deliveries", "delivery_parcels").associateWith { count(db, it) }
            assertEquals("no duplicates: $counts", listOf(1, 1, 1, 1, 1, 1, 1), counts.values.toList())
            assertEquals("receiving creates no outbox operation", 0, count(db, "sync_outbox"))

            // A repeat receive changes nothing.
            val before = dump(db)
            assertEquals(0, parents.receive(workspace).let { it.inserted + it.updated })
            assertEquals(CampaignReceiveOutcome.ALREADY_CURRENT, campaigns.receive(campaign))
            assertEquals(HarvestReceiveOutcome.ALREADY_CURRENT, receiver.receive(workspace, farm, campaign, ReceiveLimit()).outcome)
            assertEquals(before, dump(db))
            report("ab_b2", JSONObject().put("counts", JSONObject(counts as Map<*, *>)).put("repeat", "ALREADY_CURRENT").toString())
        } finally { db.close() }
    }

    // --------------------------------------------------------------------------------------------------------- helpers

    /** The QA stand-in for the missing Android CAMPAIGN CREATE sender: the server's real RPC, this device's session. */
    private suspend fun publishCampaignCreate(db: MaginaOlivoDatabase, session: AuthSession, campaign: UUID) {
        val c = db.campaignDao().findById(campaign)!!
        val op = db.syncOutboxDao().listForEntity(SyncEntityType.CAMPAIGN, campaign).single { it.operation == OutboxOperation.CREATE }
        val snapshots = JSONArray(db.campaignDao().listSnapshots(campaign).map { s ->
            JSONObject().put("id", "${s.id}").put("parcelId", "${s.parcelId}").put("farmIdAtStart", "${s.farmIdAtStart}")
                .put("farmNameAtStart", s.farmNameAtStart).put("parcelNameAtStart", s.parcelNameAtStart)
                .put("managedAreaM2AtStart", s.managedAreaM2AtStart ?: JSONObject.NULL)
                .put("cadastralReferenceAtStart", s.cadastralReferenceAtStart ?: JSONObject.NULL)
                .put("geometryGeoJsonSnapshot", s.geometryGeoJsonSnapshot ?: JSONObject.NULL)
        })
        val body = JSONObject().put("p_operation_id", "${op.id}").put("p_campaign", JSONObject().put("id", "$campaign")
            .put("workspaceId", "${c.workspaceId}").put("farmId", "${c.farmId}").put("name", c.name).put("startDate", "${c.startDate}")
            .put("endDate", c.endDate?.toString() ?: JSONObject.NULL).put("status", c.status.name).put("notes", c.notes ?: JSONObject.NULL)
            .put("parcels", snapshots))
        post("/rest/v1/rpc/create_own_campaign", body.toString(), session.accessToken)
        // As the sender would on its receipt: the CREATE is confirmed at version 1.
        db.campaignDao().upsert(c.copy(metadata = c.metadata.copy(syncStatus = SyncStatus.SYNCED, remoteVersion = 1L)))
        db.openHelper.writableDatabase.execSQL("UPDATE campaign_parcels SET sync_status='SYNCED', remote_version=1 WHERE campaign_id=?",
            arrayOf<Any>(campaign.toString()))
        // The single server create carries the campaign's final state, so every local CAMPAIGN operation is settled by it.
        db.openHelper.writableDatabase.execSQL("UPDATE sync_outbox SET status='CONFIRMED' WHERE entity_type='CAMPAIGN' AND entity_id=?",
            arrayOf<Any>(campaign.toString()))
    }

    /** The state CAMPAIGN CAS staging checks, for a failure message only. */
    private suspend fun casDiagnostics(db: MaginaOlivoDatabase, campaign: UUID, farm: UUID, parcel: UUID): String {
        val c = db.campaignDao().findById(campaign)!!
        suspend fun ops(type: SyncEntityType, id: UUID) = db.syncOutboxDao().listForEntity(type, id).map {
            "${it.operation}:${it.status}:acc=${it.accountId != null}:payload=${it.payloadJson != null}:att=${it.attemptCount}:err=${it.lastErrorCode}" }
        val snaps = db.campaignDao().listSnapshots(campaign).map { "${it.metadata.syncStatus}:del=${it.metadata.deletedAt != null}" }
        val p = db.parcelDao().findById(parcel)!!
        return "campaign=${c.status}/${c.metadata.syncStatus}/rv=${c.metadata.remoteVersion} campaignOps=${ops(SyncEntityType.CAMPAIGN, campaign)} " +
            "farmOps=${ops(SyncEntityType.FARM, farm)} farm=${db.farmDao().findById(farm)!!.metadata.syncStatus} snaps=$snaps " +
            "parcel=${p.metadata.syncStatus}/rv=${p.metadata.remoteVersion} parcelOps=${ops(SyncEntityType.PARCEL, parcel)}"
    }

    private suspend fun refreshAuthorization(db: MaginaOlivoDatabase, actor: UUID, session: AuthSession) =
        db.workspaceAuthorizationCacheDao().upsert(WorkspaceAuthorizationCacheEntity(issuer, actor.toString(), authorizations.list(session)))

    private fun selector(db: MaginaOlivoDatabase, account: AccountRepository) = LocalWorkspaceRepository(
        db, clock, ids, dispatchers, RegionalContext.spainDefault(), account, issuer, authorizations)

    private fun transport(scope: RpcScope) = HttpsDeliveryRpcTransport(config, scope = scope)

    private fun session(actor: UUID, key: String): AuthSession {
        val token = fixture.getString(key)
        val expiration = JSONObject(String(Base64.getUrlDecoder().decode(token.split('.')[1]))).getLong("exp")
        return AuthSession(actor, "owner@example.test", token, "unused", Instant.ofEpochSecond(expiration))
    }

    private suspend fun account(session: AuthSession): AccountRepository {
        val store = MemoryAccountSessionStore().apply { write(AccountRecord(session = session)) }
        return AccountRepository(SupabaseAuthApi(config, HttpsAuthTransport(config)), store).also { it.resume(true) }
    }

    private fun <T> ok(result: AppResult<T>): T = when (result) {
        is AppResult.Success -> result.value
        is AppResult.Failure -> error("expected success: ${result.error}")
    }

    private fun count(db: MaginaOlivoDatabase, table: String) =
        db.openHelper.readableDatabase.query("SELECT count(*) FROM $table").use { it.moveToFirst(); it.getInt(0) }

    private fun dump(db: MaginaOlivoDatabase) = listOf("workspaces", "farms", "parcels", "campaigns", "campaign_parcels", "harvests",
        "harvest_parcels", "deliveries", "delivery_parcels", "sync_outbox", "sync_receive_receipts").joinToString("\n") { t ->
        db.openHelper.readableDatabase.query("SELECT * FROM $t ORDER BY rowid").use { c ->
            "$t:" + buildList { while (c.moveToNext()) add((0 until c.columnCount).joinToString("|") { if (c.isNull(it)) "∅" else c.getString(it) }) }.joinToString(";")
        }
    }

    /** One result line for the host orchestrator (`INSTRUMENTATION_STATUS: <key>=<json>` in `am instrument -r`). */
    private fun report(key: String, json: String) =
        InstrumentationRegistry.getInstrumentation().sendStatus(2, Bundle().apply { putString(key, json) })

    private fun get(path: String): String = http(path, "GET", null, null)
    private fun post(path: String, body: String, token: String): String = http(path, "POST", body, token)

    private fun http(path: String, method: String, body: String?, token: String?): String {
        val connection = URL("$endpoint$path").openConnection() as HttpsURLConnection
        return try {
            connection.requestMethod = method
            if (token != null) {
                connection.setRequestProperty("apikey", fixture.getString("anonKey"))
                connection.setRequestProperty("Authorization", "Bearer $token")
            }
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val code = connection.responseCode
            val text = (if (code in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            check(code in 200..299) { "$path -> $code ${text.take(300)}" }
            text
        } finally { connection.disconnect() }
    }
}
