package expo.modules.ariascorefileexporter

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream

class AriaScoreFileExporterModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("AriaScoreFileExporter")

        AsyncFunction("exportFile") {
            sourceFileUri: String,
            destinationContentUri: String ->

            val context =
                appContext.reactContext
                    ?: throw IllegalStateException(
                        "React context is unavailable."
                    )

            try {
                val sourceUri =
                    Uri.parse(sourceFileUri)

                val sourcePath =
                    sourceUri.path
                        ?: throw IllegalArgumentException(
                            "The source file URI has no path."
                        )

                val sourceFile =
                    File(sourcePath)

                if (!sourceFile.exists()) {
                    throw IllegalArgumentException(
                        "The source backup file does not exist."
                    )
                }

                if (!sourceFile.isFile) {
                    throw IllegalArgumentException(
                        "The source URI does not refer to a file."
                    )
                }

                val destinationUri =
                    Uri.parse(
                        destinationContentUri
                    )

                context.contentResolver
                    .openOutputStream(
                        destinationUri,
                        "w"
                    )
                    ?.use { output ->
                        FileInputStream(
                            sourceFile
                        ).use { input ->
                            val buffer =
                                ByteArray(
                                    64 * 1024
                                )

                            while (true) {
                                val bytesRead =
                                    input.read(
                                        buffer
                                    )

                                if (bytesRead < 0) {
                                    break
                                }

                                output.write(
                                    buffer,
                                    0,
                                    bytesRead
                                )
                            }

                            output.flush()
                        }
                    }
                    ?: throw IllegalStateException(
                        "The selected destination could not be opened."
                    )
            } catch (error: Exception) {
                throw FileExportException(
                    "The backup could not be written to the selected location.",
                    error
                )
            }
        }
    }
}

class FileExportException(
    message: String,
    cause: Throwable? = null
) : Exception(
    message,
    cause
)