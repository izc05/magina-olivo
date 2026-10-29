package com.isivoltpro.maginaolivo.domain.irrigation

import android.content.Context
import androidx.core.content.edit
import com.isivoltpro.maginaolivo.domain.parcel.IrrigationSystem
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import org.json.JSONArray
import org.json.JSONObject

/**
 * Interface for persisting and retrieving farmer-configured irrigation profiles and punctual turns.
 * Operates purely locally without requiring server roundtrips or destructive Room schema migrations.
 */
interface FarmerIrrigationStore {
    fun getProfile(parcelId: UUID): ParcelIrrigationProfile?
    fun getAllProfiles(): Map<UUID, ParcelIrrigationProfile>
    fun saveProfile(profile: ParcelIrrigationProfile)
    fun removeProfile(parcelId: UUID)
    fun addPunctualTurn(turn: PunctualTurn)
    fun updatePunctualTurn(turn: PunctualTurn)
    fun deletePunctualTurn(parcelId: UUID, turnId: UUID)
    fun clear()
}

/**
 * In-memory implementation of [FarmerIrrigationStore] for fast unit and UI testing.
 */
class InMemoryFarmerIrrigationStore : FarmerIrrigationStore {
    private val profiles = ConcurrentHashMap<UUID, ParcelIrrigationProfile>()

    override fun getProfile(parcelId: UUID): ParcelIrrigationProfile? = profiles[parcelId]

    override fun getAllProfiles(): Map<UUID, ParcelIrrigationProfile> = HashMap(profiles)

    override fun saveProfile(profile: ParcelIrrigationProfile) {
        profiles[profile.parcelId] = profile
    }

    override fun removeProfile(parcelId: UUID) {
        profiles.remove(parcelId)
    }

    override fun addPunctualTurn(turn: PunctualTurn) {
        val current = profiles[turn.parcelId] ?: ParcelIrrigationProfile(parcelId = turn.parcelId)
        val updatedList = current.punctualTurns + turn
        profiles[turn.parcelId] = current.copy(punctualTurns = updatedList)
    }

    override fun updatePunctualTurn(turn: PunctualTurn) {
        val current = profiles[turn.parcelId] ?: return
        val updatedList = current.punctualTurns.map { if (it.id == turn.id) turn else it }
        profiles[turn.parcelId] = current.copy(punctualTurns = updatedList)
    }

    override fun deletePunctualTurn(parcelId: UUID, turnId: UUID) {
        val current = profiles[parcelId] ?: return
        val updatedList = current.punctualTurns.filterNot { it.id == turnId }
        profiles[parcelId] = current.copy(punctualTurns = updatedList)
    }

    override fun clear() {
        profiles.clear()
    }
}

/**
 * Android SharedPreferences backed implementation of [FarmerIrrigationStore] for offline persistence.
 */
class AndroidFarmerIrrigationStore(context: Context) : FarmerIrrigationStore {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val memoryCache = ConcurrentHashMap<UUID, ParcelIrrigationProfile>()

    init {
        loadAllFromPrefs()
    }

    private fun loadAllFromPrefs() {
        memoryCache.clear()
        val allEntries = prefs.all
        for ((key, value) in allEntries) {
            if (key.startsWith(KEY_PREFIX_PROFILE) && value is String) {
                runCatching {
                    val json = JSONObject(value)
                    val profile = deserializeProfile(json)
                    memoryCache[profile.parcelId] = profile
                }
            }
        }
    }

    override fun getProfile(parcelId: UUID): ParcelIrrigationProfile? = memoryCache[parcelId]

    override fun getAllProfiles(): Map<UUID, ParcelIrrigationProfile> = HashMap(memoryCache)

    override fun saveProfile(profile: ParcelIrrigationProfile) {
        memoryCache[profile.parcelId] = profile
        val serialized = serializeProfile(profile).toString()
        prefs.edit { putString(KEY_PREFIX_PROFILE + profile.parcelId, serialized) }
    }

    override fun removeProfile(parcelId: UUID) {
        memoryCache.remove(parcelId)
        prefs.edit { remove(KEY_PREFIX_PROFILE + parcelId) }
    }

    override fun addPunctualTurn(turn: PunctualTurn) {
        val current = memoryCache[turn.parcelId] ?: ParcelIrrigationProfile(parcelId = turn.parcelId)
        val updated = current.copy(punctualTurns = current.punctualTurns + turn)
        saveProfile(updated)
    }

    override fun updatePunctualTurn(turn: PunctualTurn) {
        val current = memoryCache[turn.parcelId] ?: return
        val updated = current.copy(punctualTurns = current.punctualTurns.map { if (it.id == turn.id) turn else it })
        saveProfile(updated)
    }

    override fun deletePunctualTurn(parcelId: UUID, turnId: UUID) {
        val current = memoryCache[parcelId] ?: return
        val updated = current.copy(punctualTurns = current.punctualTurns.filterNot { it.id == turnId })
        saveProfile(updated)
    }

    override fun clear() {
        memoryCache.clear()
        prefs.edit { clear() }
    }

    companion object {
        private const val PREFS_NAME = "farmer_irrigation_configs"
        private const val KEY_PREFIX_PROFILE = "profile_"

        internal fun serializeProfile(profile: ParcelIrrigationProfile): JSONObject {
            val root = JSONObject()
            root.put("parcelId", profile.parcelId.toString())

            // Supply
            val supplyObj = JSONObject().apply {
                put("sourceType", profile.supply.sourceType.name)
                put("communityName", profile.supply.communityName ?: "")
                put("sector", profile.supply.sector ?: "")
                put("hydrant", profile.supply.hydrant ?: "")
                put("intakeOrValve", profile.supply.intakeOrValve ?: "")
            }
            root.put("supply", supplyObj)

            // Aforo
            val aforoObj = JSONObject().apply {
                put("measurementMode", profile.aforo.measurementMode.name)
                put("oliveTreeCount", profile.aforo.oliveTreeCount)
                put("emittersPerTree", profile.aforo.emittersPerTree)
                put("emitterFlowLph", profile.aforo.emitterFlowLph)
                put("emitterType", profile.aforo.emitterType.name)
                put("directFlowRate", profile.aforo.directFlowRate ?: -1.0)
                put("directFlowUnit", profile.aforo.directFlowUnit.name)
            }
            root.put("aforo", aforoObj)

            // Weekly slots
            val slotsArray = JSONArray()
            profile.weeklySlots.forEach { (day, slot) ->
                val slotObj = JSONObject().apply {
                    put("dayOfWeek", day.name)
                    put("startHour", slot.startTime.hour)
                    put("startMinute", slot.startTime.minute)
                    put("endHour", slot.endTime.hour)
                    put("endMinute", slot.endTime.minute)
                }
                slotsArray.put(slotObj)
            }
            root.put("weeklySlots", slotsArray)

            // Punctual turns
            val punctualArray = JSONArray()
            profile.punctualTurns.forEach { turn ->
                val pObj = JSONObject().apply {
                    put("id", turn.id.toString())
                    put("parcelId", turn.parcelId.toString())
                    put("date", turn.date.toString())
                    put("startHour", turn.timeSlot.startTime.hour)
                    put("startMinute", turn.timeSlot.startTime.minute)
                    put("endHour", turn.timeSlot.endTime.hour)
                    put("endMinute", turn.timeSlot.endTime.minute)
                    put("reason", turn.reason)
                    put("isCancelled", turn.isCancelled)
                }
                punctualArray.put(pObj)
            }
            root.put("punctualTurns", punctualArray)

            // Tariff
            val tariffObj = JSONObject().apply {
                put("tariffType", profile.tariff.tariffType.name)
                put("variablePricePerUnitMinor", profile.tariff.variablePricePerUnitMinor)
                put("annualCommunityQuotaMinor", profile.tariff.annualCommunityQuotaMinor)
                put("currency", profile.tariff.currency)
            }
            root.put("tariff", tariffObj)

            return root
        }

        internal fun deserializeProfile(json: JSONObject): ParcelIrrigationProfile {
            val parcelId = UUID.fromString(json.getString("parcelId"))

            val supplyObj = json.optJSONObject("supply")
            val supply = if (supplyObj != null) {
                WaterSupplyDetails(
                    sourceType = runCatching { WaterSourceType.valueOf(supplyObj.optString("sourceType")) }.getOrDefault(WaterSourceType.IRRIGATION_COMMUNITY),
                    communityName = supplyObj.optString("communityName").takeIf(String::isNotBlank),
                    sector = supplyObj.optString("sector").takeIf(String::isNotBlank),
                    hydrant = supplyObj.optString("hydrant").takeIf(String::isNotBlank),
                    intakeOrValve = supplyObj.optString("intakeOrValve").takeIf(String::isNotBlank),
                )
            } else WaterSupplyDetails()

            val aforoObj = json.optJSONObject("aforo")
            val aforo = if (aforoObj != null) {
                val directFlow = aforoObj.optDouble("directFlowRate", -1.0).takeIf { it >= 0.0 }
                AforoConfig(
                    measurementMode = runCatching { FlowMeasurementMode.valueOf(aforoObj.optString("measurementMode")) }.getOrDefault(FlowMeasurementMode.CALCULATED_FROM_EMITTERS),
                    oliveTreeCount = aforoObj.optInt("oliveTreeCount", 0),
                    emittersPerTree = aforoObj.optInt("emittersPerTree", 0),
                    emitterFlowLph = aforoObj.optDouble("emitterFlowLph", 0.0),
                    emitterType = runCatching { EmitterType.valueOf(aforoObj.optString("emitterType")) }.getOrDefault(EmitterType.INTEGRATED),
                    directFlowRate = directFlow,
                    directFlowUnit = runCatching { FlowUnit.valueOf(aforoObj.optString("directFlowUnit")) }.getOrDefault(FlowUnit.M3_PER_HOUR),
                )
            } else AforoConfig()

            val weeklySlots = mutableMapOf<DayOfWeek, ScheduledTimeSlot>()
            val slotsArray = json.optJSONArray("weeklySlots")
            if (slotsArray != null) {
                for (i in 0 until slotsArray.length()) {
                    val sObj = slotsArray.getJSONObject(i)
                    val day = runCatching { DayOfWeek.valueOf(sObj.getString("dayOfWeek")) }.getOrNull()
                    if (day != null) {
                        val startTime = LocalTime.of(sObj.optInt("startHour", 0), sObj.optInt("startMinute", 0))
                        val endTime = LocalTime.of(sObj.optInt("endHour", 0), sObj.optInt("endMinute", 0))
                        weeklySlots[day] = ScheduledTimeSlot(startTime, endTime)
                    }
                }
            }

            val punctualTurns = mutableListOf<PunctualTurn>()
            val punctualArray = json.optJSONArray("punctualTurns")
            if (punctualArray != null) {
                for (i in 0 until punctualArray.length()) {
                    val pObj = punctualArray.getJSONObject(i)
                    val id = runCatching { UUID.fromString(pObj.getString("id")) }.getOrDefault(UUID.randomUUID())
                    val pParcelId = runCatching { UUID.fromString(pObj.getString("parcelId")) }.getOrDefault(parcelId)
                    val date = runCatching { LocalDate.parse(pObj.getString("date")) }.getOrDefault(LocalDate.now())
                    val startTime = LocalTime.of(pObj.optInt("startHour", 0), pObj.optInt("startMinute", 0))
                    val endTime = LocalTime.of(pObj.optInt("endHour", 0), pObj.optInt("endMinute", 0))
                    val reason = pObj.optString("reason", "Turno extraordinario")
                    val isCancelled = pObj.optBoolean("isCancelled", false)

                    punctualTurns.add(
                        PunctualTurn(
                            id = id,
                            parcelId = pParcelId,
                            date = date,
                            timeSlot = ScheduledTimeSlot(startTime, endTime),
                            reason = reason,
                            isCancelled = isCancelled,
                        )
                    )
                }
            }

            val tariffObj = json.optJSONObject("tariff")
            val tariff = if (tariffObj != null) {
                WaterTariff(
                    tariffType = runCatching { WaterTariffType.valueOf(tariffObj.optString("tariffType")) }.getOrDefault(WaterTariffType.PER_M3),
                    variablePricePerUnitMinor = tariffObj.optLong("variablePricePerUnitMinor", 0L),
                    annualCommunityQuotaMinor = tariffObj.optLong("annualCommunityQuotaMinor", 0L),
                    currency = tariffObj.optString("currency", "EUR"),
                )
            } else WaterTariff()

            return ParcelIrrigationProfile(
                parcelId = parcelId,
                supply = supply,
                aforo = aforo,
                weeklySlots = weeklySlots,
                punctualTurns = punctualTurns,
                tariff = tariff,
            )
        }
    }
}

