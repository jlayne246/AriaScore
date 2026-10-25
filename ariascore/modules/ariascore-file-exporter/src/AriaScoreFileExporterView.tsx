import { requireNativeView } from 'expo';
import * as React from 'react';

import { AriaScoreFileExporterViewProps } from './AriaScoreFileExporter.types';

const NativeView: React.ComponentType<AriaScoreFileExporterViewProps> =
  requireNativeView('AriaScoreFileExporter');

export default function AriaScoreFileExporterView(props: AriaScoreFileExporterViewProps) {
  return <NativeView {...props} />;
}
