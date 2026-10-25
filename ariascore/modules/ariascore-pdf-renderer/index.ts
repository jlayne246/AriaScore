// Reexport the native module. On web, it will be resolved to AriaScorePdfRendererModule.web.ts
// and on native platforms to AriaScorePdfRendererModule.ts
export { default } from './src/AriaScorePdfRendererModule';
export { default as AriaScorePdfRendererView } from './src/AriaScorePdfRendererView';
export * from  './src/AriaScorePdfRenderer.types';
