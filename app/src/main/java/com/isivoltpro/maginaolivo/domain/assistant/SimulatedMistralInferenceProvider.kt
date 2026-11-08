package com.isivoltpro.maginaolivo.domain.assistant

import com.isivoltpro.maginaolivo.core.common.AppError
import com.isivoltpro.maginaolivo.core.common.AppResult
import java.util.UUID

/**
 * Proveedor simulado (MOCK) de Mistral AI con especialización agrícola exclusiva.
 * Aplica el clasificador agrario previo y la inyección del System Prompt oficial.
 */
class SimulatedMistralInferenceProvider : AssistantInferenceProvider {
    override val providerId: String = "mistral-agricultural-mock-engine"

    override suspend fun generateResponse(
        request: AssistantInferenceRequest,
        toolsService: AssistantToolsService
    ): AppResult<AssistantInferenceResponse> {
        val prompt = request.userPrompt.trim()
        val context = request.securityContext

        // 1. Clasificación determinista previa al LLM (Barrera de Dominio Agrario)
        val classification = AgriculturalDomainClassifier.classify(prompt)
        if (!classification.isAgricultural) {
            return AppResult.Success(
                AssistantInferenceResponse(
                    text = classification.rejectionMessage
                        ?: "Mágina IA solo atiende consultas sobre agricultura, olivar y gestión de su explotación.",
                    toolsCalled = emptyList(),
                    promptTokens = 25,
                    completionTokens = 35,
                    isMock = true
                )
            )
        }

        val lower = prompt.lowercase()

        // 2. Simulación determinista de Tool Calling respetando AssistantSecurityContext
        return try {
            when {
                lower.contains("finca") || lower.contains("olivares") -> {
                    if (!context.hasPermission(AssistantPermission.VIEW_FARMS)) {
                        return AppResult.Failure(AppError.Validation("security", "Permiso denegado: VIEW_FARMS requerido"))
                    }
                    val farmsResult = toolsService.getAuthorizedFarms(context)
                    when (farmsResult) {
                        is AppResult.Success -> {
                            val farms = farmsResult.value.first
                            val reply = if (farms.isEmpty()) {
                                "[DATO REGISTRADO]: No se encontraron fincas activas en su explotación autorizada."
                            } else {
                                val listStr = farms.joinToString(separator = "\n") {
                                    "- ${it.name} (${it.municipality ?: "Sin término"}) — ${it.oliveTreesCount ?: 0} olivos"
                                }
                                "[DATO REGISTRADO]: He consultado sus fincas autorizadas:\n$listStr\n(Fuente: ${farmsResult.value.second.origin})"
                            }
                            AppResult.Success(
                                AssistantInferenceResponse(
                                    text = reply,
                                    toolsCalled = listOf("get_authorized_farms"),
                                    promptTokens = 120,
                                    completionTokens = 85,
                                    isMock = true
                                )
                            )
                        }
                        is AppResult.Failure -> AppResult.Failure(farmsResult.error)
                    }
                }

                lower.contains("entrega") || lower.contains("kilo") || lower.contains("cosecha") -> {
                    if (!context.hasPermission(AssistantPermission.VIEW_DELIVERIES)) {
                        return AppResult.Failure(AppError.Validation("security", "Permiso denegado: VIEW_DELIVERIES requerido"))
                    }
                    val campaignId = context.selectedCampaignId ?: UUID.fromString("00000000-0000-0000-0000-000000000001")
                    val deliveryResult = toolsService.getDeliverySummary(context, campaignId)
                    when (deliveryResult) {
                        is AppResult.Success -> {
                            val summary = deliveryResult.value.first
                            val reply = "[DATO REGISTRADO & CÁLCULO]: Resumen de entregas de campaña:\n" +
                                    "- Total entregas: ${summary.totalDeliveries}\n" +
                                    "- Kilos netos totales: ${summary.totalKilos} kg\n" +
                                    "- Confirmados en almazara: ${summary.confirmedKilos} kg\n" +
                                    "- Pendientes de sincronización: ${summary.pendingSyncKilos} kg"
                            AppResult.Success(
                                AssistantInferenceResponse(
                                    text = reply,
                                    toolsCalled = listOf("get_delivery_summary"),
                                    promptTokens = 95,
                                    completionTokens = 65,
                                    isMock = true
                                )
                            )
                        }
                        is AppResult.Failure -> AppResult.Failure(deliveryResult.error)
                    }
                }

                lower.contains("repilo") || lower.contains("mosca") || lower.contains("fitosanitario") || lower.contains("tratamiento") -> {
                    val reply = "[RECOMENDACIÓN TÉCNICA AGRONÓMICA]: Para el control preventivo en olivar contra repilo (Spilocaea oleagina) o mosca del olivo (Bactrocera oleae), es clave monitorizar las condiciones de humedad relativa y temperatura en la comarca de Sierra Mágina antes de intervenir." +
                            AgriculturalSystemPrompt.OFFICIAL_DISCLAIMER_PHYTOSANITARY
                    AppResult.Success(
                        AssistantInferenceResponse(
                            text = reply,
                            toolsCalled = emptyList(),
                            promptTokens = 130,
                            completionTokens = 90,
                            isMock = true
                        )
                    )
                }

                lower.contains("tiempo") || lower.contains("clima") || lower.contains("lluvia") -> {
                    if (!context.hasPermission(AssistantPermission.VIEW_WEATHER)) {
                        return AppResult.Failure(AppError.Validation("security", "Permiso denegado: VIEW_WEATHER requerido"))
                    }
                    val weatherResult = toolsService.getWeatherForecast(context, null)
                    when (weatherResult) {
                        is AppResult.Success -> {
                            val weather = weatherResult.value.first
                            val reply = "[DATO METEOROLÓGICO OFICIAL - ${weather.provider}]: Previsión (${weather.municipality}):\n" +
                                    "- Temperaturas: Mín ${weather.tempMin}°C / Máx ${weather.tempMax}°C\n" +
                                    "- Probabilidad de lluvia: ${weather.rainProbabilityPercent}%\n" +
                                    "[RECOMENDACIÓN AGRONÓMICA]: ${weather.notice}"
                            AppResult.Success(
                                AssistantInferenceResponse(
                                    text = reply,
                                    toolsCalled = listOf("get_weather_forecast"),
                                    promptTokens = 85,
                                    completionTokens = 65,
                                    isMock = true
                                )
                            )
                        }
                        is AppResult.Failure -> AppResult.Failure(weatherResult.error)
                    }
                }

                lower.contains("gasto") || lower.contains("economía") || lower.contains("coste") -> {
                    if (!context.hasPermission(AssistantPermission.VIEW_EXPENSES)) {
                        return AppResult.Failure(AppError.Validation("security", "Permiso denegado: VIEW_EXPENSES requerido"))
                    }
                    val campaignId = context.selectedCampaignId ?: UUID.fromString("00000000-0000-0000-0000-000000000001")
                    val expenseResult = toolsService.getExpenseSummary(context, campaignId)
                    when (expenseResult) {
                        is AppResult.Success -> {
                            val exp = expenseResult.value.first
                            val totalEuros = exp.totalExpenseCents / 100.0
                            val reply = "[CÁLCULO DETERMINISTA]: Gastos registrados en campaña:\n" +
                                    "- Total acumulado: %.2f €\n".format(totalEuros) +
                                    "- Recolección: %.2f €\n".format(exp.harvestCostsCents / 100.0) +
                                    "- Maquinaria y carburante: %.2f €\n".format(exp.machineryCostsCents / 100.0) +
                                    "- Jornales: %.2f €".format(exp.labourCostsCents / 100.0)
                            AppResult.Success(
                                AssistantInferenceResponse(
                                    text = reply,
                                    toolsCalled = listOf("get_expense_summary"),
                                    promptTokens = 110,
                                    completionTokens = 75,
                                    isMock = true
                                )
                            )
                        }
                        is AppResult.Failure -> AppResult.Failure(expenseResult.error)
                    }
                }

                else -> {
                    // Consulta agraria general o saludo contextual
                    AppResult.Success(
                        AssistantInferenceResponse(
                            text = "Hola. Soy Mágina IA, tu asesor técnico agrícola especializado en olivar y cultivos de Sierra Mágina. Puedes consultarme por tus fincas, entregas en cooperativa, fitosanitarios, meteorología o gastos de explotación.",
                            toolsCalled = emptyList(),
                            promptTokens = 45,
                            completionTokens = 35,
                            isMock = true
                        )
                    )
                }
            }
        } catch (ex: Exception) {
            AppResult.Failure(AppError.Validation("inference", ex.message ?: "Error en inferencia simulada"))
        }
    }
}
