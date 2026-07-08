Looking at your mockup, I actually wouldn't start by building the Settings UI.

I'd start by building the **settings engine** first.

Think of it like how CSS works. The UI is just an editor for values; the important part is how those values are resolved.

---

# Phase 1 – Database

I'd add three tables.

## Global Settings

```sql
CREATE TABLE reader_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

Examples

| key                | value |
| ------------------ | ----- |
| keep_screen_awake  | true  |
| auto_hide_controls | true  |
| tap_zones          | true  |
| page_animation     | slide |

---

## Setlist Settings

```sql
CREATE TABLE setlist_settings (
    setlist_id INTEGER,
    key TEXT,
    value TEXT,

    PRIMARY KEY(setlist_id, key),

    FOREIGN KEY(setlist_id)
        REFERENCES setlists(id)
        ON DELETE CASCADE
);
```

---

## Score Settings

```sql
CREATE TABLE music_settings (
    music_id INTEGER,
    key TEXT,
    value TEXT,

    PRIMARY KEY(music_id, key),

    FOREIGN KEY(music_id)
        REFERENCES music(id)
        ON DELETE CASCADE
);
```

Notice all three tables have the same structure.

That makes everything else much easier.

---

# Phase 2 – Define the settings

Create a type.

```ts
export interface ReaderSettings {

    keepScreenAwake: boolean;

    autoHideControls: boolean;

    tapZones: boolean;

    pageAnimation:
        | "slide"
        | "fade"
        | "none";

    viewMode:
        | "single"
        | "double";

    performanceMode: boolean;

    gestureControls: boolean;

    restoreLastPage: boolean;
}
```

Eventually this grows.

---

# Phase 3 – Defaults

Have one object.

```ts
export const DEFAULT_SETTINGS: ReaderSettings = {

    keepScreenAwake: true,

    autoHideControls: true,

    tapZones: true,

    pageAnimation: "slide",

    viewMode: "single",

    performanceMode: false,

    gestureControls: false,

    restoreLastPage: true
};
```

Nothing should ever assume values exist in SQLite.

---

# Phase 4 – The resolver

This is the heart of the entire feature.

```ts
getResolvedReaderSettings(
    musicId?,
    setlistId?
)
```

Internally:

```text
defaults
        ↓
global settings
        ↓
setlist overrides
        ↓
score overrides
```

Implementation:

```ts
return {

    ...DEFAULT_SETTINGS,

    ...globalSettings,

    ...setlistSettings,

    ...musicSettings
};
```

That one function becomes the only thing the Reader needs.

---

# Phase 5 – Update Reader

Instead of

```ts
if (performanceMode)
```

Reader asks

```ts
settings.autoHideControls
```

Instead of

```ts
if (gestureEnabled)
```

Reader asks

```ts
settings.gestureControls
```

Instead of

```ts
if (tapZones)
```

Reader asks

```ts
settings.tapZones
```

The Reader never cares where the value came from.

---

# Phase 6 – Build the UI

Now your mockups become easy.

Global Settings

↓

```ts
saveGlobalSetting(
    "keepScreenAwake",
    true
)
```

---

Current Setlist

↓

```ts
saveSetlistSetting(
    setlistId,
    "performanceMode",
    true
)
```

---

Current Score

↓

```ts
saveMusicSetting(
    musicId,
    "viewMode",
    "double"
)
```

That's literally it.

---

# Phase 7 – Performance Mode

Performance Mode shouldn't contain logic.

It should just write several settings.

Example:

```ts
enablePerformanceMode(setlistId)
```

becomes

```ts
saveSetlistSetting(
    setlistId,
    "performanceMode",
    true
);

saveSetlistSetting(
    setlistId,
    "autoHideControls",
    true
);

saveSetlistSetting(
    setlistId,
    "tapZones",
    true
);

saveSetlistSetting(
    setlistId,
    "gestureControls",
    false
);
```

The Reader doesn't know Performance Mode exists.

It only reads settings.

---

# I'd actually split this into three sprints

## Sprint 1

* ✅ Create settings tables
* ✅ Create `ReaderSettings` interface
* ✅ Create resolver
* ✅ Make Reader use resolved settings

No UI yet.

---

## Sprint 2

* Global Settings page
* This Score Settings page
* Current Setlist Settings page

Exactly like your mockups.

---

## Sprint 3

* Performance Mode presets
* Gesture settings
* Calibration screen
* Any future reader input methods

---

I think this order matches the architecture you've been building throughout AriaScore. Your app has already evolved toward clean separation (database → helpers → UI), and treating settings as a resolution engine rather than a collection of toggles will make future additions—like facial gestures, alternative page-turn methods, or new reader behaviors—plug into the same system instead of introducing special-case logic. It also aligns very closely with the design you've sketched in your mockup, where the three settings levels are really different sources feeding one effective configuration.
