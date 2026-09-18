package com.isivolt.maginaolivo.domain.weather

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherPlanningAlertEngineTest {

    @Test
    fun windAlertIsOptInAndUsesConfiguredThreshold() {
        val forecast = sampleForecast(
            WeatherDay(
                date = "2026-09-18",
                windMaxKmh = 45.0,
            ),
        )

        val disabled = WeatherPlanningAlertEngine.evaluate(
            forecast = forecast,
            settings = RainAlertSettings(
                rainAlertEnabled = false,
                windAlertEnabled = false,
            ),
        )
        assertTrue(disabled.isEmpty())

        val enabled = WeatherPlanningAlertEngine.evaluate(
            forecast = forecast,
            settings = RainAlertSettings(
                rainAlertEnabled = false,
                windAlertEnabled = true,
                windThresholdKmh = 40,
            ),
        )

        assertEquals(1, enabled.size)
        assertEquals(WeatherPlanningAlertKind.WIND, enabled.single().kind)
        assertEquals(WeatherPlanningAlertLevel.NOTICE, enabled.single().level)
    }

    @Test
    fun sixtyKmhWindIsHighInternalLevel() {
        val alerts = WeatherPlanningAlertEngine.evaluate(
            forecast = sampleForecast(
                WeatherDay(
                    date = "2026-09-18",
                    windMaxKmh = 60.0,
                ),
            ),
            settings = RainAlertSettings(
                rainAlertEnabled = false,
                windAlertEnabled = true,
                windThresholdKmh = 40,
            ),
        )

        assertEquals(WeatherPlanningAlertLevel.HIGH, alerts.single().level)
    }

    @Test
    fun frostAlertUsesMinimumTemperatureAndIsOptIn() {
        val alerts = WeatherPlanningAlertEngine.evaluate(
            forecast = sampleForecast(
                WeatherDay(
                    date = "2026-09-18",
                    temperatureMinC = 1.0,
                ),
            ),
            settings = RainAlertSettings(
                rainAlertEnabled = false,
                frostAlertEnabled = true,
                frostThresholdC = 2,
            ),
        )

        assertEquals(1, alerts.size)
        assertEquals(WeatherPlanningAlertKind.FROST, alerts.single().kind)
        assertEquals(WeatherPlanningAlertLevel.NOTICE, alerts.single().level)
    }

    @Test
    fun zeroOrBelowFrostIsHighInternalLevel() {
        val alerts = WeatherPlanningAlertEngine.evaluate(
            forecast = sampleForecast(
                WeatherDay(
                    date = "2026-09-18",
                    temperatureMinC = 0.0,
                ),
            ),
            settings = RainAlertSettings(
                rainAlertEnabled = false,
                frostAlertEnabled = true,
                frostThresholdC = 2,
            ),
        )

        assertEquals(WeatherPlanningAlertLevel.HIGH, alerts.single().level)
    }

    @Test
    fun combinedEngineCanReturnThreeDifferentAlertsForSameDay() {
        val alerts = WeatherPlanningAlertEngine.evaluate(
            forecast = sampleForecast(
                WeatherDay(
                    date = "2026-09-18",
                    precipitationProbabilityPercent = 80,
                    windMaxKmh = 62.0,
                    temperatureMinC = -1.0,
                ),
            ),
            settings = RainAlertSettings(
                thresholdPercent = 60,
                rainAlertEnabled = true,
                windAlertEnabled = true,
                windThresholdKmh = 40,
                frostAlertEnabled = true,
                frostThresholdC = 2,
            ),
        )

        assertEquals(
            setOf(
                WeatherPlanningAlertKind.RAIN,
                WeatherPlanningAlertKind.WIND,
                WeatherPlanningAlertKind.FROST,
            ),
            alerts.map { it.kind }.toSet(),
        )
    }

    @Test
    fun horizonStillLimitsAllAlertKinds() {
        val alerts = WeatherPlanningAlertEngine.evaluate(
            forecast = sampleForecast(
                WeatherDay(
                    date = "2026-09-18",
                    windMaxKmh = 20.0,
                ),
                WeatherDay(
                    date = "2026-09-19",
                    windMaxKmh = 20.0,
                ),
                WeatherDay(
                    date = "2026-09-20",
                    windMaxKmh = 80.0,
                ),
            ),
            settings = RainAlertSettings(
                horizonDays = 2,
                rainAlertEnabled = false,
                windAlertEnabled = true,
                windThresholdKmh = 40,
            ),
        )

        assertTrue(alerts.isEmpty())
    }

    private fun sampleForecast(
        vararg days: WeatherDay,
    ): WeatherForecast =
        WeatherForecast(
            municipality = WeatherMunicipality(
                code = "23902",
                name = "Bedmar y Garcíez",
                province = "Jaén",
            ),
            provider = "AEMET OpenData",
            days = days.toList(),
        )
}
