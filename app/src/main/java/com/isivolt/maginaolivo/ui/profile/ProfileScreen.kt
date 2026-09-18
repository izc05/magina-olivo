package com.isivolt.maginaolivo.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ProfileScreen(
    innerPadding: PaddingValues,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Perfil",
            style = MaterialTheme.typography.headlineLarge,
        )
        Text(
            text = "Cuenta, datos, avisos y preferencias de Mágina Olivo.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        ProfileSection(
            title = "Cuenta",
            body = "Identidad y sesión. Se conectará al sistema de autenticación definitivo.",
        )
        ProfileSection(
            title = "Mis datos",
            body = "Exportación, privacidad y control de los datos propios del agricultor.",
        )
        ProfileSection(
            title = "Avisos",
            body = "Preferencias de lluvia, tiempo y notificaciones por finca.",
        )
        ProfileSection(
            title = "Apariencia",
            body = "La aplicación respeta ahora el tema del sistema y la identidad visual canónica.",
        )
        ProfileSection(
            title = "Sincronización",
            body = "Estado local/remoto y diagnóstico de sincronización cuando Gate D esté integrado.",
        )

        Text(
            text = "Ningún ajuste de esta pantalla modifica todavía datos funcionales.",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

@Composable
private fun ProfileSection(
    title: String,
    body: String,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
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
