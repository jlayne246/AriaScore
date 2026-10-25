import * as React from 'react';

import { AriaScorePdfRendererViewProps } from './AriaScorePdfRenderer.types';

export default function AriaScorePdfRendererView(props: AriaScorePdfRendererViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
