package expo.modules.ariascorepdfrenderer

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Rect
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream

class RenderPageOptions : Record {
    @Field
    lateinit var pdfPath: String

    @Field
    var page: Int = 1

    @Field
    var width: Int = 0

    @Field
    var height: Int = 0
}

class AriaScorePdfRendererModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("AriaScorePdfRenderer")

        AsyncFunction("getPageCount") {
            pdfPath: String ->

            val file = resolveFile(pdfPath)

            ParcelFileDescriptor.open(
                file,
                ParcelFileDescriptor.MODE_READ_ONLY
            ).use { descriptor ->
                PdfRenderer(descriptor).use { renderer ->
                    renderer.pageCount
                }
            }
        }

        AsyncFunction("renderPage") {
            options: RenderPageOptions ->

            renderPage(
                pdfPath = options.pdfPath,
                pageNumber = options.page,
                width = options.width,
                height = options.height
            )
        }

        AsyncFunction("clearCache") {
            clearCache()
        }

        AsyncFunction("clearDocumentCache") {
            pdfPath: String ->

            clearDocumentCache(pdfPath)
        }
    }

    private fun renderPage(
        pdfPath: String,
        pageNumber: Int,
        width: Int,
        height: Int
    ): Map<String, Any> {
        var descriptor: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null
        var page: PdfRenderer.Page? = null

        val totalStart =
            SystemClock.elapsedRealtime()

        try {
            if (width <= 0 || height <= 0) {
                throw IllegalArgumentException(
                    "Invalid requested render size: ${width}x${height}"
                )
            }

            val file =
                resolveFile(pdfPath)

            val pdfKey =
                file.absolutePath.hashCode()

            // 1. Open file descriptor
            val descriptorStart =
                SystemClock.elapsedRealtime()

            descriptor =
                ParcelFileDescriptor.open(
                    file,
                    ParcelFileDescriptor.MODE_READ_ONLY
                )

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber descriptor=" +
                    "${SystemClock.elapsedRealtime() - descriptorStart}ms"
            )

            // 2. Create PdfRenderer
            val rendererStart =
                SystemClock.elapsedRealtime()

            renderer =
                PdfRenderer(descriptor)

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber renderer=" +
                    "${SystemClock.elapsedRealtime() - rendererStart}ms"
            )

            val pageIndex =
                pageNumber - 1

            if (
                pageIndex < 0 ||
                pageIndex >= renderer.pageCount
            ) {
                throw IllegalArgumentException(
                    "Invalid page number: $pageNumber"
                )
            }

            // 3. Open requested PDF page
            val openPageStart =
                SystemClock.elapsedRealtime()

            page =
                renderer.openPage(pageIndex)

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber openPage=" +
                    "${SystemClock.elapsedRealtime() - openPageStart}ms"
            )

            val pageWidth =
                page.width

            val pageHeight =
                page.height

            val pageRatio =
                pageWidth.toFloat() /
                    pageHeight.toFloat()

            val requestedRatio =
                width.toFloat() /
                    height.toFloat()

            val renderWidth: Int
            val renderHeight: Int

            if (requestedRatio > pageRatio) {
                renderHeight = height
                renderWidth =
                    (height * pageRatio)
                        .toInt()
            } else {
                renderWidth = width
                renderHeight =
                    (width / pageRatio)
                        .toInt()
            }

            if (
                renderWidth <= 0 ||
                renderHeight <= 0
            ) {
                throw IllegalArgumentException(
                    "Invalid render size: " +
                        "${renderWidth}x${renderHeight}"
                )
            }

            Log.d(
                "AriaScorePdfRenderer",
                "Requested=${width}x${height}, " +
                    "Rendered=${renderWidth}x${renderHeight}, " +
                    "PDF=${pageWidth}x${pageHeight}, " +
                    "Page=$pageNumber"
            )

            val context =
                appContext.reactContext
                    ?: throw IllegalStateException(
                        "React context is unavailable."
                    )

            // Cache directory for this PDF
            val cacheDir =
                File(
                    context.cacheDir,
                    "ariascore-rendered-pages/$pdfKey"
                )

            if (
                !cacheDir.exists() &&
                !cacheDir.mkdirs()
            ) {
                throw IllegalStateException(
                    "Could not create PDF render cache directory."
                )
            }

            val outputFile =
                File(
                    cacheDir,
                    "page_${pageNumber}_${renderWidth}x${renderHeight}.png"
                )

            // Cache hit
            if (
                outputFile.exists() &&
                outputFile.length() > 0L
            ) {
                Log.d(
                    "AriaScorePerf",
                    "page=$pageNumber " +
                        "requested=${width}x${height} " +
                        "rendered=${renderWidth}x${renderHeight} " +
                        "CACHE_HIT"
                )

                return createResult(
                    outputFile = outputFile,
                    width = renderWidth,
                    height = renderHeight,
                    pageNumber = pageNumber,
                    totalPages = renderer.pageCount,
                    pageWidth = pageWidth,
                    pageHeight = pageHeight
                )
            }

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber " +
                    "requested=${width}x${height} " +
                    "rendered=${renderWidth}x${renderHeight} " +
                    "CACHE_MISS"
            )

            // 4. Allocate bitmap
            val bitmapStart =
                SystemClock.elapsedRealtime()

            val bitmap =
                Bitmap.createBitmap(
                    renderWidth,
                    renderHeight,
                    Bitmap.Config.ARGB_8888
                )

            try {
                bitmap.eraseColor(
                    Color.WHITE
                )

                Log.d(
                    "AriaScorePerf",
                    "page=$pageNumber bitmap=" +
                        "${SystemClock.elapsedRealtime() - bitmapStart}ms"
                )

                val destRect =
                    Rect(
                        0,
                        0,
                        renderWidth,
                        renderHeight
                    )

                // 5. Rasterise PDF page
                val renderStart =
                    SystemClock.elapsedRealtime()

                page.render(
                    bitmap,
                    destRect,
                    null,
                    PdfRenderer.Page.RENDER_MODE_FOR_PRINT
                )

                Log.d(
                    "AriaScorePerf",
                    "page=$pageNumber render=" +
                        "${SystemClock.elapsedRealtime() - renderStart}ms"
                )

                // 6. Compress and write PNG
                val pngStart =
                    SystemClock.elapsedRealtime()

                FileOutputStream(
                    outputFile
                ).use { output ->
                    val compressed =
                        bitmap.compress(
                            Bitmap.CompressFormat.PNG,
                            100,
                            output
                        )

                    if (!compressed) {
                        throw IllegalStateException(
                            "The rendered PDF page could not be encoded as PNG."
                        )
                    }
                }

                Log.d(
                    "AriaScorePerf",
                    "page=$pageNumber png=" +
                        "${SystemClock.elapsedRealtime() - pngStart}ms"
                )
            } finally {
                bitmap.recycle()
            }

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber TOTAL=" +
                    "${SystemClock.elapsedRealtime() - totalStart}ms"
            )

            return createResult(
                outputFile = outputFile,
                width = renderWidth,
                height = renderHeight,
                pageNumber = pageNumber,
                totalPages = renderer.pageCount,
                pageWidth = pageWidth,
                pageHeight = pageHeight
            )
        } catch (error: Exception) {
            Log.e(
                "AriaScorePerf",
                "renderPage failed after " +
                    "${SystemClock.elapsedRealtime() - totalStart}ms",
                error
            )

            throw Exception(
                "The PDF page could not be rendered.",
                error
            )
        } finally {
            page?.close()
            renderer?.close()
            descriptor?.close()
        }
    }

    private fun clearCache(): Boolean {
        val context =
            appContext.reactContext
                ?: throw IllegalStateException(
                    "React context is unavailable."
                )

        val cacheDir =
            File(
                context.cacheDir,
                "ariascore-rendered-pages"
            )

        if (
            cacheDir.exists() &&
            !cacheDir.deleteRecursively()
        ) {
            throw IllegalStateException(
                "Could not clear the PDF render cache."
            )
        }

        if (
            !cacheDir.exists() &&
            !cacheDir.mkdirs()
        ) {
            throw IllegalStateException(
                "Could not recreate the PDF render cache."
            )
        }

        return true
    }

    private fun clearDocumentCache(
        pdfPath: String
    ): Boolean {
        val context =
            appContext.reactContext
                ?: throw IllegalStateException(
                    "React context is unavailable."
                )

        val file =
            resolveFile(pdfPath)

        val pdfKey =
            file.absolutePath.hashCode()

        val cacheDir =
            File(
                context.cacheDir,
                "ariascore-rendered-pages/$pdfKey"
            )

        if (
            cacheDir.exists() &&
            !cacheDir.deleteRecursively()
        ) {
            throw IllegalStateException(
                "Could not clear the PDF document cache."
            )
        }

        if (
            !cacheDir.exists() &&
            !cacheDir.mkdirs()
        ) {
            throw IllegalStateException(
                "Could not recreate the PDF document cache."
            )
        }

        return true
    }

    private fun createResult(
        outputFile: File,
        width: Int,
        height: Int,
        pageNumber: Int,
        totalPages: Int,
        pageWidth: Int,
        pageHeight: Int
    ): Map<String, Any> {
        return mapOf(
            "uri" to
                Uri.fromFile(
                    outputFile
                ).toString(),

            "width" to
                width,

            "height" to
                height,

            "page" to
                pageNumber,

            "totalPages" to
                totalPages,

            "aspectRatio" to
                (
                    pageWidth.toDouble() /
                        pageHeight.toDouble()
                )
        )
    }

    private fun resolveFile(
        pathOrUri: String
    ): File {
        val cleanedPath =
            if (
                pathOrUri.startsWith(
                    "file://"
                )
            ) {
                Uri.parse(
                    pathOrUri
                ).path
                    ?: throw IllegalArgumentException(
                        "Invalid file URI: $pathOrUri"
                    )
            } else {
                pathOrUri
            }

        val file =
            File(cleanedPath)

        if (!file.exists()) {
            throw IllegalArgumentException(
                "PDF file does not exist: $cleanedPath"
            )
        }

        if (!file.isFile) {
            throw IllegalArgumentException(
                "PDF path does not refer to a file: $cleanedPath"
            )
        }

        return file
    }
}