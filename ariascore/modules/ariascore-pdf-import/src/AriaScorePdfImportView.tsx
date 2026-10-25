import { requireNativeView } from 'expo';
import * as React from 'react';

import { AriaScorePdfImportViewProps } from './AriaScorePdfImport.types';

const NativeView: React.ComponentType<AriaScorePdfImportViewProps> =
  requireNativeView('AriaScorePdfImport');

export default function AriaScorePdfImportView(props: AriaScorePdfImportViewProps) {
  return <NativeView {...props} />;
}
