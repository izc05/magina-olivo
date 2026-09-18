package com.isivolt.maginaolivo.ui.shell

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.ui.MaginaOlivoApp

enum class MainDestination(
    val label: String,
) {
    HOME("Inicio"),
    OLIVE_GROVE("Mi Olivar"),
    REGISTER("+ Registrar"),
    CALENDAR("Calendario"),
    PROFILE("Perfil"),
}

@Composable
fun MaginaAppShell() {
    var destination by remember { mutableStateOf(MainDestination.HOME) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                MainDestination.entries.forEach { item ->
                    NavigationBarItem(
                        selected = destination == item,
                        onClick = { destination = item },
                        icon = {
                            Text(
                                text = destinationGlyph(item),
                                style = MaterialTheme.typography.labelLarge,
                            )
                        },
                        label = {
                            Text(
                                text = item.label,
                                maxLines = 1,
                            )
                        },
                    )
                }
            }
        },
    ) { innerPadding ->
        when (destination) {
            MainDestination.HOME -> HomeShellScreen(innerPadding)
            MainDestination.OLIVE_GROVE -> {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    MaginaOlivoApp()
                }
            }
            MainDestination.REGISTER -> PlannedDestinationScreen(
                title = "Registrar",
                body = "Acceso rápido para añadir una actuación, entrega, gasto, documento o nueva tarea de campaña.",
                innerPadding = innerPadding,
            )
            MainDestination.CALENDAR -> PlannedDestinationScreen(
                title = "Calendario",
                body = "Vista temporal de trabajos, recordatorios, campaña y próximos avisos del olivar.",
                innerPadding = innerPadding,
            )
            MainDestination.PROFILE -> PlannedDestinationScreen(
                title = "Perfil",
                body = "Preferencias de la aplicación, cuenta, datos y configuración del agricultor.",
                innerPadding = innerPadding,
            )
        }
    }
}

@Composable
private fun HomeShellScreen(
    innerPadding: PaddingValues,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .padding(horizontal = 22.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Text(
            text = "Buenos días",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Tu olivar de un vistazo",
            style = MaterialTheme.typography.headlineLarge,
        )
        Text(
            text = "Inicio queda preparado para tiempo y radar, alertas, mercado del aceite, avisos y accesos rápidos a tus fincas.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        ShellCard(
            title = "Tiempo y radar",
            body = "Resumen meteorológico y avisos por finca.",
        )
        ShellCard(
            title = "Mercado del aceite",
            body = "AOVE, virgen y lampante con evolución cuando la fuente lo permita.",
        )
        ShellCard(
            title = "Mi Olivar",
            body = "Acceso a fincas, parcelas, campañas y actividad.",
        )
    }
}

@Composable
private fun ShellCard(
    title: String,
    body: String,
) {
    Surface(
        shape = RoundedCornerShape(22.dp),
        tonalElevation = 2.dp,
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
            )
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun PlannedDestinationScreen(
    title: String,
    body: String,
    innerPadding: PaddingValues,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineLarge,
            textAlign = TextAlign.Center,
        )
        Text(
            text = body,
            modifier = Modifier.padding(top = 12.dp),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Button(
            onClick = {},
            enabled = false,
            modifier = Modifier.padding(top = 24.dp),
        ) {
            Text("Preparado para integración")
        }
    }
}

private fun destinationGlyph(destination: MainDestination): String = when (destination) {
    MainDestination.HOME -> "⌂"
    MainDestination.OLIVE_GROVE -> "◉"
    MainDestination.REGISTER -> "+"
    MainDestination.CALENDAR -> "□"
    MainDestination.PROFILE -> "●"
}
