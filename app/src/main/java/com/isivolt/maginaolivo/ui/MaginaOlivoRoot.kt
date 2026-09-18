package com.isivolt.maginaolivo.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.isivolt.maginaolivo.ui.onboarding.OnboardingPreferences
import com.isivolt.maginaolivo.ui.onboarding.OnboardingScreen
import com.isivolt.maginaolivo.ui.theme.MaginaOlivoTheme

@Composable
fun MaginaOlivoRoot() {
    val context = LocalContext.current
    val preferences = remember(context) { OnboardingPreferences(context) }
    var showOnboarding by remember {
        mutableStateOf(!preferences.isCompleted())
    }

    MaginaOlivoTheme {
        if (showOnboarding) {
            OnboardingScreen(
                onCompleted = {
                    preferences.markCompleted()
                    showOnboarding = false
                },
            )
        } else {
            MaginaOlivoApp()
        }
    }
}
