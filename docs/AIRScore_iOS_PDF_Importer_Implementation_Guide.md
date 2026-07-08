# AIRScore – iOS PDF Importer Implementation Guide

## Purpose

AIRScore currently imports PDFs on Android through a native Kotlin module:

```txt
AriaScorePdfImporter.importPdf(sourceUri)
```

The Android importer copies a selected PDF from a content URI into AIRScore's internal app storage, then returns a stable internal file URI and the original filename.

iOS needs an equivalent native importer so the rest of AIRScore can treat imported PDFs the same way on both platforms.

---

## Target JS Contract

The iOS implementation should expose the same native module name:

```ts
AriaScorePdfImporter
```

and the same method:

```ts
importPdf(sourceUri: string): Promise<{
  uri: string;
  originalFilename: string;
}>
```

The reader, database layer, and metadata flow should not need to know whether the PDF was imported on Android or iOS.

---

## Android Reference Behaviour

Current Android flow:

```txt
1. Receive source URI.
2. Query display filename.
3. Ensure filename ends in .pdf.
4. Create internal /scores directory.
5. Sanitize filename.
6. Prefix filename with timestamp.
7. Copy source file into app-private storage.
8. Return:
   - uri
   - originalFilename
```

The iOS implementation should mirror this behaviour as closely as possible.

---

## iOS Storage Target

Use app-private storage, preferably:

```txt
Application Support/scores
```

This is more appropriate than temporary cache storage because imported scores are user library data and should persist.

Recommended path:

```swift
FileManager.default.urls(
  for: .applicationSupportDirectory,
  in: .userDomainMask
)[0]
.appendingPathComponent("scores")
```

---

## Swift Implementation

Create:

```txt
ios/AriaScorePdfImporter.swift
```

```swift
import Foundation

@objc(AriaScorePdfImporter)
class AriaScorePdfImporter: NSObject {

  @objc
  func importPdf(
    _ sourceUriString: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      guard let sourceUrl = resolveUrl(sourceUriString) else {
        throw NSError(
          domain: "AriaScorePdfImporter",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Invalid source URI"]
        )
      }

      let didStartAccessing = sourceUrl.startAccessingSecurityScopedResource()
      defer {
        if didStartAccessing {
          sourceUrl.stopAccessingSecurityScopedResource()
        }
      }

      var displayName = sourceUrl.lastPathComponent

      if displayName.isEmpty {
        displayName = "Imported PDF.pdf"
      }

      if !displayName.lowercased().hasSuffix(".pdf") {
        displayName += ".pdf"
      }

      let scoresDir = try getScoresDirectory()

      let safeName = sanitizeFilename(displayName)
      let internalName = "\(Int(Date().timeIntervalSince1970 * 1000))-\(safeName)"

      let destinationUrl = scoresDir.appendingPathComponent(internalName)

      if FileManager.default.fileExists(atPath: destinationUrl.path) {
        try FileManager.default.removeItem(at: destinationUrl)
      }

      try FileManager.default.copyItem(at: sourceUrl, to: destinationUrl)

      resolve([
        "uri": destinationUrl.absoluteString,
        "originalFilename": displayName
      ])
    } catch {
      reject("PDF_IMPORT_FAILED", error.localizedDescription, error)
    }
  }

  private func resolveUrl(_ pathOrUri: String) -> URL? {
    if pathOrUri.hasPrefix("file://") {
      return URL(string: pathOrUri)
    }

    return URL(fileURLWithPath: pathOrUri)
  }

  private func getScoresDirectory() throws -> URL {
    let appSupportDir = FileManager.default.urls(
      for: .applicationSupportDirectory,
      in: .userDomainMask
    )[0]

    let scoresDir = appSupportDir.appendingPathComponent("scores")

    try FileManager.default.createDirectory(
      at: scoresDir,
      withIntermediateDirectories: true
    )

    return scoresDir
  }

  private func sanitizeFilename(_ filename: String) -> String {
    let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")

    return filename.unicodeScalars.map { scalar in
      allowed.contains(scalar) ? Character(scalar) : "_"
    }
    .map(String.init)
    .joined()
  }
}
```

---

## Objective-C Bridge

Create:

```txt
ios/AriaScorePdfImporterBridge.m
```

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AriaScorePdfImporter, NSObject)

RCT_EXTERN_METHOD(importPdf:
                  (NSString *)sourceUriString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

---

## TypeScript Wrapper

Create or update the existing wrapper:

```ts
import { NativeModules, Platform } from "react-native";

type ImportPdfResult = {
  uri: string;
  originalFilename: string;
};

type AriaScorePdfImporterModule = {
  importPdf(sourceUri: string): Promise<ImportPdfResult>;
};

const getNativeModule = (): AriaScorePdfImporterModule => {
  const nativeModule =
    NativeModules.AriaScorePdfImporter as AriaScorePdfImporterModule | undefined;

  if (!["android", "ios"].includes(Platform.OS) || !nativeModule) {
    throw new Error(
      "AriaScorePdfImporter is only available in the native Android/iOS build."
    );
  }

  return nativeModule;
};

export default {
  importPdf(sourceUri: string): Promise<ImportPdfResult> {
    return getNativeModule().importPdf(sourceUri);
  },
};
```

---

## Important iOS Notes

### Security-scoped resources

Files selected from the iOS Files app may require security-scoped access.

This is why the implementation uses:

```swift
let didStartAccessing = sourceUrl.startAccessingSecurityScopedResource()
```

and later:

```swift
sourceUrl.stopAccessingSecurityScopedResource()
```

This is harmless for normal file URLs and useful for document-provider URLs.

### Storage location

Imported scores should not go into the cache directory.

Use:

```txt
Application Support/scores
```

because imported PDFs are part of the user's AIRScore library.

### Returned URI

The importer should return a `file://` URI:

```swift
destinationUrl.absoluteString
```

This matches the Android behaviour, where the module returns:

```kotlin
Uri.fromFile(destinationFile).toString()
```

---

## Integration with Renderer

After import, the returned `uri` should be stored in the database and passed to the renderer:

```txt
PDF Importer
    ↓
Internal file URI
    ↓
Database music record
    ↓
PDF Renderer
    ↓
PNG cache
    ↓
ExpoImage
```

The renderer should not care whether the file was imported on Android or iOS.

---

## Testing Checklist

When a Mac/Xcode environment is available:

- [ ] Add `AriaScorePdfImporter.swift` to the iOS target.
- [ ] Add `AriaScorePdfImporterBridge.m` to the iOS target.
- [ ] Run `pod install` if needed.
- [ ] Build from Xcode or `npx expo run:ios`.
- [ ] Import a PDF from the Files app.
- [ ] Confirm the returned URI starts with `file://`.
- [ ] Confirm the file exists in app-private storage.
- [ ] Confirm `originalFilename` preserves the selected filename.
- [ ] Confirm filenames with spaces/symbols are sanitized internally.
- [ ] Confirm imported PDF opens in the AIRScore reader.
- [ ] Confirm renderer can read the imported URI.
- [ ] Confirm app restart does not lose the imported PDF.
- [ ] Confirm duplicate imports produce unique internal filenames.
- [ ] Test iCloud Drive / Google Drive provider files if available.

---

## Suggested Backlog Issue

```md
# Epic: Implement iOS PDF Importer

## Status

Blocked – requires macOS/Xcode environment.

## Description

Implement an iOS native PDF importer equivalent to the Android `AriaScorePdfImporter` module.

The importer should copy selected PDF files into AIRScore's private app storage and return a stable internal URI for use by the database and renderer.

## Tasks

- [ ] Add Swift native module.
- [ ] Add Objective-C bridge.
- [ ] Copy imported PDF into `Application Support/scores`.
- [ ] Preserve original filename.
- [ ] Sanitize internal filename.
- [ ] Prefix internal filename with timestamp.
- [ ] Return `{ uri, originalFilename }`.
- [ ] Support security-scoped iOS file access.
- [ ] Update TypeScript wrapper for Android/iOS.
- [ ] Test with Files app and cloud document providers.

## Acceptance Criteria

- PDFs can be imported on iOS.
- Imported files persist after app restart.
- Imported URI can be rendered by `AriaScorePdfRenderer`.
- Android importer behaviour remains unchanged.
- Shared JS code works on both platforms.
```

---

## Relationship to iOS Renderer

This importer should be implemented alongside, or before, the iOS PDF renderer.

Recommended native iOS pipeline:

```txt
AriaScorePdfImporter.swift
    ↓
Application Support/scores/<timestamp>-filename.pdf
    ↓
AriaScorePdfRenderer.swift
    ↓
Caches/airscore-rendered-pages/<pdfKey>/page_<n>_<w>x<h>.png
    ↓
ExpoImage
```

The importer owns permanent PDF storage.  
The renderer owns disposable PNG cache generation.
