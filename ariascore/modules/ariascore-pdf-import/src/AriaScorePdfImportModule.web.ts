import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './AriaScorePdfImport.types';

type AriaScorePdfImportModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class AriaScorePdfImportModule extends NativeModule<AriaScorePdfImportModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(AriaScorePdfImportModule, 'AriaScorePdfImportModule');
