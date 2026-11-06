package com.isivoltpro.maginaolivo

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.isivoltpro.maginaolivo.feature.campaignhub.AgriculturalCampaignContent
import com.isivoltpro.maginaolivo.feature.notebook.NotebookActions
import com.isivoltpro.maginaolivo.feature.notebook.NotebookUiState
import com.isivoltpro.maginaolivo.ui.theme.MaginaOlivoTheme
import org.junit.Rule
import org.junit.Test

class AgriculturalCampaignScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test fun failedReadsNeverBecomeEmptyCampaignOrEnableSections() {
        compose.setContent { MaginaOlivoTheme { Column { AgriculturalCampaignContent(
            NotebookUiState(isLoading = false, error = "Sin conexión con el almacén local"), NotebookActions(), {}, {}, {}, {}) } } }
        compose.onNodeWithText("No pudimos consultar los registros").assertExists()
        compose.onNodeWithTag("campaign-section-RECOLLECTION").assertDoesNotExist()
        compose.onNodeWithTag("campaign-no-recollection").assertDoesNotExist()
    }

    @Test fun missingCampaignKeepsCostsAccessibleAndNeverClaimsCompleteBalance() {
        compose.setContent { MaginaOlivoTheme { Column(Modifier.verticalScroll(rememberScrollState())) { AgriculturalCampaignContent(
            NotebookUiState(isLoading = false), NotebookActions(), {}, {}, {}, {}) } } }
        compose.onNodeWithTag("campaign-section-ECONOMY").performScrollTo().performClick()
        compose.onNodeWithTag("campaign-balance-incomplete").performScrollTo().assertTextContains("balance incompleto", substring = true)
        compose.onNodeWithTag("campaign-section-RECOLLECTION").performScrollTo().performClick()
        compose.onNodeWithTag("campaign-no-recollection").performScrollTo().assertExists()
    }
}
