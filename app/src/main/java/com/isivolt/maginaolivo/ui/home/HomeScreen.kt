package com.isivolt.maginaolivo.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen(
    innerPadding: PaddingValues,
    onOpenOliveGrove: () -> Unit,
    onQuickRegister: () -> Unit,
    weatherSource: HomeWeatherSummarySource? = null,
    weatherAlertSource: HomeWeatherAlertSummarySource? = null,
    onOpenWeather: (() -> Unit)? = null,
) {
    var weatherState by remember(weatherSource) {
        mutableStateOf<HomeWeatherCardState>(
            if (weatherSource == null) {
                HomeWeatherCardState.PendingIntegration
            } else {
                HomeWeatherCardState.Loading
            },
        )
    }

    var alertState by remember(weatherAlertSource) {
        mutableStateOf<HomeWeatherAlertCardState>(
            if (weatherAlertSource == null) {
                HomeWeatherAlertCardState.PendingIntegration
            } else {
                HomeWeatherAlertCardState.Loading
            },
        )
    }

    LaunchedEffect(weatherSource) {
        val source = weatherSource ?: return@LaunchedEffect
        weatherState = HomeWeatherCardState.Loading
        weatherState = source.loadSummary()
            .fold(
                onSuccess = { HomeWeatherCardState.Ready(it) },
                onFailure = {
                    HomeWeatherCardState.Error(
                        it.message ?: "No se ha podido cargar el tiempo.",
                    )
                },
            )
    }

    LaunchedEffect(weatherAlertSource) {
        val source = weatherAlertSource ?: return@LaunchedEffect
        alertState = HomeWeatherAlertCardState.Loading
        alertState = source.loadSummary()
            .fold(
                onSuccess = { HomeWeatherAlertCardState.Ready(it) },
                onFailure = {
                    HomeWeatherAlertCardState.Error(
                        it.message ?: "No se han podido calcular los avisos.",
                    )
                },
            )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(
                text = "Mágina Olivo",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }

        item {
            Text(
                text = "Tu olivar de un vistazo",
                style = MaterialTheme.typography.headlineLarge,
            )
        }

        item {
            Text(
                text = "Información útil y accesos directos sin mezclar los datos de tus fincas con servicios externos.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            HomeWeatherCard(state = weatherState)
        }

        onOpenWeather?.let { openWeather ->
            item {
                OutlinedButton(
                    onClick = openWeather,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Abrir tiempo, radar y avisos")
                }
            }
        }

        item {
            HomeWeatherAlertCard(state = alertState)
        }

        item {
            HomeStatusCard(
                eyebrow = "MERCADO DEL ACEITE",
                title = "AOVE, virgen y lampante",
                body = "Precios y evolución se mostrarán por categoría cuando exista una fuente fiable disponible.",
                status = "Fuente pendiente",
            )
        }

        item {
            HomeStatusCard(
                eyebrow = "AVISOS",
                title = "Cooperativa y territorio",
                body = "Espacio preparado para comunicados de tu cooperativa de referencia y avisos territoriales.",
                status = "Sin avisos conectados",
            )
        }

        item {
            Surface(
                shape = RoundedCornerShape(24.dp),
                tonalElevation = 2.dp,
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Accesos rápidos",
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Button(
                        onClick = onOpenOliveGrove,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Abrir Mi Olivar")
                    }
                    OutlinedButton(
                        onClick = onQuickRegister,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Registrar una actividad")
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeStatusCard(
    eyebrow: String,
    title: String,
    body: String,
    status: String,
    emphasized: Boolean = false,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (emphasized) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = eyebrow,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
            )
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = status,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}


@Composable
private fun HomeWeatherCard(
    state: HomeWeatherCardState,
) {
    when (state) {
        HomeWeatherCardState.PendingIntegration -> {
            HomeStatusCard(
                eyebrow = "TIEMPO Y RADAR",
                title = "Meteorología de tus fincas",
                body = "Previsión, radar y avisos se conectarán aquí desde el módulo meteorológico validado.",
                status = "Pendiente de integración",
                emphasized = true,
            )
        }

        HomeWeatherCardState.Loading -> {
            HomeStatusCard(
                eyebrow = "TIEMPO Y RADAR",
                title = "Actualizando meteorología",
                body = "Consultando la predicción disponible para el municipio de referencia.",
                status = "Cargando…",
                emphasized = true,
            )
        }

        is HomeWeatherCardState.Error -> {
            HomeStatusCard(
                eyebrow = "TIEMPO Y RADAR",
                title = "Meteorología no disponible",
                body = state.message,
                status = "Sin datos nuevos",
                emphasized = true,
            )
        }

        is HomeWeatherCardState.Ready -> {
            val summary = state.summary
            val min = summary.temperatureMinC?.let(::formatHomeTemperature) ?: "—"
            val max = summary.temperatureMaxC?.let(::formatHomeTemperature) ?: "—"
            val rain = summary.precipitationProbabilityPercent?.let { "${it}%" } ?: "—"
            val source = if (summary.degraded) {
                "${summary.providerLabel} · caché"
            } else {
                summary.providerLabel
            }

            HomeStatusCard(
                eyebrow = "TIEMPO Y RADAR",
                title = summary.municipalityName,
                body = buildString {
                    append(summary.skyDescription ?: "Predicción disponible")
                    append(" · ")
                    append(min)
                    append("° / ")
                    append(max)
                    append("° · Lluvia ")
                    append(rain)
                },
                status = "${source} · ${summary.freshnessLabel}",
                emphasized = true,
            )
        }
    }
}

private fun formatHomeTemperature(value: Double): String =
    if (value % 1.0 == 0.0) {
        value.toInt().toString()
    } else {
        String.format(java.util.Locale("es", "ES"), "%.1f", value)
    }


@Composable
private fun HomeWeatherAlertCard(
    state: HomeWeatherAlertCardState,
) {
    when (state) {
        HomeWeatherAlertCardState.PendingIntegration -> {
            HomeStatusCard(
                eyebrow = "ALERTAS",
                title = "Lo que merece tu atención",
                body = "Lluvia, viento y helada aparecerán aquí cuando el motor meteorológico esté conectado.",
                status = "Pendiente de integración",
            )
        }

        HomeWeatherAlertCardState.Loading -> {
            HomeStatusCard(
                eyebrow = "ALERTAS",
                title = "Revisando avisos",
                body = "Analizando la previsión y tus umbrales configurados.",
                status = "Calculando…",
            )
        }

        is HomeWeatherAlertCardState.Error -> {
            HomeStatusCard(
                eyebrow = "ALERTAS",
                title = "Avisos no disponibles",
                body = state.message,
                status = "Sin datos nuevos",
            )
        }

        is HomeWeatherAlertCardState.Ready -> {
            val summary = state.summary
            val body = if (summary.totalCount == 0) {
                "No hay avisos de lluvia, viento o helada con la configuración actual."
            } else {
                summary.primaryDetail
                    ?: "${summary.totalCount} aviso(s) meteorológico(s) activo(s)."
            }
            val status = buildString {
                if (summary.totalCount == 0) {
                    append("Sin avisos")
                } else {
                    append("${summary.totalCount} aviso(s)")
                    if (summary.highCount > 0) {
                        append(" · ${summary.highCount} importante(s)")
                    }
                }
                append(" · ${summary.horizonDays} día(s)")
                if (summary.degraded) {
                    append(" · caché")
                }
            }

            HomeStatusCard(
                eyebrow = "ALERTAS",
                title = summary.primaryTitle ?: "Sin avisos meteorológicos",
                body = body,
                status = status,
            )
        }
    }
}
