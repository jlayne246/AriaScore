import ExpoModulesCore
import Foundation

public class AriaScorePdfImportModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AriaScorePdfImport")

    AsyncFunction("importPdf") {
      (sourceUriString: String) throws -> [String: String] in

      guard let sourceUrl = self.resolveUrl(sourceUriString) else {
        throw PdfImportException("Invalid source URI")
      }

      let didStartAccessing =
        sourceUrl.startAccessingSecurityScopedResource()

      defer {
        if didStartAccessing {
          sourceUrl.stopAccessingSecurityScopedResource()
        }
      }

      var displayName =
        sourceUrl.lastPathComponent

      if displayName.isEmpty {
        displayName = "Imported PDF.pdf"
      }

      if !displayName
        .lowercased()
        .hasSuffix(".pdf") {
        displayName += ".pdf"
      }

      let scoresDir =
        try self.getScoresDirectory()

      let safeName =
        self.sanitizeFilename(displayName)

      let internalName =
        "\(Int(Date().timeIntervalSince1970 * 1000))-\(safeName)"

      let destinationUrl =
        scoresDir.appendingPathComponent(
          internalName
        )

      if FileManager.default.fileExists(
        atPath: destinationUrl.path
      ) {
        try FileManager.default.removeItem(
          at: destinationUrl
        )
      }

      try FileManager.default.copyItem(
        at: sourceUrl,
        to: destinationUrl
      )

      return [
        "uri": destinationUrl.absoluteString,
        "originalFilename": displayName
      ]
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

  private func getScoresDirectory() throws -> URL {
    let appSupportDir =
      FileManager.default.urls(
        for: .applicationSupportDirectory,
        in: .userDomainMask
      )[0]

    let scoresDir =
      appSupportDir.appendingPathComponent(
        "scores"
      )

    try FileManager.default.createDirectory(
      at: scoresDir,
      withIntermediateDirectories: true
    )

    return scoresDir
  }

  private func sanitizeFilename(
    _ filename: String
  ) -> String {
    let allowed =
      CharacterSet(
        charactersIn:
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
      )

    return filename.unicodeScalars
      .map { scalar in
        allowed.contains(scalar)
          ? Character(scalar)
          : "_"
      }
      .map(String.init)
      .joined()
  }
}

final class PdfImportException: Exception {
  override var reason: String {
    message
  }

  private let message: String

  init(_ message: String) {
    self.message = message
    super.init()
  }
}