package com.isivoltpro.maginaolivo.data.repository

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import androidx.room.withTransaction
import com.isivoltpro.maginaolivo.data.local.MaginaOlivoDatabase
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.security.MessageDigest
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.coroutineContext

/** G1 prerequisite only. A receipt grants neither account ownership nor permission to sync. */
class LocalLinkBackup(context: Context, private val database: MaginaOlivoDatabase) {
    private val root = File(context.noBackupFilesDir, "account-link-backups")
    private val resolver = context.contentResolver

    data class Receipt(val directory: File, val tableCounts: Map<String, Long>, val documentCount: Int)

    /** Stable operation IDs resume an immutable checkpoint, never a fresh inventory for consent. */
    suspend fun capture(operationId: UUID): Receipt = withContext(Dispatchers.IO) {
        val target = File(root, operationId.toString())
        if (target.exists()) return@withContext verify(target, operationId)
        if (!root.mkdirs() && !root.isDirectory) throw IOException("backup_directory_unavailable")
        val staging = File(root, ".$operationId-${UUID.randomUUID()}.partial")
        if (!staging.mkdirs()) throw IOException("backup_directory_unavailable")
        try {
            val counts = linkedMapOf<String, Long>()
            val documents = JSONArray()
            database.withTransaction {
                val source = database.openHelper.writableDatabase
                val schemas = mutableListOf<Triple<String, String, String>>()
                source.query("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END,name").use { c ->
                    while (c.moveToNext()) schemas.add(Triple(c.getString(0), c.getString(1), c.getString(2)))
                }
                SQLiteDatabase.openOrCreateDatabase(File(staging, "room.db"), null).use { copy ->
                    copy.beginTransaction()
                    try {
                        schemas.filter { it.first == "table" }.forEach { (_, name, sql) ->
                            coroutineContext.ensureActive()
                            // Android creates this locale table when opening the destination.
                            // Replace it only in the new copy, preserving the source schema/rows.
                            if (name == "android_metadata") copy.execSQL("DROP TABLE IF EXISTS android_metadata")
                            copy.execSQL(sql)
                            source.query("SELECT * FROM ${quote(name)}").use { c ->
                                val insert = "INSERT INTO ${quote(name)} VALUES (${List(c.columnCount) { "?" }.joinToString(",")})"
                                copy.compileStatement(insert).use { statement ->
                                    var count = 0L
                                    while (c.moveToNext()) {
                                        coroutineContext.ensureActive()
                                        statement.clearBindings()
                                        for (column in 0 until c.columnCount) {
                                            val index = column + 1
                                            when (c.getType(column)) {
                                                Cursor.FIELD_TYPE_NULL -> statement.bindNull(index)
                                                Cursor.FIELD_TYPE_INTEGER -> statement.bindLong(index, c.getLong(column))
                                                Cursor.FIELD_TYPE_FLOAT -> statement.bindDouble(index, c.getDouble(column))
                                                Cursor.FIELD_TYPE_BLOB -> statement.bindBlob(index, c.getBlob(column))
                                                else -> statement.bindString(index, c.getString(column))
                                            }
                                        }
                                        statement.executeInsert(); count++
                                    }
                                    counts[name] = count
                                }
                            }
                        }
                        schemas.filter { it.first != "table" }.forEach { copy.execSQL(it.third) }
                        copy.version = source.version
                        copy.setTransactionSuccessful()
                    } finally { copy.endTransaction() }
                    checkDatabase(copy)
                }
                val files = File(staging, "files")
                if (!files.mkdir()) throw IOException("backup_directory_unavailable")
                source.query("SELECT id,local_uri,file_size_bytes,sha256 FROM documents ORDER BY id").use { c ->
                    while (c.moveToNext()) {
                        coroutineContext.ensureActive()
                        val uri = Uri.parse(c.getString(1))
                        if (uri.scheme !in setOf("file", "content")) throw IOException("backup_unreadable_document")
                        val relative = "files/${documents.length()}"
                        val file = File(staging, relative)
                        val input = resolver.openInputStream(uri) ?: throw IOException("backup_unreadable_document")
                        input.use { stream -> FileOutputStream(file).use { output ->
                            val buffer = ByteArray(64 * 1024)
                            while (true) {
                                coroutineContext.ensureActive()
                                val size = stream.read(buffer)
                                if (size < 0) break
                                output.write(buffer, 0, size)
                            }
                            output.fd.sync()
                        } }
                        if (file.length() == 0L) throw IOException("backup_empty_document")
                        val digest = sha256(file)
                        if ((!c.isNull(2) && c.getLong(2) != file.length()) ||
                            (!c.isNull(3) && !c.getString(3).equals(digest, ignoreCase = true))) {
                            throw IOException("backup_document_mismatch")
                        }
                        documents.put(JSONObject().put("id", c.getString(0)).put("file", relative)
                            .put("bytes", file.length()).put("sha256", digest))
                    }
                }
            }
            val dbFile = File(staging, "room.db")
            val manifest = JSONObject().put("format", 1).put("operationId", operationId.toString())
                .put("schemaVersion", MaginaOlivoDatabase.VERSION).put("tables", JSONObject(counts as Map<*, *>))
                .put("databaseSha256", sha256(dbFile)).put("documents", documents)
            FileOutputStream(File(staging, "manifest.json")).use { out ->
                out.write(manifest.toString().toByteArray(Charsets.UTF_8)); out.fd.sync()
            }
            verify(staging, operationId)
            coroutineContext.ensureActive()
            // A concurrent caller may have published this operation first. Never overwrite it.
            if (!staging.renameTo(target)) {
                if (target.isDirectory) return@withContext verify(target, operationId)
                throw IOException("backup_publish_failed")
            }
            verify(target, operationId)
        } finally {
            // Only this call's random private staging directory is eligible for cleanup.
            if (staging.exists()) staging.deleteRecursively()
        }
    }

    private suspend fun verify(directory: File, operationId: UUID): Receipt {
        try {
            val manifest = JSONObject(File(directory, "manifest.json").readText())
            if (manifest.getInt("format") != 1) throw IOException("backup_format_unsupported")
            if (manifest.getString("operationId") != operationId.toString()) throw IOException("backup_operation_mismatch")
            val file = File(directory, "room.db")
            if (sha256(file) != manifest.getString("databaseSha256")) throw IOException("backup_database_mismatch")
            val counts = manifest.getJSONObject("tables").let { tables ->
                tables.keys().asSequence().associateWith { tables.getLong(it) }
            }
            val documents = manifest.getJSONArray("documents")
            SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
                checkDatabase(db)
                if (db.version != manifest.getInt("schemaVersion")) throw IOException("backup_schema_mismatch")
                val actual = linkedMapOf<String, Long>()
                db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", null).use { c ->
                    while (c.moveToNext()) {
                        coroutineContext.ensureActive()
                        val table = c.getString(0)
                        db.rawQuery("SELECT COUNT(*) FROM ${quote(table)}", null).use { rows ->
                            rows.moveToFirst(); actual[table] = rows.getLong(0)
                        }
                    }
                }
                if (actual != counts) throw IOException("backup_table_inventory_mismatch")
                db.rawQuery("SELECT id,file_size_bytes,sha256 FROM documents ORDER BY id", null).use { c ->
                    if (c.count != documents.length()) throw IOException("backup_document_inventory_mismatch")
                    var index = 0
                    while (c.moveToNext()) {
                        val document = documents.getJSONObject(index++)
                        if (document.getString("id") != c.getString(0) ||
                            (!c.isNull(1) && c.getLong(1) != document.getLong("bytes")) ||
                            (!c.isNull(2) && !c.getString(2).equals(document.getString("sha256"), ignoreCase = true))) {
                            throw IOException("backup_document_inventory_mismatch")
                        }
                    }
                }
            }
            for (index in 0 until documents.length()) {
                val document = documents.getJSONObject(index)
                if (document.getString("file") != "files/$index") throw IOException("backup_invalid_path")
                val binary = File(directory, "files/$index")
                if (binary.length() <= 0 || binary.length() != document.getLong("bytes") ||
                    sha256(binary) != document.getString("sha256")) throw IOException("backup_document_mismatch")
            }
            return Receipt(directory, counts, documents.length())
        } catch (e: CancellationException) { throw e }
        catch (e: IOException) { throw e }
        catch (e: Exception) { throw IOException("backup_verification_failed", e) }
    }

    private fun checkDatabase(db: SQLiteDatabase) {
        db.rawQuery("PRAGMA integrity_check", null).use { c ->
            if (!c.moveToFirst() || c.getString(0) != "ok") throw IOException("backup_database_integrity")
        }
        db.rawQuery("PRAGMA foreign_key_check", null).use { c ->
            if (c.moveToFirst()) throw IOException("backup_foreign_key_integrity")
        }
    }

    private suspend fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                coroutineContext.ensureActive()
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun quote(name: String) = "\"${name.replace("\"", "\"\"")}\""
}
