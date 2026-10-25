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

      guard
        let sourceURL = URL(
          string: sourceFileUri
        )
      else {
        throw FileExportException(
          "The source file URI is invalid."
        )
      }

      guard
        let destinationURL = URL(
          string: destinationFileUri
        )
      else {
        throw FileExportException(
          "The destination file URI is invalid."
        )
      }

      let fileManager =
        FileManager.default

      guard
        fileManager.fileExists(
          atPath: sourceURL.path
        )
      else {
        throw FileExportException(
          "The source backup file does not exist."
        )
      }

      do {
        let inputStream =
          InputStream(
            url: sourceURL
          )

        guard
          let outputStream =
            OutputStream(
              url: destinationURL,
              append: false
            )
        else {
          throw FileExportException(
            "The selected destination could not be opened."
          )
        }

        inputStream?.open()
        outputStream.open()

        defer {
          inputStream?.close()
          outputStream.close()
        }

        guard
          let inputStream
        else {
          throw FileExportException(
            "The source backup file could not be opened."
          )
        }

        let bufferSize =
          64 * 1024

        let buffer =
          UnsafeMutablePointer<
            UInt8
          >.allocate(
            capacity: bufferSize
          )

        defer {
          buffer.deallocate()
        }

        while
          inputStream.hasBytesAvailable
        {
          let bytesRead =
            inputStream.read(
              buffer,
              maxLength:
                bufferSize
            )

          if bytesRead < 0 {
            throw
              inputStream.streamError
                ?? FileExportException(
                  "An error occurred while reading the source file."
                )
          }

          if bytesRead == 0 {
            break
          }

          var totalWritten = 0

          while
            totalWritten <
              bytesRead
          {
            let bytesWritten =
              outputStream.write(
                buffer
                  .advanced(
                    by:
                      totalWritten
                  ),
                maxLength:
                  bytesRead -
                  totalWritten
              )

            if bytesWritten <= 0 {
              throw
                outputStream
                  .streamError
                  ?? FileExportException(
                    "An error occurred while writing the exported file."
                  )
            }

            totalWritten +=
              bytesWritten
          }
        }
      } catch let error
          as FileExportException {
        throw error
      } catch {
        throw FileExportException(
          "The backup could not be written to the selected location.",
          cause: error
        )
      }
    }
  }
}

public class FileExportException:
  GenericException
{
  public init(
    _ message: String,
    cause: Error? = nil
  ) {
    super.init(
      message,
      cause: cause
    )
  }
}