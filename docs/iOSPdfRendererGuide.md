Implement it as an **iOS native module with the same API as your Android module**.

### 1. iOS Swift module shape

Create something like:

```swift
// ios/AirScorePdfRenderer.swift

import Foundation
import PDFKit
import UIKit
import CryptoKit

@objc(AirScorePdfRenderer)
class AirScorePdfRenderer: NSObject {

  @objc
  func getPageCount(
    _ pdfPath: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let fileUrl = resolveUrl(pdfPath),
          let document = PDFDocument(url: fileUrl) else {
      reject("PAGE_COUNT_ERROR", "Unable to open PDF", nil)
      return
    }

    resolve(document.pageCount)
  }

  @objc
  func renderPage(
    _ options: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      guard let pdfPath = options["pdfPath"] as? String else {
        throw NSError(domain: "AirScorePdfRenderer", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "pdfPath is required"
        ])
      }

      guard let pageNumber = options["page"] as? Int else {
        throw NSError(domain: "AirScorePdfRenderer", code: 2, userInfo: [
          NSLocalizedDescriptionKey: "page is required"
        ])
      }

      guard let width = options["width"] as? Int,
            let height = options["height"] as? Int else {
        throw NSError(domain: "AirScorePdfRenderer", code: 3, userInfo: [
          NSLocalizedDescriptionKey: "width and height are required"
        ])
      }

      guard let fileUrl = resolveUrl(pdfPath),
            let document = PDFDocument(url: fileUrl) else {
        throw NSError(domain: "AirScorePdfRenderer", code: 4, userInfo: [
          NSLocalizedDescriptionKey: "Unable to open PDF"
        ])
      }

      let pageIndex = pageNumber - 1

      if pageIndex < 0 || pageIndex >= document.pageCount {
        throw NSError(domain: "AirScorePdfRenderer", code: 5, userInfo: [
          NSLocalizedDescriptionKey: "Invalid page number: \(pageNumber)"
        ])
      }

      guard let page = document.page(at: pageIndex) else {
        throw NSError(domain: "AirScorePdfRenderer", code: 6, userInfo: [
          NSLocalizedDescriptionKey: "Unable to open page: \(pageNumber)"
        ])
      }

      let pageBounds = page.bounds(for: .mediaBox)
      let pageWidth = pageBounds.width
      let pageHeight = pageBounds.height

      let pageRatio = pageWidth / pageHeight
      let requestedRatio = CGFloat(width) / CGFloat(height)

      let renderWidth: Int
      let renderHeight: Int

      if requestedRatio > pageRatio {
        renderHeight = height
        renderWidth = Int(CGFloat(height) * pageRatio)
      } else {
        renderWidth = width
        renderHeight = Int(CGFloat(width) / pageRatio)
      }

      if renderWidth <= 0 || renderHeight <= 0 {
        throw NSError(domain: "AirScorePdfRenderer", code: 7, userInfo: [
          NSLocalizedDescriptionKey: "Invalid render size: \(renderWidth)x\(renderHeight)"
        ])
      }

      let imageSize = CGSize(width: renderWidth, height: renderHeight)

      UIGraphicsBeginImageContextWithOptions(imageSize, true, 1.0)

      guard let context = UIGraphicsGetCurrentContext() else {
        UIGraphicsEndImageContext()
        throw NSError(domain: "AirScorePdfRenderer", code: 8, userInfo: [
          NSLocalizedDescriptionKey: "Unable to create graphics context"
        ])
      }

      UIColor.white.set()
      context.fill(CGRect(origin: .zero, size: imageSize))

      context.saveGState()

      context.translateBy(x: 0, y: imageSize.height)
      context.scaleBy(x: 1.0, y: -1.0)

      let scale = min(
        imageSize.width / pageBounds.width,
        imageSize.height / pageBounds.height
      )

      context.scaleBy(x: scale, y: scale)
      context.translateBy(x: -pageBounds.origin.x, y: -pageBounds.origin.y)

      page.draw(with: .mediaBox, to: context)

      context.restoreGState()

      guard let image = UIGraphicsGetImageFromCurrentImageContext() else {
        UIGraphicsEndImageContext()
        throw NSError(domain: "AirScorePdfRenderer", code: 9, userInfo: [
          NSLocalizedDescriptionKey: "Unable to render page image"
        ])
      }

      UIGraphicsEndImageContext()

      guard let pngData = image.pngData() else {
        throw NSError(domain: "AirScorePdfRenderer", code: 10, userInfo: [
          NSLocalizedDescriptionKey: "Unable to encode PNG"
        ])
      }

      let cacheDir = try getDocumentCacheDir(pdfPath: pdfPath)

      let outputFile = cacheDir.appendingPathComponent(
        "page_\(pageNumber)_\(renderWidth)x\(renderHeight).png"
      )

      try pngData.write(to: outputFile)

      resolve([
        "uri": outputFile.absoluteString,
        "width": renderWidth,
        "height": renderHeight,
        "page": pageNumber,
        "totalPages": document.pageCount,
        "aspectRatio": Double(pageRatio)
      ])
    } catch {
      reject("RENDER_PAGE_ERROR", error.localizedDescription, error)
    }
  }

  @objc
  func clearCache(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let cacheRoot = try getCacheRoot()

      if FileManager.default.fileExists(atPath: cacheRoot.path) {
        try FileManager.default.removeItem(at: cacheRoot)
      }

      try FileManager.default.createDirectory(
        at: cacheRoot,
        withIntermediateDirectories: true
      )

      resolve(true)
    } catch {
      reject("CACHE_CLEAR_ERROR", error.localizedDescription, error)
    }
  }

  @objc
  func clearDocumentCache(
    _ pdfPath: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let cacheDir = try getDocumentCacheDir(pdfPath: pdfPath)

      if FileManager.default.fileExists(atPath: cacheDir.path) {
        try FileManager.default.removeItem(at: cacheDir)
      }

      try FileManager.default.createDirectory(
        at: cacheDir,
        withIntermediateDirectories: true
      )

      resolve(true)
    } catch {
      reject("DOCUMENT_CACHE_CLEAR_ERROR", error.localizedDescription, error)
    }
  }

  private func resolveUrl(_ pathOrUri: String) -> URL? {
    if pathOrUri.hasPrefix("file://") {
      return URL(string: pathOrUri)
    }

    return URL(fileURLWithPath: pathOrUri)
  }

  private func getCacheRoot() throws -> URL {
    let cacheDir = FileManager.default.urls(
      for: .cachesDirectory,
      in: .userDomainMask
    )[0]

    let root = cacheDir.appendingPathComponent("airscore-rendered-pages")

    try FileManager.default.createDirectory(
      at: root,
      withIntermediateDirectories: true
    )

    return root
  }

  private func getDocumentCacheDir(pdfPath: String) throws -> URL {
    let root = try getCacheRoot()
    let pdfKey = stableHash(pdfPath)

    let dir = root.appendingPathComponent(pdfKey)

    try FileManager.default.createDirectory(
      at: dir,
      withIntermediateDirectories: true
    )

    return dir
  }

  private func stableHash(_ input: String) -> String {
    let data = Data(input.utf8)
    let digest = SHA256.hash(data: data)

    return digest.map { String(format: "%02x", $0) }.joined()
  }
}
```

### 2. Add Objective-C bridge file

Create:

```objc
// ios/AirScorePdfRendererBridge.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AirScorePdfRenderer, NSObject)

RCT_EXTERN_METHOD(getPageCount:
                  (NSString *)pdfPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(renderPage:
                  (NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearCache:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearDocumentCache:
                  (NSString *)pdfPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

### 3. Update your TS wrapper

Change this:

```ts
if (Platform.OS !== "android" || !nativeModule) {
```

to:

```ts
if (!["android", "ios"].includes(Platform.OS) || !nativeModule) {
  throw new Error(
    "AirScorePdfRenderer is only available in the native Android/iOS build."
  );
}
```

### 4. Rebuild iOS

You’ll need a native iOS build:

```bash
npx expo run:ios
```

or build from Xcode.

The main idea: **same JS API, platform-specific native implementation.** Android keeps Kotlin `PdfRenderer`; iOS gets Swift `PDFKit`; both output PNG files consumed by `expo-image`.
