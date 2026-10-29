package com.isivoltpro.maginaolivo.feature.irrigation

import android.content.Context
import androidx.core.content.edit
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.isivoltpro.maginaolivo.domain.irrigation.AforoConfig
import com.isivoltpro.maginaolivo.domain.irrigation.AndroidFarmerIrrigationStore
import com.isivoltpro.maginaolivo.domain.irrigation.ParcelIrrigationProfile
import com.isivoltpro.maginaolivo.domain.irrigation.WaterSourceType
import com.isivoltpro.maginaolivo.domain.irrigation.WaterSupplyDetails
import com.isivoltpro.maginaolivo.domain.irrigation.WaterTariff
import com.isivoltpro.maginaolivo.domain.irrigation.WaterTariffType
import java.util.UUID
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Validates Farmer Irrigation Store on real Android SharedPreferences storage:
 * - Legacy configuration recovery and explicit backup migration without data loss.
 * - Strict multi-account isolation across account switching (A -> B -> A) on the same device.
 * - Process restart persistence and scope-confined removals.
 */
@RunWith(AndroidJUnit4::class)
class FarmerIrrigationStoreAndroidStorageTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val prefsName = "farmer_irrigation_configs"
    private val prefs get() = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

    @Before
    @After
    fun clearPreferences() {
        prefs.edit(commit = true) { clear() }
    }

    @Test
    fun legacyConfigRecovery_loadsWithoutDataLoss_andMigratesToScopedFormatWithBackup() {
        val parcelId = UUID.randomUUID()
        val legacyKey = "profile_$parcelId"
        val sampleProfile = ParcelIrrigationProfile(
            parcelId = parcelId,
            supply = WaterSupplyDetails(
                sourceType = WaterSourceType.IRRIGATION_COMMUNITY,
                communityName = "Comunidad San Isidro",
                sector = "Sector 1",
            ),
            aforo = AforoConfig(
                oliveTreeCount = 200,
                emittersPerTree = 3,
                emitterFlowLph = 4.0,
            ),
            tariff = WaterTariff(
                tariffType = WaterTariffType.PER_M3,
                variablePricePerUnitMinor = 22L, // 0.22 €/m3
                annualCommunityQuotaMinor = 12000L, // 120.00 €
                quotaIdentifier = "cuota-ordinaria",
            ),
        )

        // 1. Simulate legacy un-scoped entry in Android SharedPreferences
        val legacyJson = AndroidFarmerIrrigationStore.serializeProfile(sampleProfile).toString()
        prefs.edit(commit = true) {
            putString(legacyKey, legacyJson)
        }
        assertTrue("Legacy key must exist in real preferences", prefs.contains(legacyKey))

        // 2. Open store with default local scope -> verifies non-destructive fallback loading
        val store = AndroidFarmerIrrigationStore(context)
        val loadedFallback = store.getProfile(parcelId)
        assertNotNull("Legacy profile must be accessible under default/local scope", loadedFallback)
        assertEquals("Comunidad San Isidro", loadedFallback?.supply?.communityName)
        assertEquals(4.0, loadedFallback?.aforo?.emitterFlowLph ?: 0.0, 0.001)

        // 3. Migrate legacy entries to a concrete verified user+workspace scope
        val targetScope = "user_alice:::workspace_w1"
        val migratedCount = store.migrateLegacyProfilesToScope(targetScope)
        assertEquals(1, migratedCount)

        // 4. Assert that:
        // - Original legacy key is untouched (non-destructive)
        // - Immutable backup key was created
        // - Scoped key was created under the target partition
        val backupKey = "profile_backup_legacy_$parcelId"
        val scopedKey = "profile_scope_${targetScope}_$parcelId"
        assertTrue("Original legacy key must be preserved", prefs.contains(legacyKey))
        assertTrue("Immutable backup key must exist", prefs.contains(backupKey))
        assertTrue("Target scoped key must exist", prefs.contains(scopedKey))

        // 5. Switching to target scope retrieves the profile from the scoped partition
        store.setScope(targetScope)
        val loadedInScope = store.getProfile(parcelId)
        assertNotNull("Profile must be loaded from target scope partition", loadedInScope)
        assertEquals(sampleProfile.tariff.quotaIdentifier, loadedInScope?.tariff?.quotaIdentifier)
        assertEquals(sampleProfile.tariff.variablePricePerUnitMinor, loadedInScope?.tariff?.variablePricePerUnitMinor)
        assertEquals(sampleProfile.aforo.emitterFlowLph, loadedInScope?.aforo?.emitterFlowLph ?: 0.0, 0.001)
    }

    @Test
    fun accountIsolation_journeyA_to_B_to_A_preservesIndependentPartitionsOnRealStorage() {
        val parcelId = UUID.randomUUID()
        val workspaceId = UUID.randomUUID()
        val userIdA = "user_alice_123"
        val userIdB = "user_bob_456"

        val scopeA = AndroidFarmerIrrigationStore.scopeKey(userIdA, workspaceId)
        val scopeB = AndroidFarmerIrrigationStore.scopeKey(userIdB, workspaceId)

        val store = AndroidFarmerIrrigationStore(context, initialScope = scopeA)

        // --- Step 1: User A saves configuration ---
        val profileA = ParcelIrrigationProfile(
            parcelId = parcelId,
            supply = WaterSupplyDetails(sourceType = WaterSourceType.IRRIGATION_COMMUNITY, communityName = "Comunidad Alice", sector = "Sector A"),
            aforo = AforoConfig(oliveTreeCount = 100, emittersPerTree = 4, emitterFlowLph = 4.0),
            tariff = WaterTariff(variablePricePerUnitMinor = 25L, annualCommunityQuotaMinor = 15000L),
        )
        store.saveProfile(profileA)
        assertEquals("Comunidad Alice", store.getProfile(parcelId)?.supply?.communityName)

        // --- Step 2: Switch to User B in the same workspace ---
        store.setScope(scopeB)
        assertNull("User B must NOT see User A's profile on real storage", store.getProfile(parcelId))

        // User B saves their own distinct configuration for the same parcel
        val profileB = ParcelIrrigationProfile(
            parcelId = parcelId,
            supply = WaterSupplyDetails(sourceType = WaterSourceType.WELL, communityName = null),
            aforo = AforoConfig(oliveTreeCount = 100, emittersPerTree = 2, emitterFlowLph = 2.2),
            tariff = WaterTariff(tariffType = WaterTariffType.FREE, variablePricePerUnitMinor = 0L, annualCommunityQuotaMinor = 0L),
        )
        store.saveProfile(profileB)
        assertEquals(WaterSourceType.WELL, store.getProfile(parcelId)?.supply?.sourceType)
        assertEquals(2.2, store.getProfile(parcelId)?.aforo?.emitterFlowLph ?: 0.0, 0.001)

        // --- Step 3: Switch back to User A (A -> B -> A journey) ---
        store.setScope(scopeA)
        val restoredA = store.getProfile(parcelId)
        assertNotNull("User A must recover their original profile intact", restoredA)
        assertEquals("Comunidad Alice", restoredA?.supply?.communityName)
        assertEquals(4.0, restoredA?.aforo?.emitterFlowLph ?: 0.0, 0.001)
        assertEquals(25L, restoredA?.tariff?.variablePricePerUnitMinor)

        // --- Step 4: Verify persistence across simulated app restart ---
        val restartedStore = AndroidFarmerIrrigationStore(context, initialScope = scopeB)
        val restoredB = restartedStore.getProfile(parcelId)
        assertNotNull("User B profile must persist across restart", restoredB)
        assertEquals(WaterSourceType.WELL, restoredB?.supply?.sourceType)
        assertEquals(2.2, restoredB?.aforo?.emitterFlowLph ?: 0.0, 0.001)
    }

    @Test
    fun removeProfile_inScopedPartition_doesNotTouchLegacyBackupOrOtherPartitions() {
        val parcelId = UUID.randomUUID()
        val workspaceId = UUID.randomUUID()
        val scopeA = AndroidFarmerIrrigationStore.scopeKey("user_alice", workspaceId)
        val scopeB = AndroidFarmerIrrigationStore.scopeKey("user_bob", workspaceId)

        val store = AndroidFarmerIrrigationStore(context, initialScope = scopeA)

        // Setup User A profile and User B profile
        val profileA = ParcelIrrigationProfile(
            parcelId = parcelId,
            supply = WaterSupplyDetails(sourceType = WaterSourceType.IRRIGATION_COMMUNITY, communityName = "Comunidad Alice"),
        )
        val profileB = ParcelIrrigationProfile(
            parcelId = parcelId,
            supply = WaterSupplyDetails(sourceType = WaterSourceType.IRRIGATION_COMMUNITY, communityName = "Comunidad Bob"),
        )

        store.saveProfile(profileA)
        store.setScope(scopeB)
        store.saveProfile(profileB)

        // Also add a legacy backup entry
        val backupKey = "profile_backup_legacy_$parcelId"
        prefs.edit(commit = true) { putString(backupKey, "{ \"backup\": true }") }

        // Remove profile while in User B scope
        store.removeProfile(parcelId)
        assertNull("User B profile should be removed", store.getProfile(parcelId))

        // Assert User A profile and legacy backup remain intact on storage
        store.setScope(scopeA)
        assertNotNull("User A profile must remain intact after User B removal", store.getProfile(parcelId))
        assertTrue("Legacy backup key must not be removed by scoped deletion", prefs.contains(backupKey))
    }
}
