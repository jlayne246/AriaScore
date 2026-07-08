package com.jlayne246.airscore

import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.io.FileOutputStream

class AriaScorePdfImportModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "AriaScorePdfImporter"
  }

  @ReactMethod
  fun importPdf(sourceUriString: String, promise: Promise) {
    try {
      val context = reactApplicationContext
      val sourceUri = Uri.parse(sourceUriString)
      val contentResolver = context.contentResolver

      var displayName = "Imported PDF.pdf"

      contentResolver.query(
        sourceUri,
        arrayOf(OpenableColumns.DISPLAY_NAME),
        null,
        null,
        null
      )?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)

        if (cursor.moveToFirst() && nameIndex >= 0) {
          displayName = cursor.getString(nameIndex) ?: displayName
        }
      }

      if (!displayName.lowercase().endsWith(".pdf")) {
        displayName += ".pdf"
      }

      val scoresDir = File(context.filesDir, "scores")
      if (!scoresDir.exists()) {
        scoresDir.mkdirs()
      }

      val safeInternalName =
        "${System.currentTimeMillis()}-${displayName.replace(Regex("[^A-Za-z0-9._-]"), "_")}"

      val destinationFile = File(scoresDir, safeInternalName)

      contentResolver.openInputStream(sourceUri)?.use { input ->
        FileOutputStream(destinationFile).use { output ->
          input.copyTo(output)
        }
      } ?: throw Exception("Could not open source PDF")

      val result = WritableNativeMap()
      result.putString("uri", Uri.fromFile(destinationFile).toString())
      result.putString("originalFilename", displayName)

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("PDF_IMPORT_FAILED", error.message, error)
    }
  }
}