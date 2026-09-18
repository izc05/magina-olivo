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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen(
    innerPadding: PaddingValues,
    onOpenOliveGrove: () -> Unit,
    onQuickRegister: () -> Unit,
) {
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
            HomeStatusCard(
                eyebrow = "TIEMPO Y RADAR",
                title = "Meteorología de tus fincas",
                body = "Previsión, radar y avisos se conectarán aquí desde el módulo meteorológico validado.",
                status = "Pendiente de integración",
                emphasized = true,
            )
        }

        item {
            HomeStatusCard(
                eyebrow = "ALERTAS",
                title = "Lo que merece tu atención",
                body = "Lluvia, viento, helada y recordatorios agrícolas aparecerán aquí sin duplicar notificaciones.",
                status = "Sin alertas conectadas",
            )
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
