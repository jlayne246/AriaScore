package com.jlayne246.ariascore

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.util.Log
import android.net.Uri
import android.graphics.Rect
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import android.os.SystemClock

class AriaScorePdfRendererModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AriaScorePdfRenderer"
    }

    @ReactMethod
    fun getPageCount(pdfPath: String, promise: Promise) {
        try {
            val file = resolveFile(pdfPath)
            val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer = PdfRenderer(descriptor)

            val count = renderer.pageCount

            renderer.close()
            descriptor.close()

            promise.resolve(count)
        } catch (e: Exception) {
            promise.reject("PAGE_COUNT_ERROR", e)
        }
    }

    @ReactMethod
    fun renderPage(options: ReadableMap, promise: Promise) {
        var descriptor: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null
        var page: PdfRenderer.Page? = null

        val totalStart = SystemClock.elapsedRealtime()

        try {
            val pdfPath = options.getString("pdfPath")
                ?: throw IllegalArgumentException("pdfPath is required")

            val pageNumber = options.getInt("page") // 1-based
            val width = options.getInt("width")
            val height = options.getInt("height")

            val file = resolveFile(pdfPath)
            val pdfKey = file.absolutePath.hashCode()

            // 1. Open file descriptor
            val descriptorStart = SystemClock.elapsedRealtime()

            descriptor = ParcelFileDescriptor.open(
                file,
                ParcelFileDescriptor.MODE_READ_ONLY
            )

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber descriptor=${SystemClock.elapsedRealtime() - descriptorStart}ms"
            )

            // 2. Create PdfRenderer
            val rendererStart = SystemClock.elapsedRealtime()

            renderer = PdfRenderer(descriptor)

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber renderer=${SystemClock.elapsedRealtime() - rendererStart}ms"
            )

            val pageIndex = pageNumber - 1

            if (pageIndex < 0 || pageIndex >= renderer.pageCount) {
                throw IllegalArgumentException(
                    "Invalid page number: $pageNumber"
                )
            }

            // 3. Open the requested PDF page
            val openPageStart = SystemClock.elapsedRealtime()

            page = renderer.openPage(pageIndex)

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber openPage=${SystemClock.elapsedRealtime() - openPageStart}ms"
            )

            val pageWidth = page.width
            val pageHeight = page.height

            val pageRatio =
                pageWidth.toFloat() / pageHeight.toFloat()

            val requestedRatio =
                width.toFloat() / height.toFloat()

            val renderWidth: Int
            val renderHeight: Int

            if (requestedRatio > pageRatio) {
                renderHeight = height
                renderWidth =
                    (height * pageRatio).toInt()
            } else {
                renderWidth = width
                renderHeight =
                    (width / pageRatio).toInt()
            }

            if (renderWidth <= 0 || renderHeight <= 0) {
                throw IllegalArgumentException(
                    "Invalid render size: ${renderWidth}x${renderHeight}"
                )
            }

            Log.d(
                "AriaScorePdfRenderer",
                "Requested=${width}x${height}, " +
                    "Rendered=${renderWidth}x${renderHeight}, " +
                    "PDF=${pageWidth}x${pageHeight}, " +
                    "Page=$pageNumber"
            )

            // Prepare and save to cache directory
            val cacheDir = File(
                reactApplicationContext.cacheDir,
                "airscore-rendered-pages/$pdfKey"
            )

            if (!cacheDir.exists()) {
                cacheDir.mkdirs()
            }

            val outputFile = File(
                cacheDir,
                "page_${pageNumber}_${renderWidth}x${renderHeight}.png"
            )

            if (outputFile.exists() && outputFile.length() > 0L) {
                Log.d(
                    "AriaScorePerf",
                    "page=$pageNumber requested=${width}x${height} rendered=${renderWidth}x${renderHeight} CACHE_HIT"
                )

                val result = Arguments.createMap()

                result.putString(
                    "uri",
                    Uri.fromFile(outputFile).toString()
                )

                result.putInt(
                    "width",
                    renderWidth
                )

                result.putInt(
                    "height",
                    renderHeight
                )

                result.putInt(
                    "page",
                    pageNumber
                )

                result.putInt(
                    "totalPages",
                    renderer.pageCount
                )

                result.putDouble(
                    "aspectRatio",
                    pageWidth.toDouble() /
                        pageHeight.toDouble()
                )

                promise.resolve(result)

                return
            } else {
                Log.d(
                    "AriaScorePerf",
                    "page=$pageNumber requested=${width}x${height} rendered=${renderWidth}x${renderHeight} CACHE_MISS"
                )
            }

            // 4. Allocate bitmap
            val bitmapStart = SystemClock.elapsedRealtime()

            val bitmap = Bitmap.createBitmap(
                renderWidth,
                renderHeight,
                Bitmap.Config.ARGB_8888
            )

            bitmap.eraseColor(Color.WHITE)

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber bitmap=${SystemClock.elapsedRealtime() - bitmapStart}ms"
            )

            val destRect = Rect(
                0,
                0,
                renderWidth,
                renderHeight
            )

            // 5. Rasterise PDF page
            val renderStart = SystemClock.elapsedRealtime()

            page.render(
                bitmap,
                destRect,
                null,
                PdfRenderer.Page.RENDER_MODE_FOR_PRINT
            )

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber render=${SystemClock.elapsedRealtime() - renderStart}ms"
            )

            // 6. Compress and write PNG
            val pngStart = SystemClock.elapsedRealtime()

            FileOutputStream(outputFile).use { output ->
                bitmap.compress(
                    Bitmap.CompressFormat.PNG,
                    100,
                    output
                )
            }

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber png=${SystemClock.elapsedRealtime() - pngStart}ms"
            )

            bitmap.recycle()

            val result = Arguments.createMap()

            result.putString(
                "uri",
                Uri.fromFile(outputFile).toString()
            )
            result.putInt("width", renderWidth)
            result.putInt("height", renderHeight)
            result.putInt("page", pageNumber)
            result.putInt(
                "totalPages",
                renderer.pageCount
            )
            result.putDouble(
                "aspectRatio",
                pageWidth.toDouble() / pageHeight.toDouble()
            )

            Log.d(
                "AriaScorePerf",
                "page=$pageNumber TOTAL=${SystemClock.elapsedRealtime() - totalStart}ms"
            )

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(
                "AriaScorePerf",
                "renderPage failed after ${SystemClock.elapsedRealtime() - totalStart}ms",
                e
            )

            promise.reject(
                "RENDER_PAGE_ERROR",
                e
            )
        } finally {
            page?.close()
            renderer?.close()
            descriptor?.close()
        }
    }

    @ReactMethod
    fun clearCache(promise: Promise) {
        try {
            val cacheDir = File(
                reactApplicationContext.cacheDir,
                "airscore-rendered-pages"
            )

            cacheDir.deleteRecursively()
            cacheDir.mkdirs()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CACHE_CLEAR_ERROR", e)
        }
    }

    @ReactMethod
    fun clearDocumentCache(pdfPath: String, promise: Promise) {
        try {
            val file = resolveFile(pdfPath)
            val pdfKey = file.absolutePath.hashCode()
    
            val cacheDir = File(
                reactApplicationContext.cacheDir,
                "airscore-rendered-pages/$pdfKey"
            )
    
            cacheDir.deleteRecursively()
            cacheDir.mkdirs()
    
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DOCUMENT_CACHE_CLEAR_ERROR", e)
        }
    }

    private fun resolveFile(pathOrUri: String): File {
        val cleanedPath =
            if (pathOrUri.startsWith("file://")) {
                Uri.parse(pathOrUri).path ?: pathOrUri
            } else {
                pathOrUri
            }

        return File(cleanedPath)
    }
}
