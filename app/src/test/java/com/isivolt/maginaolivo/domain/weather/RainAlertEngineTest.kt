package com.isivolt.maginaolivo.domain.weather

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RainAlertEngineTest {

    @Test
    fun onlyDaysInsideConfiguredHorizonCanTrigger() {
        val forecast = forecast(
            40,
            70,
            95,
        )

        val alerts = RainAlertEngine.evaluate(
            forecast = forecast,
            settings = RainAlertSettings(
                municipalityCode = "23902",
                thresholdPercent = 60,
                horizonDays = 2,
            ),
        )

        assertEquals(1, alerts.size)
        assertEquals("2026-09-19", alerts.single().date)
        assertEquals(70, alerts.single().precipitationProbabilityPercent)
    }

    @Test
    fun thresholdBoundaryIsIncluded() {
        val alerts = RainAlertEngine.evaluate(
            forecast = forecast(60),
            settings = RainAlertSettings(
                municipalityCode = "23902",
                thresholdPercent = 60,
                horizonDays = 2,
            ),
        )

        assertEquals(1, alerts.size)
        assertEquals(RainAlertLevel.NOTICE, alerts.single().level)
    }

    @Test
    fun eightyPercentOrMoreIsHighProbability() {
        val alerts = RainAlertEngine.evaluate(
            forecast = forecast(80),
            settings = RainAlertSettings(
                municipalityCode = "23902",
                thresholdPercent = 60,
                horizonDays = 2,
            ),
        )

        assertEquals(RainAlertLevel.HIGH, alerts.single().level)
    }

    @Test
    fun missingProbabilityNeverCreatesAlert() {
        val forecast = WeatherForecast(
            municipality = municipality(),
            provider = "AEMET OpenData",
            days = listOf(
                WeatherDay(
                    date = "2026-09-18",
                    precipitationProbabilityPercent = null,
                ),
            ),
        )

        val alerts = RainAlertEngine.evaluate(
            forecast = forecast,
            settings = RainAlertSettings(),
        )

        assertTrue(alerts.isEmpty())
    }

    @Test
    fun primaryPrefersNearestTriggeredDay() {
        val alerts = RainAlertEngine.evaluate(
            forecast = forecast(65, 95),
            settings = RainAlertSettings(
                municipalityCode = "23902",
                thresholdPercent = 60,
                horizonDays = 2,
            ),
        )

        assertEquals("2026-09-18", RainAlertEngine.primary(alerts)?.date)
    }

    private fun forecast(
        vararg probabilities: Int,
    ): WeatherForecast =
        WeatherForecast(
            municipality = municipality(),
            provider = "AEMET OpenData",
            days = probabilities.mapIndexed { index, probability ->
                WeatherDay(
                    date = "2026-09-${18 + index}",
                    precipitationProbabilityPercent = probability,
                )
            },
        )

    private fun municipality(): WeatherMunicipality =
        WeatherMunicipality(
            code = "23902",
            name = "Bedmar y Garcíez",
            province = "Jaén",
        )
}
