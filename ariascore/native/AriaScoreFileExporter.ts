import {
  NativeModules,
  Platform,
} from "react-native";

interface AriaScoreFileExporterModule {
  copyFileToContentUri(
    sourceFileUri: string,
    destinationContentUri: string
  ): Promise<void>;
}

const nativeModule =
  NativeModules.AriaScoreFileExporter as
    | AriaScoreFileExporterModule
    | undefined;

export async function copyFileToContentUri(
  sourceFileUri: string,
  destinationContentUri: string
): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error(
      "Direct folder export is currently available only on Android."
    );
  }

  if (!nativeModule) {
    throw new Error(
      "The AriaScore file exporter native module is unavailable. Rebuild the application."
    );
  }

  await nativeModule.copyFileToContentUri(
    sourceFileUri,
    destinationContentUri
  );
}