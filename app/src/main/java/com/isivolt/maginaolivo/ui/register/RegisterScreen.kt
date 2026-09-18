package com.isivolt.maginaolivo.ui.register

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class RegisterKind(
    val title: String,
    val description: String,
) {
    ACTIVITY(
        title = "Actuación",
        description = "Labores, riego, tratamiento, poda, abonado o cualquier trabajo de campaña.",
    ),
    HARVEST(
        title = "Cosecha / entrega",
        description = "Kilos recogidos, entrega a cooperativa o almazara y rendimiento asociado.",
    ),
    EXPENSE(
        title = "Gasto",
        description = "Compra, servicio, combustible, material u otro coste ligado al olivar.",
    ),
    DOCUMENT(
        title = "Documento",
        description = "Factura, justificante, análisis, fotografía o archivo de campaña.",
    ),
    NOTE(
        title = "Nota / tarea",
        description = "Recordatorio, observación o tarea pendiente para una finca o parcela.",
    ),
}

@Composable
fun RegisterScreen(
    innerPadding: PaddingValues,
) {
    var selected by remember { mutableStateOf(RegisterKind.ACTIVITY) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(
                text = "Registrar",
                style = MaterialTheme.typography.headlineLarge,
            )
        }
        item {
            Text(
                text = "Elige qué quieres añadir. La estructura queda preparada para conectarse después con campaña, finca y parcela sin duplicar lógica.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        items(RegisterKind.entries) { kind ->
            RegisterKindCard(
                kind = kind,
                selected = selected == kind,
                onSelect = { selected = kind },
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = selected.title,
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text(
                        text = "Formulario preparado para integración funcional.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = "No se guarda ningún dato desde esta pantalla todavía.",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}

@Composable
private fun RegisterKindCard(
    kind: RegisterKind,
    selected: Boolean,
    onSelect: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onSelect,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Text(
                    text = kind.title,
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = kind.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            AssistChip(
                onClick = onSelect,
                label = { Text(if (selected) "Elegido" else "Elegir") },
                modifier = Modifier
                    .padding(start = 12.dp)
                    .width(86.dp),
            )
        }
    }
}
