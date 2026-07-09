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