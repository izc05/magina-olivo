package com.isivolt.maginaolivo.ui.onboarding

import android.content.Context

class OnboardingPreferences(context: Context) {
    private val preferences = context.getSharedPreferences(
        "magina_olivo_onboarding",
        Context.MODE_PRIVATE,
    )

    fun isCompleted(): Boolean = preferences.getBoolean(KEY_COMPLETED, false)

    fun markCompleted() {
        preferences.edit().putBoolean(KEY_COMPLETED, true).apply()
    }

    companion object {
        private const val KEY_COMPLETED = "completed_v1"
    }
}
