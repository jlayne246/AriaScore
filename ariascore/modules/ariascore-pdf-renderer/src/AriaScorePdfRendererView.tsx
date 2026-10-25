import { requireNativeView } from 'expo';
import * as React from 'react';

import { AriaScorePdfRendererViewProps } from './AriaScorePdfRenderer.types';

const NativeView: React.ComponentType<AriaScorePdfRendererViewProps> =
  requireNativeView('AriaScorePdfRenderer');

export default function AriaScorePdfRendererView(props: AriaScorePdfRendererViewProps) {
  return <NativeView {...props} />;
}
