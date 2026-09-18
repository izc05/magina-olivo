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
}
