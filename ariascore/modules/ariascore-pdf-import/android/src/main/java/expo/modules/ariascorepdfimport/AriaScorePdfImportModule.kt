package expo.modules.ariascorepdfimport

import android.net.Uri
import android.provider.OpenableColumns
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

class AriaScorePdfImportModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("AriaScorePdfImport")

    AsyncFunction("importPdf") { sourceUriString: String ->
      val context =
        appContext.reactContext
          ?: throw IllegalStateException(
            "React context is unavailable."
          )

      try {
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
          val nameIndex =
            cursor.getColumnIndex(
              OpenableColumns.DISPLAY_NAME
            )

          if (
            cursor.moveToFirst() &&
            nameIndex >= 0
          ) {
            displayName =
              cursor.getString(nameIndex)
                ?: displayName
          }
        }

        if (
          !displayName
            .lowercase()
            .endsWith(".pdf")
        ) {
          displayName += ".pdf"
        }

        val scoresDir =
          File(
            context.filesDir,
            "scores"
          )

        if (
          !scoresDir.exists() &&
          !scoresDir.mkdirs()
        ) {
          throw Exception(
            "Could not create scores directory."
          )
        }

        val safeInternalName =
          "${System.currentTimeMillis()}-${
            displayName.replace(
              Regex("[^A-Za-z0-9._-]"),
              "_"
            )
          }"

        val destinationFile =
          File(
            scoresDir,
            safeInternalName
          )

        contentResolver
          .openInputStream(sourceUri)
          ?.use { input ->
            FileOutputStream(
              destinationFile
            ).use { output ->
              input.copyTo(output)
            }
          }
          ?: throw Exception(
            "Could not open source PDF."
          )

        mapOf(
          "uri" to
            Uri.fromFile(
              destinationFile
            ).toString(),

          "originalFilename" to
            displayName
        )
      } catch (error: Exception) {
        throw PdfImportException(
          "PDF import failed.",
          error
        )
      }
    }
  }
}

class PdfImportException(
  message: String,
  cause: Throwable? = null
) : Exception(message, cause)