package com.isivolt.maginaolivo.ui.home

import com.isivolt.maginaolivo.data.repository.WeatherForecastCache
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.domain.weather.WeatherDay
import com.isivolt.maginaolivo.domain.weather.WeatherForecast
import com.isivolt.maginaolivo.domain.weather.WeatherFreshnessStatus
import com.isivolt.maginaolivo.domain.weather.WeatherGateway
import com.isivolt.maginaolivo.domain.weather.WeatherMunicipality
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherRepositoryHomeSummarySourceTest {

    @Test
    fun liveForecastMapsToHomeSummary() = runBlocking {
        val forecast = sampleForecast()
        val repository = WeatherRepository(
            gateway = FakeGateway(Result.success(forecast)),
            cache = FakeCache(),
            nowEpochMs = { 1234L },
        )
        val source = WeatherRepositoryHomeSummarySource(
            repository = repository,
            municipalityCode = { "23902" },
        )

        val summary = source.loadSummary().getOrThrow()

        assertEquals("Bedmar y Garcíez", summary.municipalityName)
        assertEquals("Poco nuboso", summary.skyDescription)
        assertEquals(16.0, summary.temperatureMinC)
        assertEquals(29.0, summary.temperatureMaxC)
        assertEquals(10, summary.precipitationProbabilityPercent)
        assertEquals("AEMET", summary.providerLabel)
        assertEquals("Actualizado · 1,5 h", summary.freshnessLabel)
        assertFalse(summary.degraded)
    }

    @Test
    fun providerFailureMapsCachedForecastAsDegraded() = runBlocking {
        val cached = sampleForecast()
        val repository = WeatherRepository(
            gateway = FakeGateway(Result.failure(IllegalStateException("offline"))),
            cache = FakeCache(cached),
        )
        val source = WeatherRepositoryHomeSummarySource(
            repository = repository,
            municipalityCode = { "23902" },
        )

        val summary = source.loadSummary().getOrThrow()

        assertEquals("Bedmar y Garcíez", summary.municipalityName)
        assertEquals("Última predicción guardada", summary.freshnessLabel)
        assertTrue(summary.degraded)
    }

    private fun sampleForecast(): WeatherForecast =
        WeatherForecast(
            municipality = WeatherMunicipality(
                code = "23902",
                name = "Bedmar y Garcíez",
                province = "Jaén",
            ),
            provider = "AEMET OpenData",
            days = listOf(
                WeatherDay(
                    date = "2026-09-19",
                    skyDescription = "Poco nuboso",
                    precipitationProbabilityPercent = 10,
                    temperatureMinC = 16.0,
                    temperatureMaxC = 29.0,
                ),
            ),
            freshnessStatus = WeatherFreshnessStatus.FRESH,
            freshnessAgeHours = 1.5,
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
