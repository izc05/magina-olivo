package com.isivolt.maginaolivo.data.repository

import android.content.Context
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.domain.weather.FarmWeatherTarget
import com.isivolt.maginaolivo.domain.weather.MaginaWeatherMunicipalities
import com.isivolt.maginaolivo.domain.weather.WeatherTargetSource

class FarmWeatherAssignmentPreferences(
    context: Context,
) {
    private val preferences =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun assignedMunicipalityCode(farmId: String): String? =
        preferences.getString(key(farmId), null)
            ?.takeIf { code -> MaginaWeatherMunicipalities.find(code) != null }

    fun setAssignedMunicipalityCode(
        farmId: String,
        municipalityCode: String?,
    ) {
        preferences.edit().apply {
            if (municipalityCode == null) {
                remove(key(farmId))
            } else {
                require(MaginaWeatherMunicipalities.find(municipalityCode) != null) {
                    "WEATHER_MUNICIPALITY_NOT_SUPPORTED"
                }
                putString(key(farmId), municipalityCode)
            }
        }.apply()
    }

    fun resolve(
        farm: FarmEntity,
        fallbackMunicipalityCode: String,
    ): FarmWeatherTarget {
        val assigned = assignedMunicipalityCode(farm.id)
        val fallback = MaginaWeatherMunicipalities.find(fallbackMunicipalityCode)
            ?.code
            ?: MaginaWeatherMunicipalities.default.code

        return FarmWeatherTarget(
            farmId = farm.id,
            farmName = farm.name,
            municipalityCode = assigned ?: fallback,
            source = if (assigned != null) {
                WeatherTargetSource.MANUAL
            } else {
                WeatherTargetSource.GLOBAL_FALLBACK
            },
        )
    }

    /*
     * Integration hook for Catastro.
     *
     * When the map/cadastral module can resolve the farm municipality from its
     * definitive geometry, it can write that municipality here without changing
     * the alert engine. The source can then be promoted to CATASTRO in a later
     * integration commit.
     */

    private fun key(farmId: String): String =
        "farm_" + farmId + "_municipality"

    private companion object {
        const val PREFERENCES_NAME = "magina_farm_weather_assignments"
    }
}
