package com.isivolt.maginaolivo.data.repository

import com.isivolt.maginaolivo.domain.weather.MaginaWeatherMunicipalities
import com.isivolt.maginaolivo.domain.weather.WeatherDay
import com.isivolt.maginaolivo.domain.weather.WeatherDeliveryMode
import com.isivolt.maginaolivo.domain.weather.WeatherForecast
import com.isivolt.maginaolivo.domain.weather.WeatherFreshnessStatus
import com.isivolt.maginaolivo.domain.weather.WeatherGateway
import com.isivolt.maginaolivo.domain.weather.WeatherMunicipality
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherRepositoryTest {

    @Test
    fun remoteForecastIsStoredForOfflineUse() = runBlocking {
        val cache = FakeCache()
        val forecast = sampleForecast()
        val repository = WeatherRepository(
            gateway = FakeGateway(Result.success(forecast)),
            cache = cache,
            nowEpochMs = { 1234L },
        )

        val result = repository.loadForecast("23902").getOrThrow()

        assertFalse(result.fromLocalCache)
        assertFalse(result.degraded)
        assertEquals(1234L, result.forecast.savedAtEpochMs)
        assertNotNull(cache.value)
        assertEquals("23902", cache.value?.municipality?.code)
    }

    @Test
    fun providerFailureFallsBackToLastLocalForecast() = runBlocking {
        val cache = FakeCache(sampleForecast().copy(savedAtEpochMs = 1000L))
        val repository = WeatherRepository(
            gateway = FakeGateway(Result.failure(IllegalStateException("AEMET unavailable"))),
            cache = cache,
        )

        val result = repository.loadForecast("23902").getOrThrow()

        assertTrue(result.fromLocalCache)
        assertTrue(result.degraded)
        assertEquals(WeatherDeliveryMode.DEGRADED_CACHE, result.forecast.deliveryMode)
        assertEquals(1000L, result.forecast.savedAtEpochMs)
    }

    @Test
    fun noRemoteAndNoCacheReturnsFailure() = runBlocking {
        val repository = WeatherRepository(
            gateway = null,
            cache = FakeCache(),
        )

        assertTrue(repository.loadForecast("23902").isFailure)
    }

    @Test
    fun canonicalMaginaMunicipalityCodesStayStable() {
        val codes = MaginaWeatherMunicipalities.all.associate { it.name to it.code }

        assertEquals("23902", codes["Bedmar y Garcíez"])
        assertEquals("23053", codes["Jódar"])
        assertEquals("23052", codes["Jimena"])
        assertEquals("23001", codes["Albanchez de Mágina"])
    }

    private fun sampleForecast(): WeatherForecast =
        WeatherForecast(
            municipality = WeatherMunicipality(
                code = "23902",
                name = "Bedmar y Garcíez",
                province = "Jaén",
            ),
            provider = "AEMET OpenData",
            elaboratedAt = "2026-09-18T12:00:00",
            days = listOf(
                WeatherDay(
                    date = "2026-09-18",
                    skyDescription = "Poco nuboso",
                    precipitationProbabilityPercent = 10,
                    temperatureMinC = 16.0,
                    temperatureMaxC = 29.0,
                    windMaxKmh = 20.0,
                    uvMax = 6,
                ),
            ),
            freshnessStatus = WeatherFreshnessStatus.FRESH,
            deliveryMode = WeatherDeliveryMode.LIVE,
        )

    private class FakeCache(
        var value: WeatherForecast? = null,
    ) : WeatherForecastCache {
        override fun read(municipalityCode: String): WeatherForecast? =
            value?.takeIf { it.municipality.code == municipalityCode }

        override fun write(forecast: WeatherForecast) {
            value = forecast
        }
    }

    private class FakeGateway(
        private val result: Result<WeatherForecast>,
    ) : WeatherGateway {
        override suspend fun getForecast(
            municipalityCode: String,
        ): Result<WeatherForecast> = result
    }
}
