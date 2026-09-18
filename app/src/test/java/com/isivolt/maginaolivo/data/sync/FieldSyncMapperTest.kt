package com.isivolt.maginaolivo.data.sync

import com.isivolt.maginaolivo.data.local.FarmEntity
import com.isivolt.maginaolivo.data.local.PlotEntity
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FieldSyncMapperTest {

    @Test
    fun farmEntityMapsToRemoteUpsertWithoutOwnershipFields() {
        val farm = FarmEntity(
            id = "11111111-1111-4111-8111-111111111111",
            name = "Los Olivos",
            coverImageUri = "content://cover/1",
            updatedAtEpochMs = 0L,
            syncState = "pending_upload",
        )

        val payload = farm.toRemoteUpsert()

        assertEquals(farm.id, payload.id)
        assertEquals("Los Olivos", payload.name)
        assertEquals("content://cover/1", payload.coverImageUri)
        assertEquals("1970-01-01T00:00:00Z", payload.updatedAt)
    }

    @Test
    fun plotEntityMapsGeoJsonAsJsonValue() {
        val plot = PlotEntity(
            id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            farmId = "11111111-1111-4111-8111-111111111111",
            name = "Parcela 7",
            cadastralReference = "23013A00700198",
            areaHa = 1.2345,
            boundaryGeoJson = """{"type":"Polygon","coordinates":[]}""",
            boundarySource = "catastro",
            updatedAtEpochMs = 1_000L,
            syncState = "pending_upload",
        )

        val payload = plot.toRemoteUpsert()

        assertEquals(plot.id, payload.id)
        assertEquals(plot.farmId, payload.farmId)
        assertEquals(plot.cadastralReference, payload.cadastralReference)
        assertEquals(1.2345, payload.areaHa ?: 0.0, 0.0000001)
        assertEquals("catastro", payload.boundarySource)
        assertEquals("1970-01-01T00:00:01Z", payload.updatedAt)
        assertEquals(
            "Polygon",
            payload.boundaryGeoJson
                ?.let { Json.parseToJsonElement(it.toString()) }
                ?.toString()
                ?.let { Json.parseToJsonElement(it).jsonObject["type"]?.toString()?.trim('"') },
        )
    }

    @Test
    fun nullPlotGeometryStaysNull() {
        val plot = PlotEntity(
            id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            farmId = "22222222-2222-4222-8222-222222222222",
            name = "Sin perímetro",
            cadastralReference = null,
            areaHa = null,
            boundaryGeoJson = null,
            boundarySource = null,
            updatedAtEpochMs = 0L,
            syncState = "pending_upload",
        )

        val payload = plot.toRemoteUpsert()

        assertNull(payload.boundaryGeoJson)
    }

    @Test
    fun remoteRowsMapBackToSyncedLocalEntities() {
        val farm = RemoteFarmRow(
            id = "11111111-1111-4111-8111-111111111111",
            name = "Los Olivos",
            coverImageUri = null,
            updatedAt = "2026-09-18T17:00:00Z",
        ).toLocalEntity()

        val plot = RemotePlotRow(
            id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            farmId = farm.id,
            name = "Parcela 7",
            cadastralReference = "23013A00700198",
            areaHa = 1.2345,
            boundaryGeoJson = Json.parseToJsonElement(
                """{"type":"Polygon","coordinates":[]}""",
            ),
            boundarySource = "catastro",
            updatedAt = "2026-09-18T17:00:01Z",
        ).toLocalEntity()

        assertEquals("synced", farm.syncState)
        assertEquals("synced", plot.syncState)
        assertEquals(1_758_212_400_000L, farm.updatedAtEpochMs)
        assertEquals(1_758_212_401_000L, plot.updatedAtEpochMs)
        assertTrue(plot.boundaryGeoJson?.contains("\"Polygon\"") == true)
    }
}
