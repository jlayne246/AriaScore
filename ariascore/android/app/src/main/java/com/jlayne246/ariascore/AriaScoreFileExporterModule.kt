package com.jlayne246.ariascore

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

class AriaScoreFileExporterModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String =
        "AriaScoreFileExporter"

    @ReactMethod
    fun copyFileToContentUri(
        sourceFileUri: String,
        destinationContentUri: String,
        promise: Promise
    ) {
        try {
            val sourcePath =
                Uri.parse(sourceFileUri).path
                    ?: throw IllegalArgumentException(
                        "The source file URI has no path."
                    )

            val sourceFile = File(sourcePath)

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
                Uri.parse(destinationContentUri)

            val contentResolver =
                reactApplicationContext.contentResolver

            val outputStream =
                contentResolver.openOutputStream(
                    destinationUri,
                    "w"
                )
                    ?: throw IllegalStateException(
                        "The selected destination could not be opened."
                    )

            FileInputStream(sourceFile).use { input ->
                outputStream.use { output ->
                    val buffer =
                        ByteArray(64 * 1024)

                    while (true) {
                        val bytesRead =
                            input.read(buffer)

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

            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject(
                "BACKUP_EXPORT_FAILED",
                "The backup could not be written to the selected location.",
                error
            )
        }
    }
}