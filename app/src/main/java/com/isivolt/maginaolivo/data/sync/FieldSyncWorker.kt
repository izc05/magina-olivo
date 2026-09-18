package com.isivolt.maginaolivo.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.isivolt.maginaolivo.MaginaOlivoApplication
import com.isivolt.maginaolivo.data.remote.SupabaseProvider

class FieldSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val application = applicationContext as? MaginaOlivoApplication
            ?: return Result.failure()

        val client = SupabaseProvider.client
            ?: return Result.retry()

        val processor = FieldSyncProcessor(
            local = RoomFieldSyncLocalStore(application.database),
            remote = SupabaseFieldRemoteGateway(client),
        )

        repeat(MAX_BATCHES_PER_RUN) {
            val result = processor.processPending(limit = BATCH_SIZE)

            if (result.failedCount > 0) {
                return Result.retry()
            }

            val hasMore = application.database
                .syncOutboxDao()
                .pending(limit = 1)
                .isNotEmpty()

            if (!hasMore) {
                return Result.success()
            }
        }

        return Result.retry()
    }

    private companion object {
        const val BATCH_SIZE = 50
        const val MAX_BATCHES_PER_RUN = 10
    }
}
