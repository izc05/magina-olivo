package com.isivolt.maginaolivo.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.ui.theme.MaginaColors

data class OnboardingPage(
    val eyebrow: String,
    val title: String,
    val body: String,
    val symbol: String,
)

private val pages = listOf(
    OnboardingPage(
        eyebrow = "BIENVENIDA",
        title = "Tu olivar, siempre contigo",
        body = "Mágina Olivo reúne en un solo lugar la gestión diaria de tus propias fincas y parcelas, incluso cuando trabajes sin cobertura.",
        symbol = "OLIVO",
    ),
    OnboardingPage(
        eyebrow = "FINCAS Y PARCELAS",
        title = "Organiza tu olivar",
        body = "Crea tus fincas, agrupa sus parcelas y conserva una identificación clara de cada zona de trabajo.",
        symbol = "FINCAS",
    ),
    OnboardingPage(
        eyebrow = "MAPA Y CATASTRO",
        title = "Encuentra cada parcela",
        body = "Apóyate en mapa y Catastro para incorporar parcelas, conservar su geometría y consultarlas también desde el móvil.",
        symbol = "MAPA",
    ),
    OnboardingPage(
        eyebrow = "ACTIVIDAD Y CAMPAÑA",
        title = "Registra lo que haces",
        body = "Lleva por campaña las actuaciones, labores, riegos, tratamientos y notas para saber qué se hizo y cuándo.",
        symbol = "CAMPAÑA",
    ),
    OnboardingPage(
        eyebrow = "COSECHA, GASTOS Y DOCUMENTOS",
        title = "Controla resultados y costes",
        body = "Guarda entregas, kilos, rendimientos, gastos y documentos y revisa después cómo evoluciona cada campaña.",
        symbol = "COSECHA",
    ),
    OnboardingPage(
        eyebrow = "TIEMPO, MERCADO Y ALERTAS",
        title = "Decide con más contexto",
        body = "Consulta tiempo, radar, alertas y mercado del aceite desde una app preparada para seguir creciendo contigo.",
        symbol = "MÁGINA",
    ),
)

@Composable
fun OnboardingScreen(
    onCompleted: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var pageIndex by remember { mutableIntStateOf(0) }
    val page = pages[pageIndex]
    val isLast = pageIndex == pages.lastIndex

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 28.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "MÁGINA OLIVO",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                if (!isLast) {
                    TextButton(onClick = onCompleted) {
                        Text("Saltar")
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            AnimatedContent(
                targetState = page,
                transitionSpec = {
                    fadeIn(tween(220)) togetherWith fadeOut(tween(160))
                },
                label = "onboarding-page",
                modifier = Modifier.weight(1f),
            ) { currentPage ->
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    OnboardingIllustration(symbol = currentPage.symbol)

                    Spacer(modifier = Modifier.height(38.dp))

                    Text(
                        text = currentPage.eyebrow,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = currentPage.title,
                        style = MaterialTheme.typography.displaySmall,
                        color = MaterialTheme.colorScheme.onBackground,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = currentPage.body,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp),
                    )
                }
            }

            PageIndicator(
                current = pageIndex,
                total = pages.size,
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    if (isLast) {
                        onCompleted()
                    } else {
                        pageIndex += 1
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                ),
            ) {
                Text(if (isLast) "Entrar en Mágina Olivo" else "Continuar")
            }

            if (pageIndex > 0 && !isLast) {
                TextButton(
                    onClick = { pageIndex -= 1 },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Atrás")
                }
            } else {
                Spacer(modifier = Modifier.height(48.dp))
            }
        }
    }
}

@Composable
private fun OnboardingIllustration(
    symbol: String,
) {
    Box(
        modifier = Modifier
            .size(218.dp)
            .clip(RoundedCornerShape(44.dp))
            .background(MaginaColors.OliveSoft),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(152.dp)
                .clip(CircleShape)
                .background(MaginaColors.CreamElevated),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "✦",
                    style = MaterialTheme.typography.displaySmall,
                    color = MaginaColors.Gold,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = symbol,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaginaColors.OliveDark,
                )
            }
        }
    }
}

@Composable
private fun PageIndicator(
    current: Int,
    total: Int,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
    ) {
        repeat(total) { index ->
            Box(
                modifier = Modifier
                    .padding(horizontal = 4.dp)
                    .size(if (index == current) 10.dp else 8.dp)
                    .clip(CircleShape)
                    .background(
                        if (index == current) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.22f)
                        },
                    ),
            )
        }
    }
}
