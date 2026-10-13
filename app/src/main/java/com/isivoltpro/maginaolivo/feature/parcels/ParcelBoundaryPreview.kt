package com.isivoltpro.maginaolivo.feature.parcels

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import com.isivoltpro.maginaolivo.feature.maps.MapBase
import com.isivoltpro.maginaolivo.feature.maps.MapParcel
import com.isivoltpro.maginaolivo.feature.maps.ParcelMap
import com.isivoltpro.maginaolivo.ui.theme.MoShape
import com.isivoltpro.maginaolivo.ui.theme.MoSpacing
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens

/** Only the original stored contour is drawn; imagery availability cannot replace its identity. */
@Composable
internal fun ParcelBoundaryPreview(id: String, name: String, geometry: String) {
    var base by rememberSaveable(id) { mutableStateOf(MapBase.AERIAL) }
    var expanded by rememberSaveable(id) { mutableStateOf(false) }
    var imageryError by remember(id) { mutableStateOf(false) }
    var retryToken by remember(id) { mutableStateOf(0L) }
    val parcels = remember(id, name, geometry) { listOf(MapParcel(id, name, geometry)) }

    fun choose(next: MapBase) { imageryError = false; base = next }

    @Composable fun notice() {
        if (imageryError && base != MapBase.NONE) {
            Column(Modifier.fillMaxWidth().testTag("parcel-preview-error")) {
                Text("Algunas imágenes no están disponibles. El contorno guardado se conserva.",
                    style = MaterialTheme.typography.bodySmall, color = MoSurfaceTokens.secondaryText)
                TextButton(onClick = { choose(MapBase.MAP) }, Modifier.testTag("parcel-preview-ign")) { Text("Mapa IGN") }
                TextButton(onClick = { choose(MapBase.NONE) }, Modifier.testTag("parcel-preview-local")) { Text("Solo contorno") }
            }
        }
        // Fallback remains reversible, including after connectivity has returned.
        if (base != MapBase.AERIAL || imageryError) {
            TextButton(onClick = { imageryError = false; retryToken = System.nanoTime(); base = MapBase.AERIAL },
                Modifier.testTag("parcel-preview-retry")) {
                Text(if (base == MapBase.AERIAL) "Reintentar foto aérea" else "Volver a foto aérea")
            }
        }
    }

    @Composable fun map(modifier: Modifier, controls: Boolean) {
        ParcelMap(parcels, modifier, base = base, selectedId = id, controls = controls,
            tileRetryToken = retryToken,
            onTileError = { source -> if (source == "base" && base != MapBase.NONE) imageryError = true })
    }

    Column(verticalArrangement = Arrangement.spacedBy(MoSpacing.xs)) {
        Text("${base.label} · Contorno guardado", style = MaterialTheme.typography.labelMedium,
            modifier = if (base == MapBase.AERIAL) Modifier.testTag("parcel-preview-aerial") else Modifier)
        TextButton(onClick = { expanded = true }, Modifier.testTag("parcel-preview-expand")) { Text("Ampliar mapa") }
        if (!expanded) map(Modifier.fillMaxWidth().height(240.dp).clip(MoShape.card).testTag("parcel-map"), false)
        else Box(Modifier.fillMaxWidth().height(240.dp))
        if (!expanded) notice()
    }

    if (expanded) Dialog(onDismissRequest = { expanded = false },
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        val view = LocalView.current
        val lightBackground = MoSurfaceTokens.appBackground.luminance() > 0.5f
        SideEffect {
            (view.parent as? DialogWindowProvider)?.window?.let { window ->
                WindowCompat.getInsetsController(window, view).apply {
                    isAppearanceLightStatusBars = lightBackground
                    isAppearanceLightNavigationBars = lightBackground
                }
            }
        }
        Surface(Modifier.fillMaxSize().testTag("parcel-preview-expanded"), color = MoSurfaceTokens.appBackground) {
            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars).padding(MoSpacing.sm)) {
                Row(Modifier.fillMaxWidth()) {
                    Text(name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    TextButton(onClick = { expanded = false }, Modifier.testTag("parcel-preview-close")) { Text("Cerrar") }
                }
                map(Modifier.fillMaxWidth().weight(1f), true)
                notice()
            }
        }
    }
}
