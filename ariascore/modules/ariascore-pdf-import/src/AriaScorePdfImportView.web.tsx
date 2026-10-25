import * as React from 'react';

import { AriaScorePdfImportViewProps } from './AriaScorePdfImport.types';

export default function AriaScorePdfImportView(props: AriaScorePdfImportViewProps) {
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
