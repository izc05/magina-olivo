package com.isivolt.maginaolivo.ui.map

import android.content.Context
import android.content.ContextWrapper
import android.graphics.Color
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
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
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.PropertyFactory.fillColor
import org.maplibre.android.style.layers.PropertyFactory.fillOpacity
import org.maplibre.android.style.layers.PropertyFactory.lineColor
import org.maplibre.android.style.layers.PropertyFactory.lineWidth
import org.maplibre.android.style.sources.GeoJsonSource

private const val ONLINE_STYLE_URI = "https://tiles.openfreemap.org/styles/liberty"
private const val PLOTS_SOURCE_ID = "my-plots"
private const val PLOTS_FILL_LAYER_ID = "my-plots-fill"
private const val PLOTS_LINE_LAYER_ID = "my-plots-line"

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
        val failedListener = MapView.OnDidFailLoadingMapListener {
            val currentMap = map ?: return@OnDidFailLoadingMapListener
            if (!fallbackLoaded) {
                fallbackLoaded = true
                currentMap.setStyle(Style.Builder().fromJson(OFFLINE_STYLE_JSON)) { style ->
                    attachPlotLayers(style, geoJson)
                }
            }
        }

        mapView.addOnDidFailLoadingMapListener(failedListener)
        mapView.getMapAsync { readyMap ->
            map = readyMap
            readyMap.cameraPosition = CameraPosition.Builder()
                .target(LatLng(37.75, -3.45))
                .zoom(10.5)
                .build()
            readyMap.setStyle(Style.Builder().fromUri(ONLINE_STYLE_URI)) { style ->
                attachPlotLayers(style, geoJson)
            }
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
