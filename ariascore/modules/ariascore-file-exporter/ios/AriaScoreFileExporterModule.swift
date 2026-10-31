import ExpoModulesCore
import Foundation

public class AriaScoreFileExporterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AriaScoreFileExporter")

    AsyncFunction("exportFile") {
      (
        sourceFileUri: String,
        destinationFileUri: String
      ) in

      // Validate the source file URI.
      guard
        let sourceURL = URL(
          string: sourceFileUri
        ),
        sourceURL.isFileURL
      else {
        throw FileExportException(
          "The source file URI is invalid."
        )
      }

      // Validate the destination file URI.
      guard
        let destinationURL = URL(
          string: destinationFileUri
        ),
        destinationURL.isFileURL
      else {
        throw FileExportException(
          "The destination file URI is invalid."
        )
      }

      let fileManager = FileManager.default

      // Ensure the source file exists.
      guard
        fileManager.fileExists(
          atPath: sourceURL.path
        )
      else {
        throw FileExportException(
          "The source backup file does not exist."
        )
      }

      // Prevent accidental overwriting of the source file.
      guard
        sourceURL.standardizedFileURL !=
          destinationURL.standardizedFileURL
      else {
        throw FileExportException(
          "The source and destination cannot be the same file."
        )
      }

      // Obtain security-scoped access when available.
      let hasSecurityScopedAccess =
        destinationURL.startAccessingSecurityScopedResource()

      defer {
        if hasSecurityScopedAccess {
          destinationURL.stopAccessingSecurityScopedResource()
        }
      }

      do {
        // Create the input stream.
        guard
          let inputStream = InputStream(
            url: sourceURL
          )
        else {
          throw FileExportException(
            "The source backup file could not be opened."
          )
        }

        // Create the output stream.
        guard
          let outputStream = OutputStream(
            url: destinationURL,
            append: false
          )
        else {
          throw FileExportException(
            "The selected destination could not be opened."
          )
        }

        // Open both streams.
        inputStream.open()
        outputStream.open()

        defer {
          inputStream.close()
          outputStream.close()
        }

        // Check whether either stream failed to open.
        if inputStream.streamStatus == .error {
          throw inputStream.streamError
            ?? FileExportException(
              "An error occurred while opening the source file."
            )
        }

        if outputStream.streamStatus == .error {
          throw outputStream.streamError
            ?? FileExportException(
              "An error occurred while opening the destination file."
            )
        }

        // Allocate a 64 KB buffer for efficient streaming.
        let bufferSize = 64 * 1024

        let buffer = UnsafeMutablePointer<UInt8>.allocate(
          capacity: bufferSize
        )

        defer {
          buffer.deallocate()
        }

        // Copy the source file into the destination stream.
        while true {
          let bytesRead = inputStream.read(
            buffer,
            maxLength: bufferSize
          )

          if bytesRead < 0 {
            throw inputStream.streamError
              ?? FileExportException(
                "An error occurred while reading the source file."
              )
          }

          // End of file.
          if bytesRead == 0 {
            break
          }

          var totalWritten = 0

          // Handle partial writes.
          while totalWritten < bytesRead {
            let bytesWritten = outputStream.write(
              buffer.advanced(by: totalWritten),
              maxLength: bytesRead - totalWritten
            )

            if bytesWritten <= 0 {
              throw outputStream.streamError
                ?? FileExportException(
                  "An error occurred while writing the exported file."
                )
            }

            totalWritten += bytesWritten
          }
        }

        // Check for stream errors after copying.
        if let streamError = outputStream.streamError {
          throw streamError
        }

      } catch let error as FileExportException {
        throw error

      } catch {
        throw FileExportException(
          "The backup could not be written to the selected location. \(error.localizedDescription)"
        )
      }
    }
  }
}

// MARK: - File Export Exception

public final class FileExportException:
  GenericException<String>
{
  public init(
    _ message: String
  ) {
    super.init(message)
  }
}