import { NativeModule, requireNativeModule } from 'expo';

import { AriaScorePdfRendererModuleEvents } from './AriaScorePdfRenderer.types';

declare class AriaScorePdfRendererModule extends NativeModule<AriaScorePdfRendererModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AriaScorePdfRendererModule>('AriaScorePdfRenderer');
