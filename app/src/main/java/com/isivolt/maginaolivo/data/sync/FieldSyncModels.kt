package com.isivolt.maginaolivo.data.sync

import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.PlotEntity
import java.time.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

@Serializable
data class FarmUpsertPayload(
    val id: String,
    val name: String,
    @SerialName("cover_image_uri")
    val coverImageUri: String?,
    @SerialName("updated_at")
    val updatedAt: String,
)

@Serializable
data class PlotUpsertPayload(
    val id: String,
    @SerialName("farm_id")
    val farmId: String,
    val name: String,
    @SerialName("cadastral_reference")
    val cadastralReference: String?,
    @SerialName("area_ha")
    val areaHa: Double?,
    @SerialName("boundary_geojson")
    val boundaryGeoJson: JsonElement?,
    @SerialName("boundary_source")
    val boundarySource: String?,
    @SerialName("updated_at")
    val updatedAt: String,
)

@Serializable
data class RemoteFarmRow(
    val id: String,
    val name: String,
    @SerialName("cover_image_uri")
    val coverImageUri: String?,
    @SerialName("updated_at")
    val updatedAt: String,
)

@Serializable
data class RemotePlotRow(
    val id: String,
    @SerialName("farm_id")
    val farmId: String,
    val name: String,
    @SerialName("cadastral_reference")
    val cadastralReference: String?,
    @SerialName("area_ha")
    val areaHa: Double?,
    @SerialName("boundary_geojson")
    val boundaryGeoJson: JsonElement?,
    @SerialName("boundary_source")
    val boundarySource: String?,
    @SerialName("updated_at")
    val updatedAt: String,
)

fun FarmEntity.toRemoteUpsert(): FarmUpsertPayload =
    FarmUpsertPayload(
        id = id,
        name = name,
        coverImageUri = coverImageUri,
        updatedAt = Instant.ofEpochMilli(updatedAtEpochMs).toString(),
    )

fun PlotEntity.toRemoteUpsert(): PlotUpsertPayload =
    PlotUpsertPayload(
        id = id,
        farmId = farmId,
        name = name,
        cadastralReference = cadastralReference,
        areaHa = areaHa,
        boundaryGeoJson = boundaryGeoJson?.let(Json::parseToJsonElement),
        boundarySource = boundarySource,
        updatedAt = Instant.ofEpochMilli(updatedAtEpochMs).toString(),
    )

fun RemoteFarmRow.toLocalEntity(): FarmEntity =
    FarmEntity(
        id = id,
        name = name,
        coverImageUri = coverImageUri,
        updatedAtEpochMs = Instant.parse(updatedAt).toEpochMilli(),
        syncState = SYNCED,
    )

fun RemotePlotRow.toLocalEntity(): PlotEntity =
    PlotEntity(
        id = id,
        farmId = farmId,
        name = name,
        cadastralReference = cadastralReference,
        areaHa = areaHa,
        boundaryGeoJson = boundaryGeoJson?.toString(),
        boundarySource = boundarySource,
        updatedAtEpochMs = Instant.parse(updatedAt).toEpochMilli(),
        syncState = SYNCED,
    )

private const val SYNCED = "synced"
