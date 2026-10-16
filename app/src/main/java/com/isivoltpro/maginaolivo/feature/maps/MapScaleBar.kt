package com.isivoltpro.maginaolivo.feature.maps

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.hideFromAccessibility
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.isivoltpro.maginaolivo.ui.theme.MoColors
import com.isivoltpro.maginaolivo.ui.theme.MoSurfaceTokens

/** Fixed reservation avoids changing the camera viewport as the scale appears or changes units. */
@Composable
internal fun MapScaleBar(value: MapScaleValue?, visible: Boolean, onLinePlaced: (LayoutCoordinates) -> Unit) {
    val density = LocalDensity.current
    val ink = MoColors.current.bodyText
    Surface(Modifier.width(112.dp).alpha(if (visible && value != null) 1f else 0f).testTag("map-scale")
        .semantics(mergeDescendants = true) {
            if (visible && value != null) contentDescription = "Escala del mapa: ${value.label}"
            else hideFromAccessibility()
        },
        color = MoSurfaceTokens.cardSurface) {
        Column(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), horizontalAlignment = Alignment.End) {
            Text(value?.label ?: " ", modifier = Modifier.testTag("map-scale-text"), maxLines = 1,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp), color = ink)
            Canvas(Modifier.width(value?.let { with(density) { it.widthPx.toDp() } } ?: 96.dp).height(4.dp)
                .testTag("map-scale-line").onGloballyPositioned(onLinePlaced)) {
                if (value != null && visible) {
                    val stroke = 1.dp.toPx()
                    drawLine(ink, Offset(0f, size.height / 2), Offset(size.width, size.height / 2), stroke)
                    drawLine(ink, Offset(0f, 0f), Offset(0f, size.height), stroke)
                    drawLine(ink, Offset(size.width, 0f), Offset(size.width, size.height), stroke)
                }
            }
        }
    }
}
