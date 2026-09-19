package com.isivolt.maginaolivo.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.isivolt.maginaolivo.MaginaOlivoApplication
import com.isivolt.maginaolivo.data.repository.WeatherAlertPreferences
import com.isivolt.maginaolivo.ui.home.WeatherRepositoryHomeSummarySource
import com.isivolt.maginaolivo.ui.onboarding.OnboardingPreferences
import com.isivolt.maginaolivo.ui.onboarding.OnboardingScreen
import com.isivolt.maginaolivo.ui.shell.MaginaAppShell
import com.isivolt.maginaolivo.ui.theme.MaginaOlivoTheme

@Composable
fun MaginaOlivoRoot() {
    val context = LocalContext.current
    val application = context.applicationContext as MaginaOlivoApplication
    val onboardingPreferences = remember(context) { OnboardingPreferences(context) }
    val weatherPreferences = remember(application) {
        WeatherAlertPreferences(application)
    }
    val weatherSource = remember(application, weatherPreferences) {
        WeatherRepositoryHomeSummarySource(
            repository = application.weatherRepository,
            municipalityCode = {
                weatherPreferences.read().municipalityCode
            },
        )
    }
    val farmsFlow = remember(application) {
        application.fieldRepository.observeFarms()
    }
    val farms by farmsFlow.collectAsState(initial = emptyList())

    var showOnboarding by remember {
        mutableStateOf(!onboardingPreferences.isCompleted())
    }

    MaginaOlivoTheme {
        if (showOnboarding) {
            OnboardingScreen(
                onCompleted = {
                    onboardingPreferences.markCompleted()
                    showOnboarding = false
                },
            )
        } else {
            MaginaAppShell(
                weatherSource = weatherSource,
                weatherRepository = application.weatherRepository,
                weatherRadarRepository = application.weatherRadarRepository,
                farms = farms,
            )
        }
    }
}
