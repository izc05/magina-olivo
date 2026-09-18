package com.isivolt.maginaolivo.ui.catastro

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.repository.LocalFieldRepository
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import com.isivolt.maginaolivo.domain.catastro.CatastroParcelGateway
import com.isivolt.maginaolivo.domain.catastro.normalizeCadastralReference
import kotlinx.coroutines.launch

@Composable
fun AddParcelByReferenceScreen(
    farms: List<FarmEntity>,
    repository: LocalFieldRepository,
    gateway: CatastroParcelGateway?,
    initialReference: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    var selectedFarmId by rememberSaveable(farms) {
        mutableStateOf(farms.firstOrNull()?.id)
    }
    var referenceInput by rememberSaveable(initialReference) { mutableStateOf(initialReference.orEmpty()) }
    var candidate by remember { mutableStateOf<CatastroParcel?>(null) }
    var workingName by rememberSaveable { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        TextButton(onClick = onBack) {
            Text("Volver")
        }

        Text(
            text = "Añadir parcela desde Catastro",
            style = MaterialTheme.typography.headlineSmall,
        )
        Text(
            text = "Selecciona la finca y busca la parcela por referencia catastral.",
            style = MaterialTheme.typography.bodyLarge,
        )

        Text(
            text = "Finca de destino",
            style = MaterialTheme.typography.titleMedium,
        )
        farms.forEach { farm ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(
                    selected = selectedFarmId == farm.id,
                    onClick = {
                        selectedFarmId = farm.id
                        error = null
                    },
                )
                Text(farm.name)
            }
        }

        OutlinedTextField(
            value = referenceInput,
            onValueChange = {
                referenceInput = it
                candidate = null
                error = null
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Referencia catastral") },
            supportingText = {
                Text("Acepta referencias de 14, 18 o 20 caracteres.")
            },
        )

        Button(
            enabled = !loading && selectedFarmId != null,
            onClick = {
                val normalized = normalizeCadastralReference(referenceInput)
                when {
                    normalized == null -> {
                        error = "La referencia catastral no tiene un formato válido."
                    }

                    gateway == null -> {
                        error = "Catastro necesita conexión con el backend de Mágina Olivo."
                    }

                    else -> {
                        loading = true
                        error = null
                        candidate = null
                        scope.launch {
                            gateway.findByReference(normalized)
                                .onSuccess { parcel ->
                                    candidate = parcel
                                    workingName = parcel.label?.takeIf { it.isNotBlank() }
                                        ?: "Parcela ${parcel.cadastralReference.takeLast(6)}"
                                }
                                .onFailure {
                                    error = "No se ha podido localizar la parcela en Catastro."
                                }
                            loading = false
                        }
                    }
                }
            },
        ) {
            if (loading) {
                CircularProgressIndicator()
            } else {
                Text("Buscar en Catastro")
            }
        }

        error?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
            )
        }

        candidate?.let { parcel ->
            Card(
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = parcel.cadastralReference,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        text = parcel.areaM2?.let { area ->
                            "Superficie: ${formatHectares(area)} ha"
                        } ?: "Superficie oficial no disponible",
                    )
                    Text(
                        text = "Geometría: ${when (parcel.geometryType) {
                            CatastroParcel.GeometryType.POLYGON -> "Polygon"
                            CatastroParcel.GeometryType.MULTI_POLYGON -> "MultiPolygon"
                        }}",
                    )

                    OutlinedTextField(
                        value = workingName,
                        onValueChange = { workingName = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("Nombre de trabajo") },
                    )

                    Button(
                        enabled = !saving && workingName.isNotBlank(),
                        onClick = {
                            val farmId = selectedFarmId
                            if (farmId == null) {
                                error = "Selecciona una finca."
                                return@Button
                            }

                            saving = true
                            error = null
                            scope.launch {
                                repository.importCatastroParcel(
                                    farmId = farmId,
                                    parcel = parcel,
                                    workingName = workingName,
                                ).onSuccess {
                                    saving = false
                                    onSaved()
                                }.onFailure { failure ->
                                    saving = false
                                    error = if (
                                        failure.message == "CADASTRAL_REFERENCE_ALREADY_ADDED"
                                    ) {
                                        "Esta parcela catastral ya está añadida."
                                    } else {
                                        "No se ha podido guardar la parcela."
                                    }
                                }
                            }
                        },
                    ) {
                        if (saving) {
                            CircularProgressIndicator()
                        } else {
                            Text("Guardar parcela")
                        }
                    }
                }
            }
        }
    }
}

private fun formatHectares(areaM2: Double): String {
    return String.format("%.4f", areaM2 / 10_000.0)
}
