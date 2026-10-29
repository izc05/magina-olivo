package com.isivoltpro.maginaolivo.feature.irrigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.isivoltpro.maginaolivo.data.local.model.ActivityStatus
import com.isivoltpro.maginaolivo.domain.activity.Activity
import com.isivoltpro.maginaolivo.domain.activity.ActivityRepository
import com.isivoltpro.maginaolivo.domain.activity.ActivityType
import com.isivoltpro.maginaolivo.domain.farm.FarmRepository
import com.isivoltpro.maginaolivo.domain.irrigation.DripInstallation
import com.isivoltpro.maginaolivo.domain.irrigation.EmitterType
import com.isivoltpro.maginaolivo.domain.irrigation.IrrigationSummarizer
import com.isivoltpro.maginaolivo.domain.irrigation.WateringDoseCalculator
import com.isivoltpro.maginaolivo.domain.irrigation.WeeklyIrrigationCalendar
import com.isivoltpro.maginaolivo.domain.parcel.IrrigationSystem
import com.isivoltpro.maginaolivo.domain.parcel.Parcel
import com.isivoltpro.maginaolivo.domain.parcel.ParcelRepository
import java.time.DayOfWeek
import java.time.LocalDate
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class IrrigationViewModel(
    private val farmId: UUID,
    private val parcelRepository: ParcelRepository,
    private val activityRepository: ActivityRepository,
    private val farmRepository: FarmRepository? = null,
    today: LocalDate = LocalDate.now(),
) : ViewModel() {

    private val mutableState = MutableStateFlow(
        IrrigationUiState(
            farmId = farmId,
            selectedDay = today.dayOfWeek,
        )
    )
    val state: StateFlow<IrrigationUiState> = mutableState.asStateFlow()

    init {
        // Authoritative security check: verify farm access and existence
        if (farmRepository != null) {
            viewModelScope.launch {
                farmRepository.observeById(farmId).collect { farm ->
                    if (farm == null) {
                        mutableState.value = mutableState.value.copy(
                            isLoading = false,
                            farmNotFound = true,
                            farmName = null,
                            errorMessage = "Finca no disponible o no autorizada",
                        )
                    } else {
                        mutableState.value = mutableState.value.copy(
                            farmNotFound = false,
                            farmName = farm.name,
                            errorMessage = null,
                        )
                    }
                }
            }
        }

        // Observe parcels and activities reactively
        viewModelScope.launch {
            combine(
                parcelRepository.observeActive(farmId),
                activityRepository.observeForFarm(farmId),
            ) { parcels, activities ->
                updateProjection(parcels, activities)
            }.collect { newState ->
                if (!mutableState.value.farmNotFound) {
                    mutableState.value = newState
                }
            }
        }
    }

    private fun updateProjection(
        parcels: List<Parcel>,
        activities: List<Activity>,
    ): IrrigationUiState {
        val weeklyPlan = WeeklyIrrigationCalendar.buildWeeklyPlan(parcels)
        val summary = IrrigationSummarizer.computeSummary(parcels, activities)

        val irrigatedParcels = parcels.filter { parcel ->
            parcel.archivedAt == null &&
                parcel.agronomy.irrigationSystem != null &&
                parcel.agronomy.irrigationSystem != IrrigationSystem.DRYLAND
        }

        val recentIrrigations = activities
            .filter { it.type == ActivityType.IRRIGATION && it.status == ActivityStatus.COMPLETED }
            .sortedByDescending { it.activityDate }

        val currentCalc = mutableState.value.calculator
        val updatedCalc = if (currentCalc.parcelId == null && irrigatedParcels.isNotEmpty()) {
            val first = irrigatedParcels.first()
            val trees = first.agronomy.oliveTreeCount?.toString().orEmpty()
            currentCalc.copy(
                parcelId = first.id,
                parcelName = first.displayName,
                oliveTreeCountText = trees,
            )
        } else {
            currentCalc
        }

        return mutableState.value.copy(
            isLoading = false,
            summary = summary,
            weeklyPlan = weeklyPlan,
            irrigatedParcels = irrigatedParcels,
            recentActivities = recentIrrigations,
            calculator = updatedCalc,
        )
    }

    fun selectTab(tab: IrrigationTab) {
        if (!mutableState.value.farmNotFound) {
            mutableState.value = mutableState.value.copy(selectedTab = tab)
        }
    }

    fun selectDay(day: DayOfWeek) {
        if (!mutableState.value.farmNotFound) {
            mutableState.value = mutableState.value.copy(selectedDay = day)
        }
    }

    fun loadParcelForCalculator(parcel: Parcel) {
        val calc = mutableState.value.calculator.copy(
            parcelId = parcel.id,
            parcelName = parcel.displayName,
            oliveTreeCountText = parcel.agronomy.oliveTreeCount?.toString().orEmpty(),
            isSimulationMode = false,
        )
        mutableState.value = mutableState.value.copy(
            calculator = runCalculation(calc, explicit = false),
            selectedTab = IrrigationTab.INSTALLATIONS,
        )
    }

    fun updateTrees(text: String) {
        val filtered = text.filter { it.isDigit() }
        val calc = mutableState.value.calculator.copy(oliveTreeCountText = filtered, isSimulationMode = false)
        mutableState.value = mutableState.value.copy(calculator = runCalculation(calc, explicit = false))
    }

    fun updateEmittersPerTree(text: String) {
        val filtered = text.filter { it.isDigit() }
        val calc = mutableState.value.calculator.copy(emittersPerTreeText = filtered, isSimulationMode = false)
        mutableState.value = mutableState.value.copy(calculator = runCalculation(calc, explicit = false))
    }

    fun updateFlowLph(text: String) {
        val sanitized = text.replace(',', '.').filter { it.isDigit() || it == '.' }
        val calc = mutableState.value.calculator.copy(emitterFlowLphText = sanitized, isSimulationMode = false)
        mutableState.value = mutableState.value.copy(calculator = runCalculation(calc, explicit = false))
    }

    fun updateDuration(text: String) {
        val filtered = text.filter { it.isDigit() }
        val calc = mutableState.value.calculator.copy(durationMinutesText = filtered, isSimulationMode = false)
        mutableState.value = mutableState.value.copy(calculator = runCalculation(calc, explicit = false))
    }

    fun updateEmitterType(type: EmitterType) {
        val calc = mutableState.value.calculator.copy(emitterType = type, isSimulationMode = false)
        mutableState.value = mutableState.value.copy(calculator = runCalculation(calc, explicit = false))
    }

    fun recalculateDose() {
        val calc = runCalculation(mutableState.value.calculator, explicit = true)
        mutableState.value = mutableState.value.copy(calculator = calc)
    }

    fun loadSimulationExample() {
        val current = mutableState.value.calculator
        val trees = current.oliveTreeCountText.ifBlank { "450" }
        val simulated = current.copy(
            isSimulationMode = true,
            oliveTreeCountText = trees,
            emittersPerTreeText = "2",
            emitterFlowLphText = "4.0",
            durationMinutesText = "120",
            emitterType = EmitterType.INTEGRATED,
        )
        mutableState.value = mutableState.value.copy(
            calculator = runCalculation(simulated, explicit = true),
        )
    }

    fun clearSimulation() {
        val current = mutableState.value.calculator
        val reset = current.copy(
            isSimulationMode = false,
            emittersPerTreeText = "",
            emitterFlowLphText = "",
            durationMinutesText = "",
            calculatedDose = null,
            error = null,
        )
        mutableState.value = mutableState.value.copy(calculator = reset)
    }

    private fun runCalculation(calc: DoseCalculatorState, explicit: Boolean = false): DoseCalculatorState {
        val trees = calc.oliveTreeCountText.toIntOrNull()
        val emitters = calc.emittersPerTreeText.toIntOrNull()
        val flow = calc.emitterFlowLphText.toDoubleOrNull()
        val minutes = calc.durationMinutesText.toIntOrNull()

        val allFilled = trees != null && emitters != null && flow != null && minutes != null
        if (!allFilled) {
            return calc.copy(
                calculatedDose = null,
                error = if (explicit) "Completa todos los parámetros para calcular la dotación" else null,
            )
        }

        if (trees <= 0 || emitters <= 0 || flow <= 0.0 || minutes <= 0) {
            return calc.copy(
                calculatedDose = null,
                error = "Introduce valores mayores que cero",
            )
        }

        return try {
            val installation = DripInstallation(
                oliveTreeCount = trees,
                emittersPerTree = emitters,
                emitterFlowLph = flow,
                emitterType = calc.emitterType,
            )
            val dose = WateringDoseCalculator.calculateDose(installation, durationMinutes = minutes)
            calc.copy(calculatedDose = dose, error = null)
        } catch (ex: Exception) {
            calc.copy(calculatedDose = null, error = "Parámetros de cálculo no válidos")
        }
    }
}

