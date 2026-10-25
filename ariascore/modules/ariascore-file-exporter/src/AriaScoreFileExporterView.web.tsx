import * as React from 'react';

import { AriaScoreFileExporterViewProps } from './AriaScoreFileExporter.types';

export default function AriaScoreFileExporterView(props: AriaScoreFileExporterViewProps) {
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
