/**
 * Imports the Expo document picker module which provides access to the system's native UI for selecting documents from the user's device
 * @see {@link https://docs.expo.dev/versions/latest/sdk/document-picker/}
 */
import * as DocumentPicker from 'expo-document-picker';
/** 
 * Imports the Expo file system module which allows the app access to a device's local file system
 * @see {@link https://docs.expo.dev/versions/latest/sdk/filesystem/}
 * */ 
import * as FileSystem from 'expo-file-system';

/**
 * This function facilitates the uploading of the PDF to the system.
 * @using DocumentPicker, FileSystem
 * @returns local path of the uploaded PDF as a string; or returns null
 */
import * as Crypto from "expo-crypto";

export const UploadLocalPDF = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: false,
  });

  if (!result.assets?.length) return null;

  const file = result.assets[0];

  return importPdfFromUri(file.uri, file.name);
};

export const importPdfFromUri = async (
  sourceUri: string,
  originalFilename: string
) => {
  const scoresDir = `${FileSystem.documentDirectory}scores/`;

  await FileSystem.makeDirectoryAsync(scoresDir, {
    intermediates: true,
  });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const dest = `${scoresDir}${filename}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: dest,
  });

  console.log(`Upload URI: ${dest} Upload Name: ${originalFilename}`)

  return {
    uri: dest,
    originalFilename,
  };
};