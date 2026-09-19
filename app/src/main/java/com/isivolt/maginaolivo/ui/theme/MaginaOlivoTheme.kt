package com.isivolt.maginaolivo.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object MaginaColors {
    val Cream = Color(0xFFF5F0E4)
    val CreamElevated = Color(0xFFFFFBF3)
    val Olive = Color(0xFF52623D)
    val OliveDark = Color(0xFF2F3A27)
    val OliveSoft = Color(0xFFDDE3D2)
    val Earth = Color(0xFF8B6F4E)
    val Gold = Color(0xFFB69B61)
    val Ink = Color(0xFF24261F)
    val Muted = Color(0xFF666B5F)
    val Error = Color(0xFF9E3D32)
}

private val LightColors = lightColorScheme(
    primary = MaginaColors.Olive,
    onPrimary = Color.White,
    primaryContainer = MaginaColors.OliveSoft,
    onPrimaryContainer = MaginaColors.OliveDark,
    secondary = MaginaColors.Earth,
    onSecondary = Color.White,
    tertiary = MaginaColors.Gold,
    background = MaginaColors.Cream,
    onBackground = MaginaColors.Ink,
    surface = MaginaColors.CreamElevated,
    onSurface = MaginaColors.Ink,
    surfaceVariant = MaginaColors.OliveSoft,
    onSurfaceVariant = MaginaColors.Muted,
    error = MaginaColors.Error,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFB9CAA5),
    onPrimary = MaginaColors.OliveDark,
    primaryContainer = Color(0xFF3D4A31),
    onPrimaryContainer = Color(0xFFE0E8D5),
    secondary = Color(0xFFD1B99B),
    background = Color(0xFF171A15),
    onBackground = Color(0xFFE7E9E1),
    surface = Color(0xFF1E211B),
    onSurface = Color(0xFFE7E9E1),
    surfaceVariant = Color(0xFF343A30),
    onSurfaceVariant = Color(0xFFC8CDC1),
)

private val MaginaTypography = androidx.compose.material3.Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 36.sp,
        lineHeight = 40.sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 30.sp,
        lineHeight = 34.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 26.sp,
        lineHeight = 31.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
    ),
)

@Composable
fun MaginaOlivoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = MaginaTypography,
        content = content,
    )
}
