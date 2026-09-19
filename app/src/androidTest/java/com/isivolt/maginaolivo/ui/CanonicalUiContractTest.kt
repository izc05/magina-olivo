package com.isivolt.maginaolivo.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.isivolt.maginaolivo.ui.onboarding.OnboardingScreen
import com.isivolt.maginaolivo.ui.shell.MaginaAppShell
import com.isivolt.maginaolivo.ui.theme.MaginaOlivoTheme
import org.junit.Rule
import org.junit.Test

class CanonicalUiContractTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun onboarding_exposesSixCanonicalSteps() {
        composeRule.setContent {
            MaginaOlivoTheme {
                OnboardingScreen(onCompleted = {})
            }
        }

        composeRule.onNodeWithText("BIENVENIDA").assertIsDisplayed()
        composeRule.onNodeWithText("Continuar").performClick()
        composeRule.onNodeWithText("FINCAS Y PARCELAS").assertIsDisplayed()
        composeRule.onNodeWithText("Continuar").performClick()
        composeRule.onNodeWithText("MAPA Y CATASTRO").assertIsDisplayed()
        composeRule.onNodeWithText("Continuar").performClick()
        composeRule.onNodeWithText("ACTIVIDAD Y CAMPAÑA").assertIsDisplayed()
        composeRule.onNodeWithText("Continuar").performClick()
        composeRule.onNodeWithText("COSECHA, GASTOS Y DOCUMENTOS").assertIsDisplayed()
        composeRule.onNodeWithText("Continuar").performClick()
        composeRule.onNodeWithText("TIEMPO, MERCADO Y ALERTAS").assertIsDisplayed()
        composeRule.onNodeWithText("Entrar en Mágina Olivo").assertIsDisplayed()
    }

    @Test
    fun shell_exposesCanonicalBottomNavigation() {
        composeRule.setContent {
            MaginaOlivoTheme {
                MaginaAppShell()
            }
        }

        composeRule.onNodeWithText("Inicio").assertIsDisplayed()
        composeRule.onNodeWithText("Mi Olivar").assertIsDisplayed()
        composeRule.onNodeWithText("+ Registrar").assertIsDisplayed()
        composeRule.onNodeWithText("Calendario").assertIsDisplayed()
        composeRule.onNodeWithText("Perfil").assertIsDisplayed()
    }

    @Test
    fun shell_routesToSecondaryDestinationsWithoutWritingData() {
        composeRule.setContent {
            MaginaOlivoTheme {
                MaginaAppShell()
            }
        }

        composeRule.onNodeWithText("+ Registrar").performClick()
        composeRule.onNodeWithText("Elige qué quieres añadir. La estructura queda preparada para conectarse después con campaña, finca y parcela sin duplicar lógica.").assertIsDisplayed()

        composeRule.onNodeWithText("Calendario").performClick()
        composeRule.onNodeWithText("Aquí se reunirán trabajos, recordatorios, campaña y avisos relacionados con tus fincas.").assertIsDisplayed()

        composeRule.onNodeWithText("Perfil").performClick()
        composeRule.onNodeWithText("Cuenta, datos, avisos y preferencias de Mágina Olivo.").assertIsDisplayed()
    }

    @Test
    fun home_exposesCanonicalInformationBlocksAndQuickRegister() {
        composeRule.setContent {
            MaginaOlivoTheme {
                MaginaAppShell()
            }
        }

        composeRule.onNodeWithText("TIEMPO Y RADAR").assertIsDisplayed()
        composeRule.onNodeWithText("ALERTAS").assertIsDisplayed()
        composeRule.onNodeWithText("MERCADO DEL ACEITE").assertIsDisplayed()
        composeRule.onNodeWithText("AVISOS").assertIsDisplayed()

        composeRule.onNodeWithText("Registrar una actividad").performClick()
        composeRule.onNodeWithText("Elige qué quieres añadir. La estructura queda preparada para conectarse después con campaña, finca y parcela sin duplicar lógica.").assertIsDisplayed()
    }
}
