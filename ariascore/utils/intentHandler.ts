// utils/intentHandler.ts

import * as Linking from "expo-linking";

export const getInitialPdfUri = async () => {
  const url = await Linking.getInitialURL();

  if (!url) {
    return null;
  }

  console.log("Opened with URL:", url);

  return url;
};