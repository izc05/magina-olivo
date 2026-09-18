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
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.isivolt.maginaolivo.data.local.PlotEntity
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
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val activity = remember(context) { context.findActivity() }
    val geoJson = remember(plots) { plotsFeatureCollection(plots) }
    val mapView = remember {
        MapView(context).also { it.onCreate(null) }
    }

    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var loadedStyle by remember { mutableStateOf<Style?>(null) }
    var pnoaEnabled by remember { mutableStateOf(false) }
    var locationRequested by remember { mutableStateOf(false) }

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

        fun configureStyle(style: Style) {
            loadedStyle = style
            attachPlotLayers(style, geoJson)
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
            map = readyMap
            readyMap.cameraPosition = CameraPosition.Builder()
                .target(LatLng(37.75, -3.45))
                .zoom(10.5)
                .build()
            readyMap.setStyle(Style.Builder().fromUri(ONLINE_STYLE_URI), ::configureStyle)
        }

        onDispose {
            mapView.removeOnDidFailLoadingMapListener(failedListener)
        }
    }

    LaunchedEffect(map, geoJson) {
        map?.style
            ?.getSourceAs<GeoJsonSource>(PLOTS_SOURCE_ID)
            ?.setGeoJson(geoJson)
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

private fun Context.findActivity(): ComponentActivity {
    var current: Context = this
    while (current is ContextWrapper) {
        if (current is ComponentActivity) return current
        current = current.baseContext
    }
    error("PlotMapScreen requires a ComponentActivity context")
}
