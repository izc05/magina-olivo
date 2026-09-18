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
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlert
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertEngine
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertKind
import com.isivolt.maginaolivo.domain.weather.WeatherPlanningAlertLevel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private sealed interface PlanningAlertsUiState {
    data object Loading : PlanningAlertsUiState
    data class Ready(val result: WeatherLoadResult) : PlanningAlertsUiState
    data class Error(val message: String) : PlanningAlertsUiState
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
    var state by remember { mutableStateOf<PlanningAlertsUiState>(PlanningAlertsUiState.Loading) }
    var permissionMessage by rememberSaveable { mutableStateOf<String?>(null) }

    fun settingsChanged() {
        preferences.clearLastNotificationKeys()
        settings = preferences.read()
        if (settings.notificationsEnabled) {
            WeatherRainAlertScheduler.checkNow(context)
        }
    }

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
        settings.windThresholdKmh,
        settings.frostThresholdC,
        settings.horizonDays,
        settings.rainAlertEnabled,
        settings.windAlertEnabled,
        settings.frostAlertEnabled,
        refreshKey,
    ) {
        state = PlanningAlertsUiState.Loading
        state = repository.loadForecast(settings.municipalityCode)
            .fold(
                onSuccess = { PlanningAlertsUiState.Ready(it) },
                onFailure = {
                    PlanningAlertsUiState.Error(
                        it.message ?: "No se ha podido consultar la predicción.",
                    )
                },
            )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Avisos meteorológicos") },
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
                        text = "Configura avisos de lluvia, viento y temperatura mínima a partir de la predicción municipal de AEMET.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = "Son avisos de planificación de Mágina Olivo. No son avisos oficiales amarillo, naranja o rojo de AEMET y no sustituyen la observación local de la finca.",
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
                                    settingsChanged()
                                },
                                label = { Text(municipality.name) },
                            )
                        }
                    }
                }
            }

            item {
                SectionCard(title = "Tipos de aviso") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = settings.rainAlertEnabled,
                            onClick = {
                                preferences.setRainAlertEnabled(!settings.rainAlertEnabled)
                                settingsChanged()
                            },
                            label = { Text("Lluvia") },
                        )
                        FilterChip(
                            selected = settings.windAlertEnabled,
                            onClick = {
                                preferences.setWindAlertEnabled(!settings.windAlertEnabled)
                                settingsChanged()
                            },
                            label = { Text("Viento") },
                        )
                        FilterChip(
                            selected = settings.frostAlertEnabled,
                            onClick = {
                                preferences.setFrostAlertEnabled(!settings.frostAlertEnabled)
                                settingsChanged()
                            },
                            label = { Text("Helada") },
                        )
                    }
                    Text(
                        text = "Viento y helada están desactivados inicialmente y solo se activan cuando tú los seleccionas.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            if (settings.rainAlertEnabled) {
                item {
                    SectionCard(title = "Lluvia") {
                        Text(
                            text = "Avisar desde ${settings.thresholdPercent}% de probabilidad",
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
                                        settingsChanged()
                                    },
                                    label = { Text("$threshold%") },
                                )
                            }
                        }
                    }
                }
            }

            if (settings.windAlertEnabled) {
                item {
                    SectionCard(title = "Viento") {
                        Text(
                            text = "Avisar desde ${settings.windThresholdKmh} km/h",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf(30, 40, 50, 60).forEach { threshold ->
                                FilterChip(
                                    selected = settings.windThresholdKmh == threshold,
                                    onClick = {
                                        preferences.setWindThresholdKmh(threshold)
                                        settingsChanged()
                                    },
                                    label = { Text("$threshold") },
                                )
                            }
                        }
                        Text(
                            text = "Mágina Olivo usa el máximo diario previsto. A partir de 60 km/h se etiqueta como nivel alto interno.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            if (settings.frostAlertEnabled) {
                item {
                    SectionCard(title = "Temperatura mínima / helada") {
                        Text(
                            text = "Avisar si la mínima prevista es ≤ ${settings.frostThresholdC} °C",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf(0, 1, 2, 3).forEach { threshold ->
                                FilterChip(
                                    selected = settings.frostThresholdC == threshold,
                                    onClick = {
                                        preferences.setFrostThresholdC(threshold)
                                        settingsChanged()
                                    },
                                    label = { Text("$threshold °C") },
                                )
                            }
                        }
                        Text(
                            text = "0 °C o menos se etiqueta como nivel alto interno. Entre 1 °C y el umbral elegido se muestra como posible riesgo, porque una predicción municipal no representa exactamente cada parcela.",
                            style = MaterialTheme.typography.bodySmall,
                        )
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
                                    settingsChanged()
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
                            "Activadas. Mágina Olivo revisará periódicamente solo los tipos de aviso que hayas seleccionado."
                        } else {
                            "Desactivadas. Los avisos siguen visibles dentro de la app."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    if (settings.notificationsEnabled) {
                        Button(
                            onClick = {
                                preferences.setNotificationsEnabled(false)
                                preferences.clearLastNotificationKeys()
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
                PlanningAlertsUiState.Loading -> {
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

                is PlanningAlertsUiState.Error -> {
                    item {
                        SectionCard(title = "Previsión no disponible") {
                            Text(current.message)
                            Button(onClick = { refreshKey += 1 }) {
                                Text("Reintentar")
                            }
                        }
                    }
                }

                is PlanningAlertsUiState.Ready -> {
                    val alerts = WeatherPlanningAlertEngine.evaluate(
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
                                    "La predicción mostrada procede de caché. Puede consultarse, pero no se generan nuevas notificaciones automáticas con datos degradados.",
                                )
                            }
                        }
                    }

                    if (alerts.isEmpty()) {
                        item {
                            SectionCard(title = "Sin avisos activos") {
                                Text(
                                    "Ninguno de los tipos activados supera su umbral dentro del horizonte seleccionado.",
                                )
                            }
                        }
                    } else {
                        items(
                            items = alerts,
                            key = { it.kind.name + "|" + it.date },
                        ) { alert ->
                            PlanningAlertCard(alert)
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
private fun PlanningAlertCard(
    alert: WeatherPlanningAlert,
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
                text = alertTitle(alert),
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = alertValue(alert),
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = "${alert.municipality.name} · ${formatAlertDate(alert.date)}",
                style = MaterialTheme.typography.bodyLarge,
            )
            Text(
                text = alertAdvice(alert),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

private fun alertTitle(alert: WeatherPlanningAlert): String =
    when (alert.kind) {
        WeatherPlanningAlertKind.RAIN ->
            if (alert.level == WeatherPlanningAlertLevel.HIGH) {
                "Alta probabilidad de lluvia"
            } else {
                "Lluvia prevista"
            }
        WeatherPlanningAlertKind.WIND ->
            if (alert.level == WeatherPlanningAlertLevel.HIGH) {
                "Viento fuerte previsto"
            } else {
                "Aviso de viento"
            }
        WeatherPlanningAlertKind.FROST ->
            if (alert.level == WeatherPlanningAlertLevel.HIGH) {
                "Temperatura mínima de helada"
            } else {
                "Posible riesgo de helada"
            }
    }

private fun alertValue(alert: WeatherPlanningAlert): String =
    when (alert.kind) {
        WeatherPlanningAlertKind.RAIN -> "${alert.value.toInt()}%"
        WeatherPlanningAlertKind.WIND -> "${formatAlertNumber(alert.value)} km/h"
        WeatherPlanningAlertKind.FROST -> "${formatAlertNumber(alert.value)} °C"
    }

private fun alertAdvice(alert: WeatherPlanningAlert): String =
    when (alert.kind) {
        WeatherPlanningAlertKind.RAIN ->
            "Revisa la previsión antes de planificar trabajos en el olivar."
        WeatherPlanningAlertKind.WIND ->
            "Comprueba el viento local antes de realizar trabajos expuestos."
        WeatherPlanningAlertKind.FROST ->
            "La mínima municipal no representa exactamente la parcela; confirma la situación local."
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

private fun formatAlertNumber(value: Double): String =
    if (value % 1.0 == 0.0) {
        value.toInt().toString()
    } else {
        String.format(Locale("es", "ES"), "%.1f", value)
    }
