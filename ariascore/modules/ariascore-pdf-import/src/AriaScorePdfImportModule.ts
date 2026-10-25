import { NativeModule, requireNativeModule } from 'expo';

import { AriaScorePdfImportModuleEvents } from './AriaScorePdfImport.types';

declare class AriaScorePdfImportModule extends NativeModule<AriaScorePdfImportModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AriaScorePdfImportModule>('AriaScorePdfImport');
