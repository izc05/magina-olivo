package com.isivolt.maginaolivo.domain.weather

import org.junit.Assert.assertEquals
import org.junit.Test

class FarmWeatherAlertEngineTest {

    @Test
    fun alertKeepsFarmIdentityWhileUsingAssignedMunicipality() {
        val target = FarmWeatherTarget(
            farmId = "farm-1",
            farmName = "El Cerrillo",
            municipalityCode = "23053",
            source = WeatherTargetSource.MANUAL,
        )

        val forecast = WeatherForecast(
            municipality = WeatherMunicipality(
                code = "23053",
                name = "Jódar",
                province = "Jaén",
            ),
            provider = "AEMET OpenData",
            days = listOf(
                WeatherDay(
                    date = "2026-09-19",
                    precipitationProbabilityPercent = 80,
                    windMaxKmh = 65.0,
                    temperatureMinC = -1.0,
                ),
            ),
        )

        val alerts = FarmWeatherAlertEngine.evaluate(
            target = target,
            forecast = forecast,
            settings = RainAlertSettings(
                rainAlertEnabled = true,
                windAlertEnabled = true,
                frostAlertEnabled = true,
            ),
        )

        assertEquals(3, alerts.size)
        alerts.forEach { alert ->
            assertEquals("farm-1", alert.target.farmId)
            assertEquals("El Cerrillo", alert.target.farmName)
            assertEquals("23053", alert.target.municipalityCode)
            assertEquals("Jódar", alert.alert.municipality.name)
        }
    }
}
