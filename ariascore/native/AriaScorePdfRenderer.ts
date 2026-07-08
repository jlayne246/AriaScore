import { NativeModules, Platform } from "react-native";

type RenderPageOptions = {
  pdfPath: string;
  page: number;
  width: number;
  height: number;
};

type RenderPageResult = {
  uri: string;
  width: number;
  height: number;
  aspectRatio: number;
  page: number;
  totalPages: number;
};

type AriaScorePdfRendererModule = {
  getPageCount(pdfPath: string): Promise<number>;
  renderPage(options: RenderPageOptions): Promise<RenderPageResult>;
  clearDocumentCache(pdfPath: string): Promise<boolean>;
};

const getNativeModule = (): AriaScorePdfRendererModule => {
  const nativeModule =
    NativeModules.AriaScorePdfRenderer as AriaScorePdfRendererModule | undefined;

  if (Platform.OS !== "android" || !nativeModule) {
    throw new Error(
      "AriaScorePdfRenderer is only available in the Android native build."
    );
  }

  return nativeModule;
};

export default {
  getPageCount(pdfPath: string): Promise<number> {
    return getNativeModule().getPageCount(pdfPath);
  },

  renderPage(options: RenderPageOptions): Promise<RenderPageResult> {
    return getNativeModule().renderPage(options);
  },

  clearDocumentCache(pdfPath: string): Promise<boolean> {
    return getNativeModule().clearDocumentCache(pdfPath);
  },
};