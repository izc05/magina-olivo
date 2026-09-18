package com.isivolt.maginaolivo.ui.weather

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import com.isivolt.maginaolivo.data.repository.WeatherAlertPreferences
import com.isivolt.maginaolivo.data.repository.WeatherLoadResult
import com.isivolt.maginaolivo.data.repository.WeatherRepository
import com.isivolt.maginaolivo.data.worker.WeatherRainAlertScheduler
import com.isivolt.maginaolivo.domain.weather.MaginaWeatherMunicipalities
import com.isivolt.maginaolivo.domain.weather.RainAlert
import com.isivolt.maginaolivo.domain.weather.RainAlertEngine
import com.isivolt.maginaolivo.domain.weather.RainAlertLevel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private sealed interface RainAlertsUiState {
    data object Loading : RainAlertsUiState
    data class Ready(val result: WeatherLoadResult) : RainAlertsUiState
    data class Error(val message: String) : RainAlertsUiState
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeatherAlertsScreen(
    repository: WeatherRepository,
    preferences: WeatherAlertPreferences,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    var settings by remember { mutableStateOf(preferences.read()) }
    var refreshKey by rememberSaveable { mutableIntStateOf(0) }
    var state by remember { mutableStateOf<RainAlertsUiState>(RainAlertsUiState.Loading) }
    var permissionMessage by rememberSaveable { mutableStateOf<String?>(null) }

    fun enableNotifications() {
        preferences.setNotificationsEnabled(true)
        settings = preferences.read()
        WeatherRainAlertScheduler.schedule(context)
        WeatherRainAlertScheduler.checkNow(context)
        permissionMessage = null
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            enableNotifications()
        } else {
            preferences.setNotificationsEnabled(false)
            settings = preferences.read()
            permissionMessage =
                "Android no ha concedido permiso para notificaciones. Los avisos seguirán visibles dentro de Tiempo."
        }
    }

    LaunchedEffect(
        settings.municipalityCode,
        settings.thresholdPercent,
        settings.horizonDays,
        refreshKey,
    ) {
        state = RainAlertsUiState.Loading
        state = repository.loadForecast(settings.municipalityCode)
            .fold(
                onSuccess = { RainAlertsUiState.Ready(it) },
                onFailure = {
                    RainAlertsUiState.Error(
                        it.message ?: "No se ha podido consultar la predicción.",
                    )
                },
            )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Avisos de lluvia") },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text("Atrás")
                    }
                },
                actions = {
                    TextButton(onClick = { refreshKey += 1 }) {
                        Text("Actualizar")
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
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "Planifica con antelación",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Text(
                        text = "Mágina Olivo puede avisarte cuando la probabilidad diaria de lluvia de AEMET supera el umbral elegido.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = "Estos son avisos de planificación de Mágina Olivo, no avisos oficiales amarillo, naranja o rojo de AEMET.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            item {
                SectionCard(title = "Municipio de referencia") {
                    LazyRow(
                        contentPadding = PaddingValues(vertical = 2.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(
                            items = MaginaWeatherMunicipalities.all,
                            key = { it.code },
                        ) { municipality ->
                            FilterChip(
                                selected = settings.municipalityCode == municipality.code,
                                onClick = {
                                    preferences.setMunicipalityCode(municipality.code)
                                    settings = preferences.read()
                                },
                                label = { Text(municipality.name) },
                            )
                        }
                    }
                }
            }

            item {
                SectionCard(title = "Probabilidad mínima") {
                    Text(
                        text = "Avisar desde ${settings.thresholdPercent}%",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        listOf(50, 60, 70, 80).forEach { threshold ->
                            FilterChip(
                                selected = settings.thresholdPercent == threshold,
                                onClick = {
                                    preferences.setThresholdPercent(threshold)
                                    preferences.setLastNotificationKey(null)
                                    settings = preferences.read()
                                    if (settings.notificationsEnabled) {
                                        WeatherRainAlertScheduler.checkNow(context)
                                    }
                                },
                                label = { Text("$threshold%") },
                            )
                        }
                    }
                }
            }

            item {
                SectionCard(title = "Antelación") {
                    Text(
                        text = "Comprobar los próximos ${settings.horizonDays} días",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        (1..3).forEach { days ->
                            FilterChip(
                                selected = settings.horizonDays == days,
                                onClick = {
                                    preferences.setHorizonDays(days)
                                    preferences.setLastNotificationKey(null)
                                    settings = preferences.read()
                                    if (settings.notificationsEnabled) {
                                        WeatherRainAlertScheduler.checkNow(context)
                                    }
                                },
                                label = { Text(if (days == 1) "1 día" else "$days días") },
                            )
                        }
                    }
                }
            }

            item {
                SectionCard(title = "Notificaciones Android") {
                    Text(
                        text = if (settings.notificationsEnabled) {
                            "Activadas. Mágina Olivo revisará la previsión periódicamente."
                        } else {
                            "Desactivadas. Los avisos siguen disponibles dentro de la app."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    if (settings.notificationsEnabled) {
                        Button(
                            onClick = {
                                preferences.setNotificationsEnabled(false)
                                preferences.setLastNotificationKey(null)
                                WeatherRainAlertScheduler.cancel(context)
                                settings = preferences.read()
                            },
                        ) {
                            Text("Desactivar notificaciones")
                        }
                    } else {
                        Button(
                            onClick = {
                                if (
                                    Build.VERSION.SDK_INT >= 33 &&
                                    context.checkSelfPermission(
                                        Manifest.permission.POST_NOTIFICATIONS,
                                    ) != PackageManager.PERMISSION_GRANTED
                                ) {
                                    permissionLauncher.launch(
                                        Manifest.permission.POST_NOTIFICATIONS,
                                    )
                                } else {
                                    enableNotifications()
                                }
                            },
                        ) {
                            Text("Activar notificaciones")
                        }
                    }

                    permissionMessage?.let { message ->
                        Text(
                            text = message,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }

            when (val current = state) {
                RainAlertsUiState.Loading -> {
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

                is RainAlertsUiState.Error -> {
                    item {
                        SectionCard(title = "Previsión no disponible") {
                            Text(current.message)
                            Button(onClick = { refreshKey += 1 }) {
                                Text("Reintentar")
                            }
                        }
                    }
                }

                is RainAlertsUiState.Ready -> {
                    val alerts = RainAlertEngine.evaluate(
                        forecast = current.result.forecast,
                        settings = settings,
                    )

                    item {
                        Text(
                            text = "Avisos detectados",
                            style = MaterialTheme.typography.titleLarge,
                            modifier = Modifier.padding(horizontal = 20.dp),
                        )
                    }

                    if (current.result.degraded) {
                        item {
                            SectionCard(title = "Datos guardados") {
                                Text(
                                    "La predicción mostrada procede de caché. Puede consultarse, pero no se genera una nueva notificación automática con datos degradados.",
                                )
                            }
                        }
                    }

                    if (alerts.isEmpty()) {
                        item {
                            SectionCard(title = "Sin avisos activos") {
                                Text(
                                    "Ninguno de los días revisados alcanza el ${settings.thresholdPercent}% de probabilidad de lluvia.",
                                )
                            }
                        }
                    } else {
                        items(
                            items = alerts,
                            key = { it.date },
                        ) { alert ->
                            RainAlertCard(alert)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
            )
            content()
        }
    }
}

@Composable
private fun RainAlertCard(
    alert: RainAlert,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = when (alert.level) {
                    RainAlertLevel.HIGH -> "Alta probabilidad de lluvia"
                    RainAlertLevel.NOTICE -> "Lluvia prevista"
                },
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = "${alert.precipitationProbabilityPercent}%",
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = "${alert.municipality.name} · ${formatAlertDate(alert.date)}",
                style = MaterialTheme.typography.bodyLarge,
            )
            Text(
                text = "Revisa la previsión antes de planificar trabajos en el olivar.",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

private fun formatAlertDate(value: String): String =
    runCatching {
        val date = LocalDate.parse(value.take(10))
        val today = LocalDate.now()
        when (date) {
            today -> "Hoy"
            today.plusDays(1) -> "Mañana"
            else -> date.format(
                DateTimeFormatter.ofPattern("EEEE d MMMM", Locale("es", "ES")),
            ).replaceFirstChar { it.uppercase(Locale("es", "ES")) }
        }
    }.getOrDefault(value)
