package com.isivolt.maginaolivo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.isivolt.maginaolivo.ui.MaginaOlivoApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaginaOlivoApp()
        }
    }
}
