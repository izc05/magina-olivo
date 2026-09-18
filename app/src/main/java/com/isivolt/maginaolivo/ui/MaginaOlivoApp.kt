package com.isivolt.maginaolivo.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.MaginaOlivoApplication
import com.isivolt.maginaolivo.data.remote.SupabaseCatastroParcelGateway
import com.isivolt.maginaolivo.data.remote.SupabaseProvider
import com.isivolt.maginaolivo.ui.catastro.AddParcelByReferenceScreen
import com.isivolt.maginaolivo.ui.map.PlotMapScreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MaginaOlivoApp() {
    val application = LocalContext.current.applicationContext as MaginaOlivoApplication
    val repository = remember(application) { application.fieldRepository }
    val farmsFlow = remember(repository) { repository.observeFarms() }
    val plotsFlow = remember(repository) { repository.observePlots() }

    val farms by farmsFlow.collectAsState(initial = emptyList())
    val plots by plotsFlow.collectAsState(initial = emptyList())

    var showMap by rememberSaveable { mutableStateOf(false) }
    var showAddParcel by rememberSaveable { mutableStateOf(false) }
    var pendingCatastroReference by rememberSaveable { mutableStateOf<String?>(null) }
    var showCreateFarm by rememberSaveable { mutableStateOf(false) }
    var farmName by rememberSaveable { mutableStateOf("") }
    var farmError by rememberSaveable { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val catastroGateway = remember {
        SupabaseProvider.client?.let(::SupabaseCatastroParcelGateway)
    }

    MaterialTheme {
        if (showAddParcel) {
            AddParcelByReferenceScreen(
                farms = farms,
                repository = repository,
                gateway = catastroGateway,
                initialReference = pendingCatastroReference,
                onBack = {
                    pendingCatastroReference = null
                    showAddParcel = false
                },
                onSaved = {
                    pendingCatastroReference = null
                    showAddParcel = false
                },
            )
        } else if (showMap) {
            PlotMapScreen(
                plots = plots,
                catastroGateway = catastroGateway,
                onCatastroReferenceSelected = { reference ->
                    pendingCatastroReference = reference
                    showAddParcel = true
                },
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
                        text = "Mis fincas: ${farms.size}",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    if (farms.isEmpty()) {
                        Text("Todavía no has creado ninguna finca.")
                    } else {
                        farms.take(6).forEach { farm ->
                            Text("• ${farm.name}")
                        }
                        if (farms.size > 6) {
                            Text("+ ${farms.size - 6} fincas más")
                        }
                    }

                    Text(
                        text = "Parcelas guardadas localmente: ${plots.size}",
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    Button(onClick = { showCreateFarm = true }) {
                        Text("Crear finca")
                    }

                    Button(onClick = { showMap = true }) {
                        Text("Abrir mapa de parcelas")
                    }

                    Button(
                        onClick = {
                            pendingCatastroReference = null
                            showAddParcel = true
                        },
                        enabled = farms.isNotEmpty(),
                    ) {
                        Text(
                            if (farms.isEmpty()) {
                                "Crea una finca antes de añadir parcelas"
                            } else {
                                "Añadir parcela"
                            },
                        )
                    }
                }
            }
        }

        if (showCreateFarm) {
            AlertDialog(
                onDismissRequest = {
                    showCreateFarm = false
                    farmError = null
                },
                title = { Text("Nueva finca") },
                text = {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text("Pon un nombre que te permita reconocerla rápidamente.")
                        OutlinedTextField(
                            value = farmName,
                            onValueChange = {
                                farmName = it
                                farmError = null
                            },
                            singleLine = true,
                            label = { Text("Nombre de la finca") },
                        )
                        farmError?.let { message ->
                            Text(
                                text = message,
                                color = MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            val name = farmName.trim()
                            if (name.isEmpty()) {
                                farmError = "Escribe un nombre para la finca."
                            } else {
                                scope.launch {
                                    runCatching {
                                        repository.createFarm(name)
                                    }.onSuccess {
                                        farmName = ""
                                        farmError = null
                                        showCreateFarm = false
                                    }.onFailure {
                                        farmError = "No se ha podido crear la finca."
                                    }
                                }
                            }
                        },
                    ) {
                        Text("Crear")
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = {
                            showCreateFarm = false
                            farmError = null
                        },
                    ) {
                        Text("Cancelar")
                    }
                },
            )
        }
    }
}
