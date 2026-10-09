import { Platform } from "react-native";
import {
  requireNativeModule,
} from "expo-modules-core";

interface AriaScoreFileExporterModule {
  exportFile(
    sourceFileUri: string,
    destinationUri: string
  ): Promise<void>;
}

let nativeModule:
  | AriaScoreFileExporterModule
  | null = null;

function getNativeModule():
  AriaScoreFileExporterModule {
  if (Platform.OS !== "android") {
    throw new Error(
      "Direct file export is currently available only on Android."
    );
  }

  if (!nativeModule) {
    nativeModule =
      requireNativeModule<AriaScoreFileExporterModule>(
        "AriaScoreFileExporter"
      );
  }

  return nativeModule;
}

export async function exportFile(
  sourceFileUri: string,
  destinationUri: string
): Promise<void> {
  await getNativeModule().exportFile(
    sourceFileUri,
    destinationUri
  );
}