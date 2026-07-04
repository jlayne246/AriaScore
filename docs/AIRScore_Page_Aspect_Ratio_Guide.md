# AIRScore -- Page Aspect Ratio Guide

## Purpose

AIRScore stores the native PDF page aspect ratio (`width / height`)
returned by the renderer.

``` ts
type PageImage = {
  uri: string;
  width: number;
  height: number;
  aspectRatio: number;
};
```

The aspect ratio is **metadata**. It is not required for the current
full-page reader implementation.

------------------------------------------------------------------------

## Current Reader (v1.0)

Current implementation:

``` tsx
<ExpoImage
  source={{ uri: image.uri }}
  contentFit="contain"
  style={{
    width: "100%",
    height: "100%",
  }}
/>
```

### Why this works

-   `contentFit="contain"` preserves the image's intrinsic proportions.
-   The rendered PNG already contains the correct page proportions.
-   The parent view determines the available space.

Because of this, explicitly setting `aspectRatio` has no practical
effect in the current viewer.

------------------------------------------------------------------------

## Why keep the aspect ratio?

Although unused by the current layout, it becomes valuable for future
features.

### 1. Annotation Layer

    Page Container
    ├── PDF
    └── Annotation Canvas

Both layers must occupy identical bounds.

Example:

``` tsx
<View style={{ aspectRatio: image.aspectRatio }}>
    <ExpoImage ... />
    <AnnotationCanvas ... />
</View>
```

------------------------------------------------------------------------

### 2. Pinch Zoom

Future zoom should scale the page container rather than only the image.

    Page
    ├── PDF
    ├── Ink
    ├── Highlights
    └── Links

------------------------------------------------------------------------

### 3. Margin Cropping

Cropping calculations require knowledge of the original page dimensions.

------------------------------------------------------------------------

### 4. Coordinate Mapping

Features such as:

-   annotations
-   hyperlinks
-   bookmarks
-   text selections
-   measure overlays

need conversion between screen coordinates and PDF coordinates.

The aspect ratio is part of that mapping.

------------------------------------------------------------------------

### 5. Mixed Page Sizes

Documents may contain:

-   A4
-   Letter
-   Legal
-   Landscape inserts

The stored aspect ratio allows each page to be laid out correctly.

------------------------------------------------------------------------

## When NOT to use it

Do not force the image layout like this for the current reader:

``` tsx
style={{
    width: "100%",
    height: "100%",
    aspectRatio: image.aspectRatio,
}}
```

When both width and height are fixed, `aspectRatio` is redundant.

------------------------------------------------------------------------

## Recommendation

For AIRScore v1:

-   Keep storing `aspectRatio`.
-   Continue displaying pages using:

``` tsx
<ExpoImage
    contentFit="contain"
    style={{
        width: "100%",
        height: "100%",
    }}
/>
```

Introduce aspect-ratio-driven page containers only when implementing
features such as annotations, zoom, cropping, or coordinate-aware
overlays.

This keeps the current rendering path simple while preserving metadata
required for future development.
