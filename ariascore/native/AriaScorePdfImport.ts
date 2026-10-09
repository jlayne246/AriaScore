import { requireNativeModule } from "expo-modules-core";

export type ImportedPdf = {
  uri: string;
  originalFilename: string;
};

type AriaScorePdfImportModule = {
  importPdf(
    sourceUri: string
  ): Promise<ImportedPdf>;
};

const nativeModule =
  requireNativeModule<AriaScorePdfImportModule>(
    "AriaScorePdfImport"
  );

export const importPdfNative = async (
  sourceUri: string
): Promise<ImportedPdf> => {
  return nativeModule.importPdf(sourceUri);
};