import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './AriaScoreFileExporter.types';

type AriaScoreFileExporterModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class AriaScoreFileExporterModule extends NativeModule<AriaScoreFileExporterModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(AriaScoreFileExporterModule, 'AriaScoreFileExporterModule');
