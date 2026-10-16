package com.isivoltpro.maginaolivo.data.local

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.isivoltpro.maginaolivo.data.repository.LocalLinkBackup
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test

/** Explicit two-process QA harness only. Never runs in ordinary CI discovery. */
class LocalLinkBackupProcessTest {
    @Test fun checkpointAcrossKilledProcess() = runBlocking {
        val arguments = InstrumentationRegistry.getArguments()
        val phase = arguments.getString("qaLinkPhase")
        assumeTrue(phase in listOf("interrupt", "recover"))
        val fixture = UUID.fromString(arguments.getString("qaLinkFixture"))
        val context = ApplicationProvider.getApplicationContext<Context>()
        assertEquals("com.isivoltpro.maginaolivo.dev", context.packageName)
        android.os.ParcelFileDescriptor.AutoCloseInputStream(InstrumentationRegistry.getInstrumentation()
            .uiAutomation.executeShellCommand("getprop ro.kernel.qemu")).bufferedReader().use { assertEquals("1", it.readText().trim()) }
        val name = "qa-link-process-$fixture.db"
        val database = MaginaOlivoDatabase.create(context, name)
        val photo = File(context.filesDir, "qa-link-process-$fixture.bin")
        val marker = File(context.noBackupFilesDir, "qa-link-process-$fixture.ready")
        val baselineId = UUID.nameUUIDFromBytes("baseline-$fixture".toByteArray())
        val root = File(context.noBackupFilesDir, "account-link-backups")
        if (phase == "interrupt") {
            photo.writeBytes(byteArrayOf(19, 0, -1, 7, 8, 6))
            val db = database.openHelper.writableDatabase
            db.execSQL("INSERT INTO workspaces (id,name,owner_user_id,country_code,timezone,locale,currency,created_at,updated_at,version,sync_status) VALUES ('w','QA','local','ES','Europe/Madrid','es-ES','EUR',1,1,1,'LOCAL_ONLY')")
            db.execSQL("INSERT INTO documents (id,workspace_id,owner_type,owner_id,type,mime_type,display_name,local_uri,upload_status,created_at,updated_at,version,sync_status) VALUES ('doc','w','WORKSPACE','w','PHOTO','application/octet-stream','QA',?,'LOCAL_ONLY',1,1,1,'LOCAL_ONLY')", arrayOf(photo.toURI().toString()))
            val baseline = LocalLinkBackup(context, database).capture(baselineId)
            val bytes = File(baseline.directory, "manifest.json").readBytes()
            val interrupt = LocalLinkBackup(context, database) { file ->
                object : FileOutputStream(file) {
                    override fun write(buffer: ByteArray, offset: Int, length: Int) {
                        super.write(buffer, offset, minOf(length, 2)); fd.sync()
                        FileOutputStream(marker).use { it.write(bytes); it.fd.sync() }
                        // External harness force-stops this process at a known partial-file checkpoint.
                        while (true) Thread.sleep(1000)
                    }
                }
            }
            interrupt.capture(fixture)
            fail("Harness must kill this process before publication")
        } else {
            try {
                assertTrue(marker.isFile)
                val partials = root.listFiles()!!.filter { it.name.startsWith(".$fixture-") }
                assertEquals(1, partials.size)
                assertEquals(2L, File(partials.single(), "files/0").length())
                assertFalse(File(root, fixture.toString()).exists())
                val recovered = LocalLinkBackup(context, database).capture(fixture)
                assertArrayEquals(photo.readBytes(), File(recovered.directory, "files/0").readBytes())
                assertArrayEquals(byteArrayOf(19, 0, -1, 7, 8, 6), photo.readBytes())
                assertArrayEquals(marker.readBytes(), File(root, "$baselineId/manifest.json").readBytes())
                assertEquals(1, database.openHelper.readableDatabase.query("SELECT * FROM documents").use { it.count })
                assertEquals(1, LocalLinkBackup(context, database).capture(fixture).documentCount)
            } finally {
                database.close(); context.deleteDatabase(name); photo.delete(); marker.delete()
                root.listFiles().orEmpty().filter { it.name == fixture.toString() || it.name == baselineId.toString() || it.name.startsWith(".$fixture-") }.forEach { it.deleteRecursively() }
            }
        }
    }
}
