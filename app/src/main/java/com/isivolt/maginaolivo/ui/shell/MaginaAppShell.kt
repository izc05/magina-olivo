package com.isivolt.maginaolivo.ui.shell

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.ui.MaginaOlivoApp
import com.isivolt.maginaolivo.ui.calendar.CalendarScreen
import com.isivolt.maginaolivo.ui.home.HomeScreen
import com.isivolt.maginaolivo.ui.home.HomeWeatherSummarySource
import com.isivolt.maginaolivo.ui.profile.ProfileScreen
import com.isivolt.maginaolivo.ui.register.RegisterScreen

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
fun MaginaAppShell(
    weatherSource: HomeWeatherSummarySource? = null,
) {
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
            MainDestination.HOME -> HomeScreen(
                innerPadding = innerPadding,
                onOpenOliveGrove = { destination = MainDestination.OLIVE_GROVE },
                onQuickRegister = { destination = MainDestination.REGISTER },
                weatherSource = weatherSource,
            )
            MainDestination.OLIVE_GROVE -> {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    MaginaOlivoApp()
                }
            }
            MainDestination.REGISTER -> RegisterScreen(innerPadding)
            MainDestination.CALENDAR -> CalendarScreen(innerPadding)
            MainDestination.PROFILE -> ProfileScreen(innerPadding)
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
