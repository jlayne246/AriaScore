import ExpoModulesCore
import Foundation
import PDFKit
import UIKit
import CryptoKit

public class AriaScorePdfRendererModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AriaScorePdfRenderer")

    AsyncFunction("getPageCount") { (pdfPath: String) throws -> Int in
      guard let fileUrl = self.resolveUrl(pdfPath),
            let document = PDFDocument(url: fileUrl) else {
        throw RendererException(
          code: "PAGE_COUNT_ERROR",
          message: "Unable to open PDF"
        )
      }

      return document.pageCount
    }

    AsyncFunction("renderPage") {
      (options: [String: Any]) throws -> [String: Any] in

      guard let pdfPath = options["pdfPath"] as? String else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "pdfPath is required"
        )
      }

      guard let pageNumber = options["page"] as? Int else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "page is required"
        )
      }

      guard let width = options["width"] as? Int,
            let height = options["height"] as? Int else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "width and height are required"
        )
      }

      guard let fileUrl = self.resolveUrl(pdfPath),
            let document = PDFDocument(url: fileUrl) else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "Unable to open PDF"
        )
      }

      let pageIndex = pageNumber - 1

      guard pageIndex >= 0,
            pageIndex < document.pageCount else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "Invalid page number: \(pageNumber)"
        )
      }

      guard let page = document.page(at: pageIndex) else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "Unable to open page: \(pageNumber)"
        )
      }

      let pageBounds = page.bounds(for: .mediaBox)
      let pageWidth = pageBounds.width
      let pageHeight = pageBounds.height

      let pageRatio = pageWidth / pageHeight
      let requestedRatio =
        CGFloat(width) / CGFloat(height)

      let renderWidth: Int
      let renderHeight: Int

      if requestedRatio > pageRatio {
        renderHeight = height
        renderWidth =
          Int(CGFloat(height) * pageRatio)
      } else {
        renderWidth = width
        renderHeight =
          Int(CGFloat(width) / pageRatio)
      }

      guard renderWidth > 0,
            renderHeight > 0 else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message:
            "Invalid render size: \(renderWidth)x\(renderHeight)"
        )
      }

      let imageSize = CGSize(
        width: renderWidth,
        height: renderHeight
      )

      UIGraphicsBeginImageContextWithOptions(
        imageSize,
        true,
        1.0
      )

      guard let context =
        UIGraphicsGetCurrentContext() else {
        UIGraphicsEndImageContext()

        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "Unable to create graphics context"
        )
      }

      UIColor.white.set()

      context.fill(
        CGRect(
          origin: .zero,
          size: imageSize
        )
      )

      context.saveGState()

      context.translateBy(
        x: 0,
        y: imageSize.height
      )

      context.scaleBy(
        x: 1.0,
        y: -1.0
      )

      let scale = min(
        imageSize.width / pageBounds.width,
        imageSize.height / pageBounds.height
      )

      context.scaleBy(
        x: scale,
        y: scale
      )

      context.translateBy(
        x: -pageBounds.origin.x,
        y: -pageBounds.origin.y
      )

      page.draw(
        with: .mediaBox,
        to: context
      )

      context.restoreGState()

      guard let image =
        UIGraphicsGetImageFromCurrentImageContext() else {
        UIGraphicsEndImageContext()

        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "Unable to render page image"
        )
      }

      UIGraphicsEndImageContext()

      guard let pngData = image.pngData() else {
        throw RendererException(
          code: "RENDER_PAGE_ERROR",
          message: "Unable to encode PNG"
        )
      }

      let cacheDir =
        try self.getDocumentCacheDir(
          pdfPath: pdfPath
        )

      let outputFile =
        cacheDir.appendingPathComponent(
          "page_\(pageNumber)_\(renderWidth)x\(renderHeight).png"
        )

      try pngData.write(to: outputFile)

      return [
        "uri": outputFile.absoluteString,
        "width": renderWidth,
        "height": renderHeight,
        "page": pageNumber,
        "totalPages": document.pageCount,
        "aspectRatio": Double(pageRatio)
      ]
    }

    AsyncFunction("clearCache") { () throws -> Bool in
      let cacheRoot =
        try self.getCacheRoot()

      if FileManager.default.fileExists(
        atPath: cacheRoot.path
      ) {
        try FileManager.default.removeItem(
          at: cacheRoot
        )
      }

      try FileManager.default.createDirectory(
        at: cacheRoot,
        withIntermediateDirectories: true
      )

      return true
    }

    AsyncFunction("clearDocumentCache") {
      (pdfPath: String) throws -> Bool in

      let cacheDir =
        try self.getDocumentCacheDir(
          pdfPath: pdfPath
        )

      if FileManager.default.fileExists(
        atPath: cacheDir.path
      ) {
        try FileManager.default.removeItem(
          at: cacheDir
        )
      }

      try FileManager.default.createDirectory(
        at: cacheDir,
        withIntermediateDirectories: true
      )

      return true
    }
  }

  private func resolveUrl(
    _ pathOrUri: String
  ) -> URL? {
    if pathOrUri.hasPrefix("file://") {
      return URL(string: pathOrUri)
    }

    return URL(
      fileURLWithPath: pathOrUri
    )
  }

  private func getCacheRoot() throws -> URL {
    let cacheDir =
      FileManager.default.urls(
        for: .cachesDirectory,
        in: .userDomainMask
      )[0]

    let root =
      cacheDir.appendingPathComponent(
        "ariascore-rendered-pages"
      )

    try FileManager.default.createDirectory(
      at: root,
      withIntermediateDirectories: true
    )

    return root
  }

  private func getDocumentCacheDir(
    pdfPath: String
  ) throws -> URL {
    let root = try getCacheRoot()
    let pdfKey = stableHash(pdfPath)

    let dir =
      root.appendingPathComponent(
        pdfKey
      )

    try FileManager.default.createDirectory(
      at: dir,
      withIntermediateDirectories: true
    )

    return dir
  }

  private func stableHash(
    _ input: String
  ) -> String {
    let data = Data(input.utf8)
    let digest = SHA256.hash(
      data: data
    )

    return digest
      .map {
        String(
          format: "%02x",
          $0
        )
      }
      .joined()
  }
}

final class RendererException: Exception {
  override var reason: String {
    message
  }

  private let message: String

  init(
    code: String,
    message: String
  ) {
    self.message = message
    super.init()
  }
}