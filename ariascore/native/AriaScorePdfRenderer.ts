import { requireNativeModule } from "expo-modules-core";

export type RenderPageOptions = {
  pdfPath: string;
  page: number;
  width: number;
  height: number;
};

export type RenderPageResult = {
  uri: string;
  width: number;
  height: number;
  aspectRatio: number;
  page: number;
  totalPages: number;
};

type AriaScorePdfRendererModule = {
  getPageCount(
    pdfPath: string
  ): Promise<number>;

  renderPage(
    options: RenderPageOptions
  ): Promise<RenderPageResult>;

  clearDocumentCache(
    pdfPath: string
  ): Promise<boolean>;

  clearCache(): Promise<boolean>;
};

const nativeModule =
  requireNativeModule<AriaScorePdfRendererModule>(
    "AriaScorePdfRenderer"
  );

export default {
  getPageCount(
    pdfPath: string
  ): Promise<number> {
    return nativeModule.getPageCount(pdfPath);
  },

  renderPage(
    options: RenderPageOptions
  ): Promise<RenderPageResult> {
    return nativeModule.renderPage(options);
  },

  clearDocumentCache(
    pdfPath: string
  ): Promise<boolean> {
    return nativeModule.clearDocumentCache(
      pdfPath
    );
  },

  clearCache(): Promise<boolean> {
    return nativeModule.clearCache();
  },
};