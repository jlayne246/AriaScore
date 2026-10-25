// Reexport the native module. On web, it will be resolved to AriaScoreFileExporterModule.web.ts
// and on native platforms to AriaScoreFileExporterModule.ts
export { default } from './src/AriaScoreFileExporterModule';
export { default as AriaScoreFileExporterView } from './src/AriaScoreFileExporterView';
export * from  './src/AriaScoreFileExporter.types';
