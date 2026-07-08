Sure. Keep this as a future implementation note. The important point is that your current `AriaScorePdfRenderer` architecture already supports this — **do not change the renderer**. The display mode should only affect how rendered images are arranged and how page turns calculate.

# AriaScore Display Modes Implementation Guide

## Goal

Support:

1. **Single Page Mode**

   * Portrait default
   * One PDF page per turn
   * Best for tablets held vertically

2. **Two Page Mode**

   * Landscape locked
   * Two rendered pages side-by-side
   * Best for large tablets / monitors

Architecture:

```text
PDF
 ↓
AriaScorePdfRenderer
 ↓
Individual page images
 ↓
Display mode decides layout
```

Do **not** render combined spreads.

---

# 1. Add display mode type

Create:

```ts
type DisplayMode =
  | "single"
  | "twoPage";
```

State:

```ts
const [displayMode, setDisplayMode] =
  useState<DisplayMode>("single");
```

Later this should persist:

```ts
AsyncStorage.setItem(
  "reader:displayMode",
  displayMode
);
```

---

# 2. Add page step calculation

Replace:

```ts
goToPage(currentPage + 1);
```

with:

```ts
const pageStep =
  displayMode === "twoPage"
    ? 2
    : 1;

goToPage(currentPage + pageStep);
```

And previous:

```ts
goToPage(currentPage - pageStep);
```

---

# 3. Adjust buffer size by mode

Replace fixed values:

```ts
const BUFFER_BEHIND = 2;
const BUFFER_AHEAD = 4;
```

with:

```ts
const getBuffer = (mode: DisplayMode) => {
  if (mode === "twoPage") {
    return {
      behind: 4,
      ahead: 6,
    };
  }

  return {
    behind: 2,
    ahead: 4,
  };
};
```

Then:

```ts
const buffer = getBuffer(displayMode);
```

---

# 4. Update renderBufferAround()

From:

```ts
const start =
  Math.max(
    1,
    page - BUFFER_BEHIND
  );

const end =
  Math.min(
    totalPages,
    page + BUFFER_AHEAD
  );
```

To:

```ts
const buffer = getBuffer(displayMode);

const start =
  Math.max(
    1,
    page - buffer.behind
  );

const end =
  Math.min(
    totalPages,
    page + buffer.ahead
  );
```

---

# 5. Create a page renderer component

Create:

```tsx
RenderedPage.tsx
```

```tsx
interface Props {
  uri: string;
}

export function RenderedPage({ uri }: Props) {
  return (
    <Image
      source={{ uri }}
      style={{
        flex: 1,
        resizeMode: "contain",
      }}
    />
  );
}
```

---

# 6. Single page layout

```tsx
if (displayMode === "single") {
  return (
    <RenderedPage
      uri={pageImages[currentPage]}
    />
  );
}
```

Result:

```text
┌─────────┐
│         │
│ Page 5  │
│         │
└─────────┘
```

---

# 7. Two page layout

```tsx
if (displayMode === "twoPage") {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
      }}
    >
      <RenderedPage
        uri={pageImages[currentPage]}
      />

      <RenderedPage
        uri={pageImages[currentPage + 1]}
      />
    </View>
  );
}
```

Result:

```text
┌─────────┬─────────┐
│ Page 4  │ Page 5  │
│         │         │
└─────────┴─────────┘
```

---

# 8. Cover page offset support

Needed for books:

Option A:

```text
Cover | 1
2 | 3
4 | 5
```

Option B:

```text
Cover
1 | 2
3 | 4
5 | 6
```

Add:

```ts
const [coverOffset, setCoverOffset] =
  useState(false);
```

When calculating the right page:

```ts
const rightPage =
  coverOffset
    ? currentPage + 1
    : currentPage;
```

---

# 9. Orientation behaviour

Recommended:

```text
Portrait:
  force single page

Landscape:
  allow:
    - single
    - two page
```

Do not automatically switch without user preference.

---

# Future modes this enables

The same architecture can later support:

```text
Half page turns:
Page 1 top
↓
Page 1 bottom

Vertical scrolling:
Page 1
Page 2
Page 3

Performance reorder:
1 → 2 → 5 → 3 → 4

Repeat jumps:
Page 10 → Page 6
```

The key rule:

**AriaScorePdfRenderer should only know about pages. The reader decides how musicians see those pages.**
