package com.isivolt.maginaolivo.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.isivolt.maginaolivo.domain.weather.WeatherRadarFeed
import com.isivolt.maginaolivo.domain.weather.WeatherRadarFrame
import com.isivolt.maginaolivo.domain.weather.WeatherRadarGateway
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class WeatherRadarRepository(
    private val gateway: WeatherRadarGateway?,
    context: Context,
) {
    private val cacheDirectory = File(context.cacheDir, "weather-radar").apply {
        mkdirs()
    }

    suspend fun loadFeed(): Result<WeatherRadarFeed> {
        val activeGateway = gateway
            ?: return Result.failure(
                IllegalStateException("Supabase no está configurado."),
            )

        return activeGateway.getFrames()
    }

    suspend fun loadBitmap(
        frame: WeatherRadarFrame,
    ): Result<Bitmap> = withContext(Dispatchers.IO) {
        runCatching {
            val cacheFile = File(cacheDirectory, frame.sha256 + ".img")
            if (cacheFile.isFile && cacheFile.length() > 0L) {
                BitmapFactory.decodeFile(cacheFile.absolutePath)?.let { bitmap ->
                    return@runCatching bitmap
                }
            }

            val connection = (URL(frame.imageUrl).openConnection() as HttpURLConnection).apply {
                connectTimeout = 12_000
                readTimeout = 12_000
                requestMethod = "GET"
                instanceFollowRedirects = true
            }

            try {
                connection.connect()
                if (connection.responseCode !in 200..299) {
                    error("No se ha podido descargar el fotograma del radar.")
                }

                val bytes = connection.inputStream.use { stream ->
                    stream.readBytes()
                }

                if (bytes.isEmpty()) {
                    error("El fotograma del radar está vacío.")
                }

                cacheFile.writeBytes(bytes)
                pruneDiskCache()

                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    ?: error("Android no ha podido decodificar el radar.")
            } finally {
                connection.disconnect()
            }
        }
    }

    private fun pruneDiskCache() {
        val files = cacheDirectory.listFiles()
            ?.filter { it.isFile }
            ?.sortedByDescending { it.lastModified() }
            .orEmpty()

        files.drop(MAX_LOCAL_FRAMES).forEach { file ->
            runCatching { file.delete() }
        }
    }

    private companion object {
        const val MAX_LOCAL_FRAMES = 8
    }
}
