import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './AriaScorePdfRenderer.types';

type AriaScorePdfRendererModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class AriaScorePdfRendererModule extends NativeModule<AriaScorePdfRendererModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(AriaScorePdfRendererModule, 'AriaScorePdfRendererModule');
