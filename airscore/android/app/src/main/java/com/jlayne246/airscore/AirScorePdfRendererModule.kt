package com.jlayne246.airscore

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

        try {
            val pdfPath = options.getString("pdfPath")
                ?: throw IllegalArgumentException("pdfPath is required")

            val pageNumber = options.getInt("page") // 1-based
            val width = options.getInt("width")
            val height = options.getInt("height")

            val file = resolveFile(pdfPath)

            val pdfKey = file.absolutePath.hashCode()

            descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(descriptor)

            val pageIndex = pageNumber - 1

            if (pageIndex < 0 || pageIndex >= renderer.pageCount) {
                throw IllegalArgumentException("Invalid page number: $pageNumber")
            }

            page = renderer.openPage(pageIndex)

            val pageWidth = page.width
            val pageHeight = page.height

            val pageRatio = pageWidth.toFloat() / pageHeight.toFloat()
            val requestedRatio = width.toFloat() / height.toFloat()

            val renderWidth: Int
            val renderHeight: Int

            if (requestedRatio > pageRatio) {
                renderHeight = height
                renderWidth = (height * pageRatio).toInt()
            } else {
                renderWidth = width
                renderHeight = (width / pageRatio).toInt()
            }

            if (renderWidth <= 0 || renderHeight <= 0) {
                throw IllegalArgumentException(
                    "Invalid render size: ${renderWidth}x${renderHeight}"
                )
            }

            Log.d(
                "AriaScorePdfRenderer",
                "Requested=${width}x${height}, Rendered=${renderWidth}x${renderHeight}, PDF=${pageWidth}x${pageHeight}, Page=$pageNumber"
            )

            val bitmap = Bitmap.createBitmap(
                renderWidth,
                renderHeight,
                Bitmap.Config.ARGB_8888
            )

            bitmap.eraseColor(Color.WHITE)

            val destRect = Rect(
                0,
                0,
                renderWidth,
                renderHeight
            )

            page.render(
                bitmap,
                destRect,
                null,
                PdfRenderer.Page.RENDER_MODE_FOR_PRINT
            )

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

            FileOutputStream(outputFile).use { output ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
            }

            bitmap.recycle()

            val result = Arguments.createMap()
            result.putString("uri", Uri.fromFile(outputFile).toString())
            result.putInt("width", renderWidth)
            result.putInt("height", renderHeight)
            result.putInt("page", pageNumber)
            result.putInt("totalPages", renderer.pageCount)
            result.putDouble("aspectRatio", pageWidth.toDouble() / pageHeight.toDouble())

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("RENDER_PAGE_ERROR", e)
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
