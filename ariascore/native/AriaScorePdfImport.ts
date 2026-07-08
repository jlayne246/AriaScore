import { NativeModules, Platform } from "react-native";

type ImportedPdf = {
  uri: string;
  originalFilename: string;
};

type AriaScorePdfImporterModule = {
  importPdf(sourceUri: string): Promise<ImportedPdf>;
};

const getNativeImporter = (): AriaScorePdfImporterModule => {
  const nativeModule =
    NativeModules.AriaScorePdfImporter as AriaScorePdfImporterModule | undefined;

  if (Platform.OS !== "android" || !nativeModule?.importPdf) {
    throw new Error(
      "AriaScorePdfImporter is only available in the Android native build."
    );
  }

  return nativeModule;
};

export const importPdfNative = async (
  sourceUri: string
): Promise<ImportedPdf> => {
  return getNativeImporter().importPdf(sourceUri);
};