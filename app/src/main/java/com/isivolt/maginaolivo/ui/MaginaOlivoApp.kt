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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.data.remote.SupabaseProvider

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MaginaOlivoApp() {
    MaterialTheme {
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
                Button(onClick = { }) {
                    Text("Añadir finca o parcela")
                }
            }
        }
    }
}
