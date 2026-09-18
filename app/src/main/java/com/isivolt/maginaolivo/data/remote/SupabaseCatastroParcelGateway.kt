package com.isivolt.maginaolivo.data.remote

import com.isivolt.maginaolivo.domain.catastro.CatastroBbox
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import com.isivolt.maginaolivo.domain.catastro.CatastroParcelGateway
import com.isivolt.maginaolivo.domain.catastro.NormalizedCadastralReference
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.call.body
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseCatastroParcelGateway(
    private val client: SupabaseClient,
) : CatastroParcelGateway {

    override suspend fun findByReference(
        reference: NormalizedCadastralReference,
    ): Result<CatastroParcel> = runCatching {
        val response = client.functions.invoke(
            function = "catastro-map",
            body = buildJsonObject {
                put("operation", "reference")
                put("reference", reference.parcelReference)
            },
        )

        val payload = response.body<CatastroFunctionResponse>()
        payload.item?.toDomain(payload.source.checkedAt)
            ?: error("Catastro response did not include a parcel")
    }

    override suspend fun findInViewport(
        bbox: CatastroBbox,
    ): Result<List<CatastroParcel>> = runCatching {
        bbox.validationError()?.let { error(it) }

        val response = client.functions.invoke(
            function = "catastro-map",
            body = buildJsonObject {
                put("operation", "bbox")
                put(
                    "bbox",
                    buildJsonObject {
                        put("minLongitude", bbox.minLongitude)
                        put("minLatitude", bbox.minLatitude)
                        put("maxLongitude", bbox.maxLongitude)
                        put("maxLatitude", bbox.maxLatitude)
                    },
                )
            },
        )

        val payload = response.body<CatastroFunctionResponse>()
        payload.items.map { it.toDomain(payload.source.checkedAt) }
    }
}

@Serializable
private data class CatastroFunctionResponse(
    val item: CatastroParcelDto? = null,
    val items: List<CatastroParcelDto> = emptyList(),
    val source: CatastroSourceDto,
)

@Serializable
private data class CatastroSourceDto(
    val provider: String,
    val dataset: String,
    val service: String,
    val checkedAt: String,
)

@Serializable
private data class CatastroParcelDto(
    val id: String,
    val nationalCadastralReference: String,
    val label: String? = null,
    val areaM2: Double? = null,
    val beginLifespanVersion: String? = null,
    val geometry: JsonObject,
) {
    fun toDomain(checkedAt: String): CatastroParcel {
        val type = when (geometry["type"]?.toString()?.trim('"')) {
            "Polygon" -> CatastroParcel.GeometryType.POLYGON
            "MultiPolygon" -> CatastroParcel.GeometryType.MULTI_POLYGON
            else -> error("Unsupported Catastro geometry")
        }

        return CatastroParcel(
            featureId = id,
            cadastralReference = nationalCadastralReference,
            label = label,
            areaM2 = areaM2,
            geometryGeoJson = geometry.toString(),
            geometryType = type,
            sourceCheckedAt = checkedAt,
        )
    }
}
