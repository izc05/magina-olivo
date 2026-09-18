package com.isivolt.maginaolivo.ui.map

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.graphics.Color
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.isivolt.maginaolivo.data.local.PlotEntity
import com.isivolt.maginaolivo.domain.catastro.CatastroBbox
import com.isivolt.maginaolivo.domain.catastro.CatastroParcel
import com.isivolt.maginaolivo.domain.catastro.CatastroParcelGateway
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.location.modes.CameraMode
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.RasterLayer
import org.maplibre.android.style.layers.PropertyFactory.fillColor
import org.maplibre.android.style.layers.PropertyFactory.fillOpacity
import org.maplibre.android.style.layers.PropertyFactory.lineColor
import org.maplibre.android.style.layers.PropertyFactory.lineWidth
import org.maplibre.android.style.layers.PropertyFactory.rasterOpacity
import org.maplibre.android.style.layers.PropertyFactory.visibility
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.android.style.sources.RasterSource
import org.maplibre.android.style.sources.TileSet

private const val ONLINE_STYLE_URI = "https://tiles.openfreemap.org/styles/liberty"

private const val PLOTS_SOURCE_ID = "my-plots"
private const val PLOTS_FILL_LAYER_ID = "my-plots-fill"
private const val PLOTS_LINE_LAYER_ID = "my-plots-line"

private const val CATASTRO_SOURCE_ID = "catastro-candidates"
private const val CATASTRO_FILL_LAYER_ID = "catastro-candidates-fill"
private const val CATASTRO_LINE_LAYER_ID = "catastro-candidates-line"

private const val PNOA_SOURCE_ID = "pnoa-ign"
private const val PNOA_LAYER_ID = "pnoa-ign-raster"
private const val PNOA_WMTS_TILE_URL =
    "https://www.ign.es/wmts/pnoa-ma?service=WMTS&request=GetTile&version=1.0.0" +
        "&layer=OI.OrthoimageCoverage&style=default&format=image/jpeg" +
        "&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileCol={x}&TileRow={y}"

private const val OFFLINE_STYLE_JSON = """
{
  "version": 8,
  "name": "Mágina Olivo Offline",
  "sources": {},
  "layers": [
    {
      "id": "offline-background",
      "type": "background",
      "paint": {
        "background-color": "#EFECE3"
      }
    }
  ]
}
"""

@Composable
fun PlotMapScreen(
    plots: List<PlotEntity>,
    catastroGateway: CatastroParcelGateway? = null,
    onCatastroReferencesSelected: ((List<String>) -> Unit)? = null,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val activity = remember(context) { context.findActivity() }
    val plotGeoJson = remember(plots) { plotsFeatureCollection(plots) }
    val mapView = remember {
        MapView(context).also { it.onCreate(null) }
    }
    val scope = rememberCoroutineScope()

    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var loadedStyle by remember { mutableStateOf<Style?>(null) }
    var pnoaEnabled by remember { mutableStateOf(false) }
    var locationRequested by remember { mutableStateOf(false) }

    var catastroCandidates by remember { mutableStateOf<List<CatastroParcel>>(emptyList()) }
    var selectedReferences by remember { mutableStateOf<Set<String>>(emptySet()) }
    var catastroLoading by remember { mutableStateOf(false) }
    var catastroMessage by remember { mutableStateOf<String?>(null) }

    val candidateGeoJson = remember(catastroCandidates) {
        catastroFeatureCollection(catastroCandidates)
    }
    val latestCandidates = rememberUpdatedState(catastroCandidates)
    val latestSelectedReferences = rememberUpdatedState(selectedReferences)
    val selectedCandidates = remember(catastroCandidates, selectedReferences) {
        catastroCandidates.filter { it.cadastralReference in selectedReferences }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        val granted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            loadedStyle?.let { style ->
                map?.let { readyMap ->
                    enableUserLocation(context, readyMap, style)
                }
            }
        }
    }

    DisposableEffect(activity, mapView) {
        val observer = object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) = mapView.onStart()
            override fun onResume(owner: LifecycleOwner) = mapView.onResume()
            override fun onPause(owner: LifecycleOwner) = mapView.onPause()
            override fun onStop(owner: LifecycleOwner) = mapView.onStop()
        }
        activity.lifecycle.addObserver(observer)
        onDispose {
            activity.lifecycle.removeObserver(observer)
            mapView.onDestroy()
        }
    }

    DisposableEffect(mapView) {
        var fallbackLoaded = false
        var activeMap: MapLibreMap? = null
        var clickListener: MapLibreMap.OnMapClickListener? = null

        fun configureStyle(style: Style) {
            loadedStyle = style
            attachPlotLayers(style, plotGeoJson)
            attachCatastroLayers(style, candidateGeoJson)
            updatePnoaLayer(style, pnoaEnabled)
            if (locationRequested && context.hasLocationPermission()) {
                map?.let { readyMap ->
                    enableUserLocation(context, readyMap, style)
                }
            }
        }

        val failedListener = MapView.OnDidFailLoadingMapListener {
            val currentMap = map ?: return@OnDidFailLoadingMapListener
            if (!fallbackLoaded) {
                fallbackLoaded = true
                currentMap.setStyle(Style.Builder().fromJson(OFFLINE_STYLE_JSON), ::configureStyle)
            }
        }

        mapView.addOnDidFailLoadingMapListener(failedListener)
        mapView.getMapAsync { readyMap ->
            activeMap = readyMap
            map = readyMap
            readyMap.cameraPosition = CameraPosition.Builder()
                .target(LatLng(37.75, -3.45))
                .zoom(10.5)
                .build()

            val listener = MapLibreMap.OnMapClickListener { point ->
                val candidate = latestCandidates.value.firstOrNull {
                    parcelContains(it, point.longitude, point.latitude)
                }
                if (candidate != null) {
                    val reference = candidate.cadastralReference
                    val currentSelection = latestSelectedReferences.value
                    selectedReferences = if (reference in currentSelection) {
                        currentSelection - reference
                    } else {
                        currentSelection + reference
                    }
                    catastroMessage = null
                    true
                } else {
                    false
                }
            }
            clickListener = listener
            readyMap.addOnMapClickListener(listener)

            readyMap.setStyle(Style.Builder().fromUri(ONLINE_STYLE_URI), ::configureStyle)
        }

        onDispose {
            clickListener?.let { listener ->
                activeMap?.removeOnMapClickListener(listener)
            }
            mapView.removeOnDidFailLoadingMapListener(failedListener)
        }
    }

    LaunchedEffect(map, plotGeoJson) {
        map?.style
            ?.getSourceAs<GeoJsonSource>(PLOTS_SOURCE_ID)
            ?.setGeoJson(plotGeoJson)
    }

    LaunchedEffect(map, candidateGeoJson) {
        map?.style
            ?.getSourceAs<GeoJsonSource>(CATASTRO_SOURCE_ID)
            ?.setGeoJson(candidateGeoJson)
    }

    LaunchedEffect(loadedStyle, pnoaEnabled) {
        loadedStyle?.let { style ->
            updatePnoaLayer(style, pnoaEnabled)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { mapView },
            modifier = Modifier.fillMaxSize(),
        )

        Button(
            onClick = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp),
        ) {
            Text("Volver")
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Button(
                onClick = {
                    locationRequested = true
                    if (context.hasLocationPermission()) {
                        loadedStyle?.let { style ->
                            map?.let { readyMap ->
                                enableUserLocation(context, readyMap, style)
                            }
                        }
                    } else {
                        permissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                            ),
                        )
                    }
                },
            ) {
                Text("Mi ubicación")
            }

            Button(
                onClick = { pnoaEnabled = !pnoaEnabled },
            ) {
                Text(if (pnoaEnabled) "Mapa" else "PNOA")
            }

            Button(
                enabled = !catastroLoading,
                onClick = {
                    val readyMap = map
                    val gateway = catastroGateway

                    if (readyMap == null) {
                        catastroMessage = "El mapa todavía se está preparando."
                        return@Button
                    }
                    if (gateway == null) {
                        catastroMessage = "Catastro necesita el backend de Mágina Olivo."
                        return@Button
                    }

                    val bounds = readyMap.projection.visibleRegion.latLngBounds
                    val bbox = CatastroBbox(
                        minLongitude = bounds.longitudeWest,
                        minLatitude = bounds.latitudeSouth,
                        maxLongitude = bounds.longitudeEast,
                        maxLatitude = bounds.latitudeNorth,
                    )

                    val validationError = bbox.validationError()
                    if (validationError != null) {
                        catastroMessage = if (
                            validationError == "BBOX_TOO_WIDE" ||
                            validationError == "BBOX_TOO_TALL"
                        ) {
                            "Acércate más para consultar las parcelas catastrales."
                        } else {
                            "Este encuadre no se puede consultar en Catastro."
                        }
                        return@Button
                    }

                    catastroLoading = true
                    catastroMessage = null
                    selectedReferences = emptySet()
                    scope.launch {
                        gateway.findInViewport(bbox)
                            .onSuccess { parcels ->
                                catastroCandidates = parcels
                                catastroMessage = if (parcels.isEmpty()) {
                                    "No se han encontrado parcelas en este encuadre."
                                } else {
                                    "Toca una parcela catastral para seleccionarla."
                                }
                            }
                            .onFailure {
                                catastroMessage = "No se ha podido consultar Catastro."
                            }
                        catastroLoading = false
                    }
                },
            ) {
                Text(if (catastroLoading) "Consultando…" else "Catastro")
            }
        }

        if (selectedCandidates.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
                    .fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = if (selectedCandidates.size == 1) {
                            "1 parcela seleccionada"
                        } else {
                            "${selectedCandidates.size} parcelas seleccionadas"
                        },
                        style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
                    )
                    selectedCandidates.take(3).forEach { parcel ->
                        Text(
                            parcel.areaM2?.let { area ->
                                "${parcel.cadastralReference} · ${String.format("%.4f", area / 10_000.0)} ha"
                            } ?: parcel.cadastralReference,
                        )
                    }
                    if (selectedCandidates.size > 3) {
                        Text("+ ${selectedCandidates.size - 3} parcelas más")
                    }
                    Button(
                        enabled = onCatastroReferencesSelected != null,
                        onClick = {
                            onCatastroReferencesSelected?.invoke(
                                selectedCandidates.map { it.cadastralReference },
                            )
                        },
                    ) {
                        Text(
                            if (selectedCandidates.size == 1) {
                                "Añadir parcela"
                            } else {
                                "Añadir selección"
                            },
                        )
                    }
                    Button(
                        onClick = { selectedReferences = emptySet() },
                    ) {
                        Text("Limpiar selección")
                    }
                }
            }
        }

        if (selectedCandidates.isEmpty()) {
            catastroMessage?.let { message ->
                Card(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                        .fillMaxWidth(),
                ) {
                    Text(
                        text = message,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        }
    }
}

private fun attachPlotLayers(style: Style, geoJson: String) {
    style.getSource(PLOTS_SOURCE_ID)?.let { source ->
        (source as? GeoJsonSource)?.setGeoJson(geoJson)
        return
    }

    style.addSource(GeoJsonSource(PLOTS_SOURCE_ID, geoJson))
    style.addLayer(
        FillLayer(PLOTS_FILL_LAYER_ID, PLOTS_SOURCE_ID).withProperties(
            fillColor(Color.rgb(76, 111, 55)),
            fillOpacity(0.24f),
        ),
    )
    style.addLayer(
        LineLayer(PLOTS_LINE_LAYER_ID, PLOTS_SOURCE_ID).withProperties(
            lineColor(Color.rgb(39, 74, 34)),
            lineWidth(2.4f),
        ),
    )
}

private fun attachCatastroLayers(style: Style, geoJson: String) {
    style.getSource(CATASTRO_SOURCE_ID)?.let { source ->
        (source as? GeoJsonSource)?.setGeoJson(geoJson)
        return
    }

    style.addSource(GeoJsonSource(CATASTRO_SOURCE_ID, geoJson))
    style.addLayer(
        FillLayer(CATASTRO_FILL_LAYER_ID, CATASTRO_SOURCE_ID).withProperties(
            fillColor(Color.rgb(222, 168, 54)),
            fillOpacity(0.16f),
        ),
    )
    style.addLayer(
        LineLayer(CATASTRO_LINE_LAYER_ID, CATASTRO_SOURCE_ID).withProperties(
            lineColor(Color.rgb(181, 118, 17)),
            lineWidth(2.0f),
        ),
    )
}

private fun updatePnoaLayer(style: Style, enabled: Boolean) {
    if (style.getSource(PNOA_SOURCE_ID) == null) {
        val tileSet = TileSet("2.2.0", PNOA_WMTS_TILE_URL).apply {
            attribution = "Ortofoto PNOA · Instituto Geográfico Nacional"
        }
        style.addSource(RasterSource(PNOA_SOURCE_ID, tileSet, 256))

        val rasterLayer = RasterLayer(PNOA_LAYER_ID, PNOA_SOURCE_ID).withProperties(
            rasterOpacity(1.0f),
            visibility(if (enabled) "visible" else "none"),
        )

        if (style.getLayer(PLOTS_FILL_LAYER_ID) != null) {
            style.addLayerBelow(rasterLayer, PLOTS_FILL_LAYER_ID)
        } else {
            style.addLayer(rasterLayer)
        }
        return
    }

    style.getLayer(PNOA_LAYER_ID)?.setProperties(
        visibility(if (enabled) "visible" else "none"),
    )
}

@SuppressLint("MissingPermission")
private fun enableUserLocation(
    context: Context,
    map: MapLibreMap,
    style: Style,
) {
    if (!context.hasLocationPermission()) return

    val component = map.locationComponent
    if (!component.isLocationComponentActivated) {
        component.activateLocationComponent(
            LocationComponentActivationOptions
                .builder(context, style)
                .useDefaultLocationEngine(true)
                .build(),
        )
    }

    component.setLocationComponentEnabled(true)
    component.setCameraMode(CameraMode.TRACKING)

    val current = map.cameraPosition
    if (current.zoom < 16.0) {
        map.cameraPosition = CameraPosition.Builder()
            .target(current.target)
            .zoom(16.5)
            .bearing(current.bearing)
            .tilt(current.tilt)
            .build()
    }
}

private fun Context.hasLocationPermission(): Boolean {
    return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
}

private fun plotsFeatureCollection(plots: List<PlotEntity>): String {
    val features = JSONArray()

    plots.forEach { plot ->
        val boundary = plot.boundaryGeoJson ?: return@forEach
        val geometry = runCatching { JSONObject(boundary) }.getOrNull() ?: return@forEach
        val properties = JSONObject()
            .put("id", plot.id)
            .put("name", plot.name)
            .put("cadastralReference", plot.cadastralReference ?: JSONObject.NULL)
            .put("boundarySource", plot.boundarySource ?: JSONObject.NULL)

        features.put(
            JSONObject()
                .put("type", "Feature")
                .put("properties", properties)
                .put("geometry", geometry),
        )
    }

    return JSONObject()
        .put("type", "FeatureCollection")
        .put("features", features)
        .toString()
}

private fun catastroFeatureCollection(parcels: List<CatastroParcel>): String {
    val features = JSONArray()

    parcels.forEach { parcel ->
        val geometry = runCatching { JSONObject(parcel.geometryGeoJson) }.getOrNull()
            ?: return@forEach

        features.put(
            JSONObject()
                .put("type", "Feature")
                .put(
                    "properties",
                    JSONObject()
                        .put("cadastralReference", parcel.cadastralReference)
                        .put("areaM2", parcel.areaM2 ?: JSONObject.NULL),
                )
                .put("geometry", geometry),
        )
    }

    return JSONObject()
        .put("type", "FeatureCollection")
        .put("features", features)
        .toString()
}

private fun parcelContains(
    parcel: CatastroParcel,
    longitude: Double,
    latitude: Double,
): Boolean {
    val geometry = runCatching { JSONObject(parcel.geometryGeoJson) }.getOrNull()
        ?: return false
    val coordinates = geometry.optJSONArray("coordinates") ?: return false

    return when (geometry.optString("type")) {
        "Polygon" -> polygonContains(coordinates, longitude, latitude)
        "MultiPolygon" -> {
            (0 until coordinates.length()).any { index ->
                val polygon = coordinates.optJSONArray(index) ?: return@any false
                polygonContains(polygon, longitude, latitude)
            }
        }
        else -> false
    }
}

private fun polygonContains(
    rings: JSONArray,
    longitude: Double,
    latitude: Double,
): Boolean {
    val outer = rings.optJSONArray(0) ?: return false
    if (!ringContains(outer, longitude, latitude)) return false

    for (index in 1 until rings.length()) {
        val hole = rings.optJSONArray(index) ?: continue
        if (ringContains(hole, longitude, latitude)) return false
    }
    return true
}

private fun ringContains(
    ring: JSONArray,
    longitude: Double,
    latitude: Double,
): Boolean {
    if (ring.length() < 4) return false

    var inside = false
    var previousIndex = ring.length() - 1

    for (index in 0 until ring.length()) {
        val current = ring.optJSONArray(index) ?: continue
        val previous = ring.optJSONArray(previousIndex) ?: continue

        val currentX = current.optDouble(0)
        val currentY = current.optDouble(1)
        val previousX = previous.optDouble(0)
        val previousY = previous.optDouble(1)

        val crosses = (currentY > latitude) != (previousY > latitude)
        if (crosses) {
            val denominator = previousY - currentY
            if (denominator != 0.0) {
                val intersectionX =
                    (previousX - currentX) * (latitude - currentY) / denominator + currentX
                if (longitude < intersectionX) inside = !inside
            }
        }

        previousIndex = index
    }

    return inside
}

private fun Context.findActivity(): ComponentActivity {
    var current: Context = this
    while (current is ContextWrapper) {
        if (current is ComponentActivity) return current
        current = current.baseContext
    }
    error("PlotMapScreen requires a ComponentActivity context")
}
