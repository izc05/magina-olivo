package com.isivolt.maginaolivo.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.MaginaOlivoApplication
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.ui.map.PlotMapScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MaginaOlivoApp() {
    val application = LocalContext.current.applicationContext as MaginaOlivoApplication
    val plotsFlow = remember(application) { application.database.plotDao().observeAll() }
    val plots by plotsFlow.collectAsState(initial = emptyList())
    var showMap by rememberSaveable { mutableStateOf(false) }

    MaterialTheme {
        if (showMap) {
            PlotMapScreen(
                plots = plots,
                onBack = { showMap = false },
            )
        } else {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Mágina Olivo") },
                    )
                },
            ) { innerPadding ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(
                        text = "Mi Campo",
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    Text(
                        text = "Fincas y parcelas disponibles también sin cobertura.",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        text = if (SupabaseProvider.isConfigured) {
                            "Supabase preparado"
                        } else {
                            "Modo local: falta configurar Supabase"
                        },
                        style = MaterialTheme.typography.labelLarge,
                    )
                    Text(
                        text = "Parcelas guardadas localmente: ${plots.size}",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Button(onClick = { showMap = true }) {
                        Text("Abrir mapa de parcelas")
                    }
                    Button(onClick = { }) {
                        Text("Añadir finca o parcela")
                    }
                }
            }
        }
    }
}
