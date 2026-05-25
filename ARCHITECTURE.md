# Architecture

This is a single-page Vite/React/TypeScript app that runs entirely in the
browser. There is no server, no account, no network request for user content.
Editing state is tab-local; named saves and the saved-users list are the only
things persisted to `localStorage`. The end product is a PNG rendered from an
HTML `<canvas>` plus an AO3-ready `<img>` snippet whose `alt` is a Markdown
transcription of the post.

```
┌─────────────────────────────────────────────────────────────┐
│ Layout (shell)                                              │
│  ┌────────────────────────┐  ┌────────────────────────────┐ │
│  │ Format <Form>          │  │ <CanvasPreview>            │ │
│  │  (active format only)  │  │  ↓ on each post change     │ │
│  │                        │  │  renderImage(canvas, post) │ │
│  │  fields → onChange     │  │                            │ │
│  │   ↓                    │  ├────────────────────────────┤ │
│  │  setState(s, fmt, ...) │  │ <DownloadButton>           │ │
│  └────────────────────────┘  │ <ImgTagSnippet>            │ │
│  ┌──────────────────────┐    └────────────────────────────┘ │
│  │ <UserListPanel>      │                                   │
│  │   (drawer, draggable)│                                   │
│  └──────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## The format-module pattern

The app supports multiple social-media formats (Twitter, iMessage, Livestream,
Email, Tumblr). Each format is a self-contained module under
`src/formats/<name>/`. **A format module does not import from a sibling format
module.** All shared code lives in `src/lib/` or `src/components/`.

```
src/formats/<name>/
├── types.ts                         # interfaces + discriminated unions
├── schema.ts                        # zod schemas (mirror of types.ts)
├── defaults.ts                      # example state, used by the registry
├── Form.tsx + Form.module.css       # editor UI
├── markdown.ts                      # state → Markdown (for alt text)
└── canvas/
    ├── theme.ts                     # visual constants (colors, sizes, fonts)
    ├── images.ts                    # CORS-safe preload of every image src
    ├── draw<X>.ts                   # layout (measure) + paint (draw) passes
    └── render<X>Image.ts            # orchestrator: fonts → preload → measure → size → paint
```

This split-module shape was deliberate. Adding a sixth format means adding a
sixth `formats/<name>/` directory and registering it; the other five don't
move. The first iteration of the codebase coupled Twitter to the App shell;
peeling it apart was the biggest refactor in the project's history.

### Format registry

`src/formats/registry.ts` exports `formats: FormatDefinition<any>[]` — one
entry per format with `id`, `label`, `defaults`, `Form`, and `renderImage`.
The registry erases per-format generics so heterogeneous formats can sit in
one array; the App dispatch site casts back to the right shape per active
format id.

```ts
export interface FormatDefinition<TState> {
  id: string;
  label: string;
  defaults: TState;
  Form: React.FC<{ state: TState; onChange: (s: TState) => void }>;
  renderImage: (canvas: HTMLCanvasElement, state: TState) => Promise<RenderResult>;
}
```

### Adding a new format

1. Create `src/formats/<name>/` with the seven files above.
2. Define your state interface + a zod schema that matches it (with a
   `_Matches` compile-time conformance check at the bottom of `schema.ts`).
3. Implement `layout<X>` + `paint<X>` in `canvas/draw<X>.ts`. Two passes:
   `layout` measures and produces a flat `Prim[]` list plus the total
   `{width, height}`; `paint` executes the primitives against a real 2D
   context.
4. Implement the form in `Form.tsx` and a markdown serializer in `markdown.ts`.
5. Register the format in `formats/registry.ts`.
6. Wire the format into `App.tsx`: add the id to `FormatId` and
   `formatIdSchema`, add the slot to `AppState`, add an `EMPTY_<NAME>` and
   plug it into the per-format branches of `activeData`, `setActiveData`,
   `isCurrentDirty`, `doNamedSave`, `doLoad`, `doImport`, `handleExport`,
   `createNew`, `handleReset`, and the `altMarkdown` dispatch.
7. Update `lib/saves.ts` `namedSaveSchema` with the new variant.

There's no abstraction that hides those App.tsx switch arms. They're tedious
but mechanical — the alternative (a fully type-erased dispatch table) would
hide which fields per-format `isCurrentDirty` actually checks, and that
turned out to matter.

---

## Canvas rendering pipeline

Every format follows the same shape, encoded as the `Prim` discriminated union
inside each `draw<X>.ts`:

```ts
type Prim =
  | { t: 'rect'; ... }
  | { t: 'text'; ... }
  | { t: 'image'; ... }
  | ...format-specific (tri, circle, verified, etc.)
```

**Why two passes:** sizing the real canvas with `canvas.width = N` *clears it*,
so layout has to happen against a throwaway 2D context first. Once we know the
total height we resize the real canvas, then paint.

```
renderXxxImage(canvas, state)
  ├── await document.fonts.ready          # avoid first-render metric drift
  ├── preloadImages(state)                # crossOrigin = 'anonymous'
  ├── measureCtx = throwaway canvas       # for measureText
  ├── layout<X>(measureCtx, state, images) → { width, height, prims }
  ├── canvas.width  = ceil(width * scale) # max(devicePixelRatio, theme.exportScale=2)
  ├── canvas.height = ceil(height * scale)
  ├── ctx.setTransform(scale, ...)        # so prims can use logical px
  └── paint<X>(ctx, layout)
```

The result returned is the **logical** (CSS-px) `{width, height}`, not the
backing-store size — that's what goes into the `<img>` snippet's `width`/`height`
attributes.

### Shared canvas utilities

- `src/lib/canvasText.ts` — `wrapText(measure, text, maxWidth)` returns a
  `WrappedText` (paragraphs of visual lines). Used by every format. Takes a
  `measure: (s) => number` callback (not a Canvas context) so it's unit-testable
  with a stub.
- `truncateToWidth(measure, text, maxWidth)` — binary-search the longest prefix
  that fits with an ellipsis appended. Used by formats that need single-line
  truncation (livestream title, music track title).

### Image loading + CORS

Images are loaded with `crossOrigin = 'anonymous'` so drawing them doesn't
taint the canvas (which would make `toBlob`/`toDataURL` throw). Hosts that
don't send CORS headers fail their `onload` and resolve `null`, which `paint`
draws as a colored placeholder rectangle instead of breaking the download.

Failed src URLs surface in `RenderResult.failed`, which `CanvasPreview`
displays as a soft warning under the canvas.

### The `Prim` "tri" trick

The verified badge, video play overlay, etc. need shapes the basic prim set
doesn't model. Two patterns are used:

1. **`tri` prim** — three points + fill. Used for play-button triangles. Added
   to twitter and iMessage prim sets where needed.
2. **`verified` prim** — twitter-specific. Encapsulates "blue disc + white
   checkmark" so the badge stays one drawing primitive instead of a rect + a
   path the caller has to assemble.

The principle: keep `Prim` small and add a tagged variant when a new shape is
needed somewhere; don't expose `path2d` as a prim and force callers to wrangle
canvas commands.

---

## Discriminated unions: attachments and message content

Several places use the same shape: a thing that has exactly one kind, with
per-kind fields, validated by `z.discriminatedUnion('type', [...])`.

| Where | Variants |
|---|---|
| `TweetAttachment` (twitter) | `text` \| `image` \| `quote` \| `video` \| `music` |
| `MessageContent` (iMessage) | `text` \| `image` \| `video` |
| `NamedSave` (saves) | `twitter` \| `imessage` \| `livestream` \| `email` \| `tumblr` |
| Import-file (App.tsx) | same set as `NamedSave`, discriminated by `format` |

Each union has a `default<X>(type)` factory used by dropdowns: when the user
switches type, the form replaces the active branch with a fresh empty value of
the new variant. Stale fields from the previous variant are intentionally
dropped — they'd just add noise to the saved JSON.

---

## Persistence model

This was the most-revised area of the codebase. The current contract:

| Slice | Persisted? | Where | Cross-tab |
|---|---|---|---|
| Editing buffer (`twitter`, `imessage`, `livestream`, `email`, `tumblr`) | ✗ | nowhere | tab-local; each tab opens to defaults |
| `activeFormat`, `currentSaveId`, `currentSaveName` | ✗ | nowhere | tab-local |
| Named saves (Save / Load menu) | ✓ | `ao3-formatter-saves` | last-write-wins |
| Saved users list | ✓ | `ao3-formatter-users` | last-write-wins |

The earlier model auto-saved AppState on every keystroke. Multi-tab use broke
it: both tabs read the same key on init, so the second tab silently
overwrote the first tab's draft on its first save. The current model treats
the Save/Load menu as the persistence mechanism for editing work, and only
holds the user list (which spans tabs naturally) sticky.

### What "last-write-wins" means

For both `ao3-formatter-saves` and `ao3-formatter-users`: each tab writes the
whole array on every change (debounced). No cross-tab `storage`-event listener
— adding one would let tab B's save clobber tab A's in-flight edit
mid-keystroke. No read-modify-write merge — it can't reconcile deletions
across tabs. If better-than-LWW becomes required, the answer is CRDT or a
server.

### Validation at boundaries

Every load path runs through a zod schema. On mismatch, the loader logs a
`console.warn`, **clears the bad key**, and returns the empty default
(`[]` for saves and users, `null` for the absent case). The app survives
corrupt or hand-edited storage rather than crashing on every open.

Imports (file → app) also validate. The user gets an alert; the ZodError
detail goes to the console.

There is no migration. Old data shapes are rejected — the project has held to
"assume nobody has actually used this site yet, breaking changes are free."
If that stops being true the migration story has to be designed; it isn't
worth pre-paying for now.

---

## SavedUser: the cross-format contact

`SavedUser` (in `src/lib/savedUser.ts`) is a portable contact card with the
union of fields any format might want: `name`, `handle`, `email`, `color`,
`avatar`, `verified`. Each format picks the fields it cares about when a
SavedUser is dragged in.

| Format | Reads |
|---|---|
| Twitter author / reply / quote | `name`, `handle`, `avatar`, `verified` |
| iMessage contact | `name` (or `handle`), `avatar` |
| Livestream stream | `name` (or `handle`), `avatar` |
| Livestream chat | `handle` (or `name`), `color` |
| Email message | `name`, `email`, `color`, `avatar` |
| Tumblr entry | `handle` (or `name`), `avatar` |

### Drag-drop

- The `UserListPanel` cards are `draggable`. `handleDragStart` writes the
  user as JSON onto the dataTransfer under `SAVED_USER_DRAG_TYPE`.
- Each format's `Form` opts in to receiving drops by wrapping the relevant
  section/card with `useDropTarget(SAVED_USER_DRAG_TYPE, onDrop)` (from
  `src/lib/useDropTarget.ts`).
- The drop handler is per-format: it extracts the fields the format cares
  about and merges them into the local state shape.

The `RepeatableList` component also accepts an `externalDragType` +
`onExternalDrop` so dragging a user **between items** in a list (replies,
chat messages, email messages, reblog entries) inserts a new item pre-filled
with that user.

### "+ Add to user list"

Each format's per-item card has a button that appears once the item has
enough identifying info (and isn't already a duplicate). The button creates
a SavedUser from the item's current fields and calls `addUser` from the
`UserListContext`.

---

## App.tsx: per-format dispatch

`App.tsx` holds:
- `state: AppState` — the editing buffer for all formats (one slot per format
  so switching formats preserves work).
- `users: SavedUser[]` — separate React state, persisted via `usersStorage`.
- A handful of modal / UI state pieces.

The dispatch helpers near the top of the file are how the App talks to the
active format without knowing which one it is:

```ts
type ActiveData = TwitterPost | IMessageChain | LivestreamSegment | EmailThread | TumblrPost;
function activeData(state: AppState): ActiveData;
function setActiveData(state: AppState, data: ActiveData): AppState;
```

Everything format-specific (save, load, import, export, reset, new,
isCurrentDirty, markdown) is a chain of ternaries on `state.activeFormat`.
The trade-off is verbosity for readability — every per-format behavior is
visible at the dispatch site instead of buried in a registry table.

### Markdown for the AO3 snippet

The `<img>` tag in `ImgTagSnippet` has `alt=` populated by the
format-specific Markdown serializer (`tweetToMarkdown`, `chainToMarkdown`,
`segmentToMarkdown`, `threadToMarkdown`, `postToMarkdown`). These render the
post's data as plain text — no `**bold**` or `_italic_` markers — so screen
readers and text-only consumers get the full content as a fallback.

---

## Layout & shared components

`src/components/Layout.tsx` is the shell: header bar, format-form / preview
two-column body, right-edge drawer for the user list, and a small footer with
project notes. The drawer can be opened from either the header toggle or the
tab affixed to its left edge.

| Component | What it does |
|---|---|
| `Layout` | Three-row shell (header / body / footer), preview right-column, user drawer |
| `CanvasPreview<T>` | Drives `renderImage`, surfaces `RenderResult` failures + dimensions |
| `DownloadButton` | `canvas.toBlob` → object URL → anchor download |
| `ImgTagSnippet` | The AO3-ready `<img>` snippet + Copy button |
| `DropdownMenu` | Single-button-with-anchored-menu (the top-right Menu) |
| `Modal` | Generic dialog wrapper used for naming, confirms, the load list |
| `RepeatableList` | Reorderable + addable + removable list, optional external drop |
| `ImageInput` | URL / file-upload tabs, base64-encodes uploads, surfaces CORS warnings |
| `UserListPanel` | SavedUser CRUD in the drawer — add form, view cards, inline edit |

The form chrome (`Section`, `Field`, `TextInput`, `TextArea`) is duplicated
per-format Form.tsx rather than shared. The components are tiny and the
formats have intentionally diverged in small ways (drop-target behavior,
focus tint color); a shared abstraction would force them back into lockstep.

---

## Tests

Vitest + jsdom. Tests live next to their source as `*.test.ts`.

| Layer | What's tested |
|---|---|
| `lib/canvasText.test.ts` | Text wrapping edge cases |
| `lib/htmlBuilder.test.ts` | Allowlisted HTML construction, attribute escaping |
| `lib/imageUpload.test.ts` | File reader / WebP encoding |
| `lib/markdownBuilder.test.ts` | Twitter markdown serializer |
| `lib/saves.test.ts` + `usersStorage.test.ts` | Persistence: round-trip, schema-reject-clears, bad-JSON-clears |
| `formats/<name>/schema.test.ts` | Happy path + every required-field rejection |
| `formats/<name>/canvas/draw<X>.test.ts` | Layout invariants (positive height, prim positions inside card, growth when content added) |
| `formats/<name>/markdown.test.ts` | Markdown shape per branch |

Canvas tests use a stub measure context (`{ measureText: s => ({ width: s.length * 8 }) }`)
because jsdom has no real text metrics. The stub is consistent across the
`wrapText` call and the assertion, so width-dependent assertions are
internally consistent.

There are no React-component tests today — `@testing-library/react` is
installed but the form components are thin enough that the schema + canvas
tests catch most regressions in practice.

---

## Build & deploy

- `npm run dev` — Vite dev server, HMR.
- `npm run build` — `tsc -b` then `vite build`. Output is fully static.
- `npm run test` — Vitest, single run.
- `npm run lint` — ESLint (currently with no local config — placeholder).

The deploy target is GitHub Pages (`.github/workflows/deploy.yml`). The
workflow builds with Node 24 on `ubuntu-latest`, uploads `dist/` as a Pages
artifact, and `actions/deploy-pages@v4` serves it. The repo's GitHub Pages
source must be set to **GitHub Actions** (not "Deploy from a branch") for
this to take effect.

Vite is configured to bundle base64-uploaded images straight into the
`localStorage`-persisted state. There is no asset CDN — the only external
asset assumption is that user-pasted URLs (Imgur, Tumblr) serve CORS-friendly
images.

---

## Things that look weird but are intentional

- **No `migrate()` step on schema load.** Stored data that doesn't validate is
  wiped, not patched. Tradeoff documented above.
- **Format dispatch is a ternary cascade, not a table.** Every per-format
  behavior is grep-able at the call site.
- **Form chrome is duplicated per format.** Same reason.
- **`SavedUser` carries union-of-all-formats fields (including `verified`
  which only twitter uses).** A SavedUser can be dragged into any format
  without losing information it might need later.
- **No cross-tab storage listener.** Would risk clobbering an in-flight edit
  in another tab. LWW is documented.
- **The canvas renderer goes through a measure pass, not just layout-at-paint
  time.** Sizing the canvas clears it, so we have to know the height first.

---

## Things to be cautious about

- **localStorage limits.** Uploaded images become base64-encoded data URLs
  inside the saved state. Several large images in a single named save can
  push close to the 5 MB quota. The current behavior on quota failure is to
  silently drop the save attempt; there's no user-facing surfacing of it.
- **CORS-tainted canvases.** If an image fails CORS, the canvas becomes
  tainted and `toBlob()` throws. The preload step catches most cases by
  resolving `null` for failed images, but a misconfigured host that returns
  200 with no `Access-Control-Allow-Origin` will still taint the canvas.
- **`crypto.randomUUID()`** assumes a secure context (HTTPS or `localhost`).
  GitHub Pages provides one; some embedded webviews may not.
