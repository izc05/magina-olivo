package com.isivolt.maginaolivo.ui.weather

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.data.repository.WeatherRadarRepository
import com.isivolt.maginaolivo.domain.weather.WeatherRadarFeed
import com.isivolt.maginaolivo.domain.weather.WeatherRadarFrame
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.delay

private sealed interface RadarUiState {
    data object Loading : RadarUiState
    data class Ready(val feed: WeatherRadarFeed) : RadarUiState
    data class Error(val message: String) : RadarUiState
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeatherRadarScreen(
    repository: WeatherRadarRepository,
    onBack: () -> Unit,
) {
    var refreshKey by rememberSaveable { mutableIntStateOf(0) }
    var state by remember { mutableStateOf<RadarUiState>(RadarUiState.Loading) }
    var selectedIndex by rememberSaveable { mutableIntStateOf(0) }
    var isPlaying by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(refreshKey) {
        state = RadarUiState.Loading
        state = repository.loadFeed().fold(
            onSuccess = { feed ->
                selectedIndex = (feed.frames.size - 1).coerceAtLeast(0)
                RadarUiState.Ready(feed)
            },
            onFailure = { error ->
                RadarUiState.Error(
                    error.message ?: "No se ha podido cargar el radar.",
                )
            },
        )
    }

    val ready = state as? RadarUiState.Ready
    val frames = ready?.feed?.frames.orEmpty()

    LaunchedEffect(isPlaying, frames.size) {
        if (!isPlaying || frames.size < 2) return@LaunchedEffect

        while (isPlaying) {
            delay(900)
            selectedIndex = if (selectedIndex >= frames.lastIndex) {
                0
            } else {
                selectedIndex + 1
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Radar de lluvia") },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text("Atrás")
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            isPlaying = false
                            refreshKey += 1
                        },
                    ) {
                        Text("Actualizar")
                    }
                },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "Radar observado AEMET",
                style = MaterialTheme.typography.headlineSmall,
            )
            Text(
                text = "Muestra el movimiento reciente de la precipitación. No es una predicción futura.",
                style = MaterialTheme.typography.bodyMedium,
            )

            when (val current = state) {
                RadarUiState.Loading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 260.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is RadarUiState.Error -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier.padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(
                                text = "Radar no disponible",
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(current.message)
                            Button(onClick = { refreshKey += 1 }) {
                                Text("Reintentar")
                            }
                        }
                    }
                }

                is RadarUiState.Ready -> {
                    val feed = current.feed

                    if (feed.frames.isEmpty()) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    text = "Aún no hay fotogramas",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    text = when (feed.captureStatus) {
                                        "not-configured" ->
                                            "Falta configurar la clave AEMET en el backend."
                                        "unavailable" ->
                                            feed.captureMessage
                                                ?: "AEMET no está disponible temporalmente."
                                        else ->
                                            "El historial se irá creando al consultar el radar."
                                    },
                                )
                            }
                        }
                    } else {
                        val safeIndex = selectedIndex.coerceIn(0, feed.frames.lastIndex)
                        val selectedFrame = feed.frames[safeIndex]

                        RadarFrameImage(
                            frame = selectedFrame,
                            repository = repository,
                        )

                        Text(
                            text = "Observación: ${formatRadarTime(selectedFrame.capturedAt)}",
                            style = MaterialTheme.typography.titleMedium,
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Button(
                                onClick = {
                                    selectedIndex = (safeIndex - 1).coerceAtLeast(0)
                                    isPlaying = false
                                },
                                enabled = safeIndex > 0,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Anterior")
                            }

                            Button(
                                onClick = { isPlaying = !isPlaying },
                                enabled = feed.frames.size > 1,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text(if (isPlaying) "Pausar" else "Reproducir")
                            }

                            Button(
                                onClick = {
                                    selectedIndex =
                                        (safeIndex + 1).coerceAtMost(feed.frames.lastIndex)
                                    isPlaying = false
                                },
                                enabled = safeIndex < feed.frames.lastIndex,
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Siguiente")
                            }
                        }

                        Text(
                            text = "Fotograma ${safeIndex + 1} de ${feed.frames.size}",
                            style = MaterialTheme.typography.labelLarge,
                        )

                        if (feed.captureStatus == "unavailable") {
                            Text(
                                text = "AEMET no ha podido actualizarse; se mantiene el historial disponible.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                            )
                        }

                        Text(
                            text = "Fuente: ${feed.attribution}",
                            style = MaterialTheme.typography.labelMedium,
                        )
                        Text(
                            text = feed.scopeNote,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RadarFrameImage(
    frame: WeatherRadarFrame,
    repository: WeatherRadarRepository,
) {
    var bitmap by remember(frame.id) { mutableStateOf<Bitmap?>(null) }
    var loading by remember(frame.id) { mutableStateOf(true) }
    var error by remember(frame.id) { mutableStateOf<String?>(null) }

    LaunchedEffect(frame.id) {
        loading = true
        error = null
        repository.loadBitmap(frame).fold(
            onSuccess = { loaded ->
                bitmap = loaded
            },
            onFailure = { failure ->
                bitmap = null
                error = failure.message ?: "No se ha podido cargar el radar."
            },
        )
        loading = false
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 260.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 260.dp),
            contentAlignment = Alignment.Center,
        ) {
            when {
                loading -> CircularProgressIndicator()
                bitmap != null -> {
                    Image(
                        bitmap = bitmap!!.asImageBitmap(),
                        contentDescription = "Radar nacional de precipitación AEMET",
                        modifier = Modifier.fillMaxWidth(),
                        contentScale = ContentScale.Fit,
                    )
                }
                else -> Text(
                    text = error ?: "Fotograma no disponible",
                    modifier = Modifier.padding(20.dp),
                )
            }
        }
    }
}

private fun formatRadarTime(value: String): String =
    runCatching {
        val formatter = DateTimeFormatter.ofPattern("HH:mm")
            .withZone(ZoneId.systemDefault())
        formatter.format(Instant.parse(value))
    }.getOrDefault(value)
