import { NativeModule, requireNativeModule } from 'expo';

import { AriaScoreFileExporterModuleEvents } from './AriaScoreFileExporter.types';

declare class AriaScoreFileExporterModule extends NativeModule<AriaScoreFileExporterModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AriaScoreFileExporterModule>('AriaScoreFileExporter');
