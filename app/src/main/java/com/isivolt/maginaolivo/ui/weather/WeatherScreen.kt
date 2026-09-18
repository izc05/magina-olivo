package com.isivolt.maginaolivo.ui.weather

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.repository.FarmWeatherAssignmentPreferences
import com.isivolt.maginaolivo.data.repository.WeatherAlertPreferences
import com.isivolt.maginaolivo.data.repository.WeatherLoadResult
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.data.repository.WeatherRadarRepository
import com.isivolt.maginaolivo.domain.weather.MaginaWeatherMunicipalities
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertEngine
import com.isivolt.maginaolivo.domain.weather.WeatherDay
import com.isivolt.maginaolivo.domain.weather.WeatherFreshnessStatus
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private sealed interface WeatherUiState {
    data object Loading : WeatherUiState
    data class Ready(val result: WeatherLoadResult) : WeatherUiState
    data class Error(val message: String) : WeatherUiState
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeatherScreen(
    repository: WeatherRepository,
    radarRepository: WeatherRadarRepository,
    farms: List<FarmEntity>,
    onBack: () -> Unit,
) {
    val context = LocalContext.current.applicationContext
    val alertPreferences = remember(context) { WeatherAlertPreferences(context) }
    val farmWeatherAssignments = remember(context) {
        FarmWeatherAssignmentPreferences(context)
    }
    var showRadar by rememberSaveable { mutableStateOf(false) }
    var showAlerts by rememberSaveable { mutableStateOf(false) }

    if (showAlerts) {
        WeatherAlertsScreen(
            repository = repository,
            preferences = alertPreferences,
            farms = farms,
            farmAssignments = farmWeatherAssignments,
            onBack = { showAlerts = false },
        )
        return
    }

    if (showRadar) {
        WeatherRadarScreen(
            repository = radarRepository,
            onBack = { showRadar = false },
        )
        return
    }
    var selectedCode by rememberSaveable {
        mutableStateOf(alertPreferences.read().municipalityCode)
    }
    var refreshKey by rememberSaveable { mutableIntStateOf(0) }
    var state by remember(selectedCode) {
        mutableStateOf<WeatherUiState>(WeatherUiState.Loading)
    }

    LaunchedEffect(selectedCode) {
        alertPreferences.setMunicipalityCode(selectedCode)
    }

    LaunchedEffect(selectedCode, refreshKey) {
        state = WeatherUiState.Loading
        state = repository.loadForecast(selectedCode)
            .fold(
                onSuccess = { WeatherUiState.Ready(it) },
                onFailure = {
                    WeatherUiState.Error(
                        it.message ?: "No se ha podido consultar la predicción.",
                    )
                },
            )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tiempo") },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text("Atrás")
                    }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Column(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        text = "Predicción para tu olivar",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Text(
                        text = "Datos oficiales de AEMET. Selecciona el municipio de referencia.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            item {
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(
                        items = MaginaWeatherMunicipalities.all,
                        key = { it.code },
                    ) { municipality ->
                        FilterChip(
                            selected = selectedCode == municipality.code,
                            onClick = { selectedCode = municipality.code },
                            label = { Text(municipality.name) },
                        )
                    }
                }
            }

            when (val current = state) {
                WeatherUiState.Loading -> {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                }

                is WeatherUiState.Error -> {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Text(
                                    text = "No se ha podido cargar el tiempo",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    text = current.message,
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Button(onClick = { refreshKey += 1 }) {
                                    Text("Reintentar")
                                }
                            }
                        }
                    }
                }

                is WeatherUiState.Ready -> {
                    val result = current.result
                    val forecast = result.forecast
                    val today = forecast.days.firstOrNull()

                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    text = forecast.municipality.name,
                                    style = MaterialTheme.typography.headlineMedium,
                                )

                                if (result.degraded) {
                                    Text(
                                        text = if (result.fromLocalCache) "Sin datos nuevos · última predicción guardada en el móvil" else "AEMET temporalmente no disponible · datos de respaldo",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.error,
                                    )
                                } else {
                                    Text(
                                        text = freshnessLabel(
                                            forecast.freshnessStatus,
                                            forecast.freshnessAgeHours,
                                        ),
                                        style = MaterialTheme.typography.labelLarge,
                                    )
                                }

                                today?.let { day ->
                                    Text(
                                        text = day.skyDescription ?: "Predicción disponible",
                                        style = MaterialTheme.typography.titleLarge,
                                    )
                                    Text(
                                        text = temperatureLabel(day),
                                        style = MaterialTheme.typography.displaySmall,
                                    )
                                    Text(
                                        text = detailsLabel(day),
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                }

                                Text(
                                    text = "Fuente: ${forecast.attribution}",
                                    style = MaterialTheme.typography.labelMedium,
                                )

                                forecast.scopeNote?.let { note ->
                                    Text(
                                        text = note,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                        }
                    }

                    item {
                        val alertSettings = alertPreferences.read().copy(
                            municipalityCode = selectedCode,
                        )
                        val planningAlerts = WeatherPlanningAlertEngine.evaluate(
                            forecast = forecast,
                            settings = alertSettings,
                        )

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    text = "Avisos meteorológicos",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    text = if (planningAlerts.isEmpty()) {
                                        "Sin avisos activos con la configuración actual."
                                    } else {
                                        "${planningAlerts.size} aviso(s) dentro de los próximos ${alertSettings.horizonDays} días."
                                    },
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Button(onClick = { showAlerts = true }) {
                                    Text("Configurar avisos meteorológicos")
                                }
                            }
                        }
                    }

                    item {
                        Button(
                            onClick = { showRadar = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                        ) {
                            Text("Abrir radar de lluvia")
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = "Próximos días",
                                style = MaterialTheme.typography.titleLarge,
                            )
                            TextButton(onClick = { refreshKey += 1 }) {
                                Text("Actualizar")
                            }
                        }
                    }

                    items(
                        items = forecast.days,
                        key = { it.date },
                    ) { day ->
                        ForecastDayCard(day)
                    }

                    item {
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ForecastDayCard(
    day: WeatherDay,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = formatDate(day.date),
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = temperatureLabel(day),
                    style = MaterialTheme.typography.titleMedium,
                )
            }

            Text(
                text = day.skyDescription ?: "Sin descripción",
                style = MaterialTheme.typography.bodyLarge,
            )
            Text(
                text = detailsLabel(day),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

private fun temperatureLabel(day: WeatherDay): String {
    val min = day.temperatureMinC?.let(::formatNumber) ?: "—"
    val max = day.temperatureMaxC?.let(::formatNumber) ?: "—"
    return "$min° / $max°"
}

private fun detailsLabel(day: WeatherDay): String {
    val rain = day.precipitationProbabilityPercent?.let { "$it%" } ?: "—"
    val wind = day.windMaxKmh?.let { "${formatNumber(it)} km/h" } ?: "—"
    val uv = day.uvMax?.let { " · UV $it" } ?: ""
    return "Lluvia $rain · Viento máx. $wind$uv"
}

private fun freshnessLabel(
    status: WeatherFreshnessStatus,
    ageHours: Double?,
): String {
    val age = ageHours?.let { " · ${formatNumber(it)} h" }.orEmpty()
    return when (status) {
        WeatherFreshnessStatus.FRESH -> "AEMET actualizado$age"
        WeatherFreshnessStatus.AGING -> "AEMET pendiente de actualización$age"
        WeatherFreshnessStatus.STALE -> "Predicción antigua$age"
        WeatherFreshnessStatus.UNKNOWN -> "Hora de elaboración no disponible"
    }
}

private fun formatDate(value: String): String =
    runCatching {
        val formatter = DateTimeFormatter.ofPattern(
            "EEE d MMM",
            Locale("es", "ES"),
        )
        LocalDate.parse(value.take(10)).format(formatter)
            .replaceFirstChar { it.uppercase(Locale("es", "ES")) }
    }.getOrDefault(value)

private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) {
        value.toInt().toString()
    } else {
        String.format(Locale("es", "ES"), "%.1f", value)
    }
