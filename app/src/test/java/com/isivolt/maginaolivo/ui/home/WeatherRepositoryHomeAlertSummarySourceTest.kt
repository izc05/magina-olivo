package com.isivolt.maginaolivo.ui.home

import com.isivolt.maginaolivo.data.repository.WeatherForecastCache
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.domain.weather.RainAlertSettings
import com.isivolt.maginaolivo.domain.weather.WeatherDay
import com.isivolt.maginaolivo.domain.weather.WeatherForecast
import com.isivolt.maginaolivo.domain.weather.WeatherGateway
import com.isivolt.maginaolivo.domain.weather.WeatherMunicipality
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class WeatherRepositoryHomeAlertSummarySourceTest {

    @Test
    fun configuredWeatherAlertsMapToHomeSummary() = runBlocking {
        val repository = WeatherRepository(
            gateway = FakeGateway(Result.success(
                sampleForecast(
                    WeatherDay(
                        date = "2026-09-19",
                        precipitationProbabilityPercent = 85,
                        windMaxKmh = 45.0,
                        temperatureMinC = 8.0,
                    ),
                ),
            )),
            cache = FakeCache(),
        )
        val source = WeatherRepositoryHomeAlertSummarySource(
            repository = repository,
            settingsProvider = {
                RainAlertSettings(
                    municipalityCode = "23902",
                    thresholdPercent = 60,
                    horizonDays = 2,
                    rainAlertEnabled = true,
                    windAlertEnabled = true,
                    windThresholdKmh = 40,
                    frostAlertEnabled = false,
                )
            },
        )

        val summary = source.loadSummary().getOrThrow()

        assertEquals(2, summary.totalCount)
        assertEquals(1, summary.highCount)
        assertEquals("Lluvia", summary.primaryTitle)
        assertEquals("Lluvia 85% · 2026-09-19", summary.primaryDetail)
        assertEquals(2, summary.horizonDays)
        assertFalse(summary.degraded)
    }

    @Test
    fun noThresholdExceededProducesEmptySummary() = runBlocking {
        val repository = WeatherRepository(
            gateway = FakeGateway(Result.success(
                sampleForecast(
                    WeatherDay(
                        date = "2026-09-19",
                        precipitationProbabilityPercent = 10,
                        windMaxKmh = 15.0,
                        temperatureMinC = 12.0,
                    ),
                ),
            )),
            cache = FakeCache(),
        )
        val source = WeatherRepositoryHomeAlertSummarySource(
            repository = repository,
            settingsProvider = {
                RainAlertSettings(
                    municipalityCode = "23902",
                    thresholdPercent = 60,
                    horizonDays = 2,
                )
            },
        )

        val summary = source.loadSummary().getOrThrow()

        assertEquals(0, summary.totalCount)
        assertEquals(0, summary.highCount)
        assertEquals(null, summary.primaryTitle)
        assertEquals(null, summary.primaryDetail)
    }

    private fun sampleForecast(day: WeatherDay): WeatherForecast =
        WeatherForecast(
            municipality = WeatherMunicipality(
                code = "23902",
                name = "Bedmar y Garcíez",
                province = "Jaén",
            ),
            provider = "AEMET OpenData",
            days = listOf(day),
            attribution = "AEMET",
        )

    private class FakeGateway(
        private val result: Result<WeatherForecast>,
    ) : WeatherGateway {
        override suspend fun getForecast(
            municipalityCode: String,
        ): Result<WeatherForecast> = result
    }

    private class FakeCache(
        private var forecast: WeatherForecast? = null,
    ) : WeatherForecastCache {
        override fun read(municipalityCode: String): WeatherForecast? =
            forecast?.takeIf { it.municipality.code == municipalityCode }

        override fun write(forecast: WeatherForecast) {
            this.forecast = forecast
        }
    }
}
