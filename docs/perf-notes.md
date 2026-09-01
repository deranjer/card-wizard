# Frontend performance notes

Running notes on where the UI spent its time and what Phase 5 changed. Numbers
are qualitative (React DevTools Profiler on a ~300-card deck, dev build) — treat
them as "before/after shape", not benchmarks.

## Where the time was going (pre-Phase-5)

| Area | Symptom | Cause |
|---|---|---|
| Spreadsheet typing | every keystroke janky, scales with `cards × fields` | each keystroke rebuilt the whole game object and walked every store subscriber; every cell was a controlled Mantine input |
| Preview tab open | multi-second freeze on open, again on front/back toggle | one `<CardRender>` per card mounted up front, each firing an image request; nothing memoised |
| Asset gallery open | multi-second freeze, grows with asset count | `LoadImageAsDataURL` called sequentially for every asset, full-res base64 held in one state object; `fallbackSrc` hit the network |
| Colour picker drag in the editor | undo history balloons, GC pauses | every drag tick pushed a full deck snapshot onto the (then-uncapped) undo stack |

## Phase 5 changes

- **`CardRender`** is `React.memo`'d and its per-element style object is built by
  a pure helper. Parent re-renders (modal open, zoom slider) no longer
  re-reconcile every card.
- **`DeckPreview`** grid cells (`LazyCard`) mount their `<CardRender>` only when
  they scroll within 300 px of the viewport (IntersectionObserver), and stay
  mounted after. Opening the tab renders ~one screenful, not the whole deck.
- **`AssetGallery`** dropped the base64 pipeline entirely: thumbnails are plain
  `<img loading="lazy">` served from `/local-image`, so the browser fetches only
  what's on screen and caches them. A `?_v=` token busts the cache after
  add/replace. No more network `fallbackSrc`.
- **Spreadsheet** free-text cells (`DebouncedTextCell`) keep a local value and
  commit to the store on a 250 ms debounce or on blur. Combined with the
  memoised `SheetRow` from Phase 3c, sustained typing touches one row's local
  state, not the whole game object.
- **Colour pickers** in the style editor apply live via a `transient` update
  (no undo step) during the drag and record a single undo entry on
  `onChangeEnd`.

## Still open (future work)

- True windowing (`@tanstack/react-virtual`) for the spreadsheet `<table>` and
  the gallery grid — lazy-mount covers the image/CPU cost but the DOM node
  count still grows with the deck.
- A backend `GetThumbnail(path, size)` so the gallery streams downscaled JPEGs
  instead of full-resolution originals.
- `NumberInput` / `Slider` edits in the style editor still push an undo step per
  change (only the colour pickers are coalesced so far).
