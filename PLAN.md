# AO3 Social Media Formatter — Build Plan

A static web app that lets fan-fiction authors fill in a form describing a social
media post (Twitter/X to start) and get back ready-to-paste **HTML** and **CSS**
for an AO3 *Work Skin*, with a live preview of the rendered result.

---

## 1. Goals & non-goals

**Goals**

- Form-driven editor on the left (top on mobile), live preview on the right (bottom on mobile).
- Generate AO3-workskin-safe HTML and the matching CSS, each with a one-click **Copy** button.
- Faithfully reproduce the Twitter/X format from `twitter-example.html` / `twitter-example.css`.
  Note: the example HTML demonstrates the **main tweet + replies** path only. It contains **no
  quote tweet and no inline image**, so those DOM structures (§4) are *inferred from the CSS
  class names*, not copied from a verified example. Treat them as a best-guess to be validated
  on AO3, not as reproductions.
- Architecture that lets us add more formats (Facebook, Instagram, text messages, etc.) later
  without rewriting the core.
- 100% static — no backend. Everything runs in the browser. Deployable to any static host
  (GitHub Pages, Netlify, Cloudflare Pages).

**Non-goals (for v1)**

- No accounts, no saving to a server, no sharing links.
- No formats other than Twitter/X (but the code is structured to add them).
- No rich-text WYSIWYG editing of post bodies (plain text + basic line breaks only).

---

## 2. Tech stack

| Concern            | Choice                                      |
| ------------------ | ------------------------------------------- |
| Build tool         | **Vite** (`react-ts` template)              |
| UI library         | **React 18** + **TypeScript** (strict)      |
| Styling (the app)  | CSS Modules or plain CSS — app chrome only  |
| State              | React state + context (no Redux needed)     |
| Forms              | `react-hook-form` *(optional)* or controlled components |
| ID generation      | `crypto.randomUUID()` for list-item keys    |
| Lint/format        | ESLint + Prettier                           |
| Tests              | Vitest + React Testing Library              |

> The CSS that the app *outputs* for AO3 is hand-authored static text (see §6); it is
> unrelated to how the app itself is styled.

---

## 3. AO3 Work Skin constraints (domain rules that drive the design)

These rules dictate what HTML/CSS we are allowed to generate. Getting them right is the
whole point of the app.

1. **Two separate outputs.** AO3 keeps *CSS* in the Work Skin editor and *HTML* in the work
   body. The app produces two distinct copyable blocks.
2. **CSS selectors are scoped to `#workskin`.** Every rule we emit is prefixed with
   `#workskin` (the example CSS already follows this). AO3 wraps the work in
   `<div id="workskin">`.
3. **No inline styles.** AO3's sanitizer strips the `style` attribute. All styling must come
   from `class` attributes referencing the Work Skin CSS. Our HTML generator must **never**
   emit `style="..."`.
4. **Whitelisted tags/attributes only.** Safe set we will use: `div`, `p`, `span`, `a`, `b`,
   `i`, `em`, `strong`, `img`, `hr`, `br`, `blockquote`, `ul`/`ol`/`li`. Allowed attributes:
   `class`, `href`, `src`, `alt`, `width`, `height`. No `id` on user content, no event
   handlers, no `<style>`/`<script>`.
5. **Images are externally-hosted URLs only.** AO3's sanitizer allows only `http(s)` in
   `img src` (it strips `data:` URIs), so the app embeds images solely by their hotlinked
   external URL (`https://i.imgur.com/…`, a Tumblr `.pnj`, etc., exactly like the example HTML).
   The user pastes a URL per image; the renderer emits it verbatim. (See §7.)
6. **Full stylesheet output.** Per decision: always emit the *complete* Twitter workskin CSS
   (verbatim from `twitter-example.css`), not a minimized subset. An author pastes it once
   regardless of how many posts they embed.

---

## 4. The Twitter/X format, deconstructed

Derived from the example files. The format is one **main tweet** followed by an ordered list
of **replies**, with optional **quote tweet** and **inline image** on the main tweet.

### Main tweet (`.twt`)
- `.twt-header` → `.twt-icon-container` (avatar `img.twt-icon`) + `.twt-id`
  (`span.twt-name` + `<br>` + `span.twt-handle`)
- `.twt-content` → the tweet body (one or more `<p>`)
- *(optional)* inline image (`img.twt-image`) and/or quote tweet
  (`.twt-quotebox` + `.twt-iconquote` + `.twt-contentquote`)
- `.twt-timestamp` → e.g. `9:40 AM · <span class="twt-handle">10 hours ago</span>`
- `hr.twt-sep`
- `.twt-stat1` → labels line. In the example the gaps are non-breaking spaces:
  `Retweets &nbsp;&nbsp; Quote Tweets &nbsp;&nbsp; Likes` (see §6 — plain spaces collapse).

### Each reply (repeating block)
- `hr.twt-sep-reply`
- `.twt-replybox` → `.twt-icon-replycontainer` (avatar) + `.twt-replycontainer`:
  - `span.twt-name` + `span.twt-handle` (`@handle · <relative time>`)
  - `<br>` + `span.twt-handle`("Replying to") + `span.twt-hl`(`@target-handle`)
  - `.twt-replycontent` → reply body
  - `.twt-stat2` → three `.twt-social` blocks, each an `img.twt-socialimg`
    (reply / retweet / like icons — default to the three Imgur URLs in the example)

### Notes for the generator
- HTML in the example is **minified / single-line**. We can emit pretty-printed HTML for
  readability (AO3 doesn't care about whitespace), with an option to minify.
- **Every `<img>` in the example is wrapped in a `<p>`** (e.g.
  `<div class="twt-icon-container"><p><img class="twt-icon" …></p></div>`), and all text
  content sits inside `<p>` too. The builder must reproduce these `<p>` wrappers — the CSS's
  negative margins are tuned around them, so dropping them will shift the layout.
- **Avatar `<img>`s carry `width="50" height="50"` attributes** in addition to the CSS
  `width: 3.5em`. Reply avatars reuse the same `.twt-icon` class (there is no separate reply-icon
  class). The generator should emit these width/height attributes (see ImageRef in §5).
- The example hardcodes social-stat icons to fixed Imgur URLs — we keep these as defaults but
  allow override.
- Relative timestamps (`10 hours ago`) are free-text strings, not computed — the author
  controls them.
- Different replies reply to **different handles** (some reply to `@getmeoutttahere`, etc.), so
  `replyingTo` is genuinely per-reply, not a single global target.

---

## 5. Data model

TypeScript types live in `src/formats/twitter/types.ts`. Designed so a "format" is a
self-contained module the registry can mount.

```ts
// Shared
interface ImageRef {
  src: string;            // http(s) URL to an externally-hosted image (see §3.5)
  alt: string;
  width?: number;         // emitted as width="" attr (avatars default 50, matching example)
  height?: number;        // emitted as height="" attr
}

// Twitter format
interface TwitterReply {
  id: string;             // uuid for React keys / reordering
  avatar: ImageRef;
  name: string;
  handle: string;         // without leading @ (we add it)
  relativeTime: string;   // "10 hours ago"
  replyingTo: string;     // handle being replied to, without @
  content: string;        // plain text; newlines → paragraphs
  showStats: boolean;
  statIcons: { reply: ImageRef; retweet: ImageRef; like: ImageRef };
}

interface QuoteTweet {
  enabled: boolean;
  avatar: ImageRef;
  name: string;
  handle: string;
  content: string;
}

interface TwitterPost {
  author: { avatar: ImageRef; name: string; handle: string };
  content: string;
  image?: ImageRef;       // optional inline image
  quote: QuoteTweet;
  time: string;           // "9:40 AM"
  relativeTime: string;   // "10 hours ago"
  stats: { showRow: boolean; labels: string };  // default uses NBSP gaps, see §6 note
  replies: TwitterReply[];
}
```

A single top-level app state holds `{ activeFormat: 'twitter', twitter: TwitterPost }`.
Persisted to `localStorage` (debounced) so a refresh doesn't lose work. Since images are just
URL strings, the persisted state is small; still wrap the write in try/catch so any storage
failure degrades gracefully instead of crashing the app.

---

## 6. HTML & CSS generation

### CSS
- Store the canonical Twitter CSS as a string constant (`src/formats/twitter/styles.ts`),
  copied verbatim from `twitter-example.css`. It already includes the shared utility classes
  (fonts, buttons, containers) — keep them so the block is reusable.
- The CSS output panel just renders this string. (Per §3.6, always the full sheet.)
- Copy it **verbatim, quirks included** — the source has a stray leading indent on line 1 and
  uses `float: center` (not a valid `float` value, silently ignored by browsers) on `.twt` and
  `.twt-image`. Don't "fix" these; the goal is byte-for-byte parity with what authors already
  use, and the invalid `float` is harmless.

### HTML
- A pure function `renderTwitter(post: TwitterPost): string`.
- **Approach: build a DOM tree, not string concatenation.** Use small element-builder
  helpers (`el(tag, attrs, children)`) so we *cannot* accidentally emit disallowed
  attributes, and so escaping is automatic. Serialize the tree with proper HTML escaping of
  all text (`&`, `<`, `>`, quotes).
- Multi-line `content` strings → split on blank lines into multiple `<p>`; single newlines →
  `<br>`. Wrap avatar/image elements in a `<p>` to match the example (§4 notes).
- **Whitespace gotcha — runs of spaces collapse.** HTML escaping only touches `&`, `<`, `>`,
  and quotes; it leaves spaces alone, and the browser then collapses consecutive spaces to one.
  The stats labels (`Retweets   Quote Tweets   Likes`) rely on visible gaps, so store/emit
  **non-breaking spaces** for them — either keep literal U+00A0 characters in the default
  string (they serialize unescaped and don't collapse) or post-process runs of 2+ spaces into
  `&nbsp;`. Don't blanket-convert all text, only the stats label.
- Conditionals: omit quote box if `quote.enabled` is false; omit image if absent; omit a
  reply's `.twt-stat2` if `showStats` is false; omit the stats row if `stats.showRow` false.
- Output is pretty-printed by default; a "Minify" toggle collapses whitespace to match the
  example's single-line style.

### Why DOM-tree over template strings
Safety (no malformed/unescaped HTML), testability (assert on structure), and it makes adding
new formats a matter of writing another render function over the same builder utilities.

---

## 7. Image input — URL paste

Every image slot is an `ImageInput` component rendered inline next to the thing it represents
(the author avatar, the inline tweet image, the quote avatar, and each reply's avatar). Layout
decided: inline, not a consolidated panel. Images are externally-hosted URLs only (see §3.5).

1. A single text field: the user pastes the URL of an externally-hosted image
   (`https://i.imgur.com/…`, a Tumblr `.pnj`, etc., exactly like the example HTML).
2. Store it verbatim as `ImageRef { src: <pasted>, alt, width?, height? }`.
3. The renderer emits that string **unchanged** into the `<img src="…">` (escaped for HTML
   attribute context, but not rewritten) — what the user pastes is what lands in the final
   HTML, so AO3 hotlinks it directly. No network fetch, no proxying, no validation beyond a
   light `https?://` sanity check + a "looks empty / not a URL" hint.
   - **Warn on `http://` URLs.** AO3 is served over HTTPS, so a plain-`http` image is blocked
     as mixed content and silently fails to load (broken image) for readers. If the pasted URL
     starts with `http://`, show an inline warning telling the user to use an `https://` link
     instead. This is a non-blocking warning, not a hard rejection (the user may still paste
     it), but it should be visually prominent next to the field.
4. An `alt` field sits alongside the URL field; avatars also default `width`/`height` to 50
   (matching the example) with the option to clear them.

---

## 8. UI / layout

- **Two-pane responsive layout.**
  - Desktop (≥ 900px): CSS grid, left = form (scrollable), right = sticky preview.
  - Mobile: stacked — form on top, preview below.
- **Header bar:** app title, format selector (`<select>` — only Twitter enabled in v1),
  Minify toggle, "Reset" button.
- **Form (left):** collapsible sections —
  1. *Author* (avatar, name, handle, tweet time, relative time)
  2. *Tweet content* (textarea, optional inline image, optional quote tweet)
  3. *Stats row* (toggle + editable label text)
  4. *Replies* — repeatable cards with add / remove / drag-to-reorder; each card has its own
     avatar, name, handle, "replying to", body, stats toggle.

  Each image (author/quote/reply avatars, inline image) is an inline `ImageInput` (§7) — a
  **"Paste URL"** field right inside its section — so the external URL is edited next to the
  element it belongs to and flows verbatim into the output `src`.
- **Preview (right):** renders the generated HTML **inside a `<div id="workskin">` with the
  generated CSS injected into a scoped `<style>`**, so the preview matches AO3 exactly
  (including the `#workskin` scoping). Use a Shadow DOM or an `<iframe>` to isolate the
  preview's CSS from the app's own styles.
- **Output panels:** below or in tabs — two read-only code areas ("HTML" / "CSS"), each with
  a **Copy** button and a copied-confirmation toast.

### Preview isolation decision
Render the preview in an **`<iframe>`** (srcdoc). It gives true CSS isolation, replicates the
`#workskin` wrapper, and means the example's bare-element selectors can't leak into or be
clobbered by the app's styles. (Shadow DOM is the lighter alternative if iframe sizing proves
fiddly.)

---

## 9. Project structure

```
src/
  main.tsx
  App.tsx
  lib/
    htmlBuilder.ts      # el()/serialize() escaping-safe builders
    clipboard.ts        # copy helper + toast
    storage.ts          # debounced localStorage persistence
  formats/
    registry.ts         # FormatDefinition[] — drives the format selector
    types.ts            # shared FormatDefinition, ImageRef
    twitter/
      types.ts          # TwitterPost et al.
      defaults.ts       # seed state (pre-filled from example for first-run demo)
      styles.ts         # canonical CSS string (from twitter-example.css)
      render.ts         # renderTwitter(post) → html string
      Form.tsx          # the Twitter form fields
  components/
    Layout.tsx          # two-pane responsive shell
    PreviewPane.tsx     # iframe srcdoc renderer
    OutputPanel.tsx     # code box + copy button
    ImageInput.tsx      # URL-paste field (+ alt, width/height)
    RepeatableList.tsx  # add/remove/reorder for replies
  styles/               # app chrome CSS
```

### Format registry (extensibility seam)

```ts
interface FormatDefinition<TState> {
  id: string;                 // 'twitter'
  label: string;              // 'Twitter / X'
  defaults: TState;
  css: string;                // full workskin CSS
  Form: React.FC<{ state: TState; onChange: (s: TState) => void }>;
  render: (state: TState) => string;   // → HTML
}
```

Adding Facebook later = drop in `formats/facebook/` and register it. The shell, preview,
output panels, image pipeline, and copy logic are all format-agnostic.

---

## 10. Build phases / milestones

**Phase 0 — Spike (do first, de-risks everything):**
- Scaffold Vite + React + TS. Confirm it builds and deploys to a static host.
- Paste a draft work with a hotlinked `https://` image into AO3 and confirm it survives
  sanitization and renders (the supported image route — see §3.5).

**Phase 1 — Core skeleton:**
- Two-pane responsive `Layout`, iframe `PreviewPane`, two `OutputPanel`s with copy.
- Format registry with Twitter registered; CSS string wired through.

**Phase 2 — Twitter render + static form:**
- `renderTwitter` over the DOM-builder utils; unit-test against the example structure.
- Author + content + stats form fields; live preview updates.

**Phase 3 — Replies & quote/image:**
- `RepeatableList` for replies (add/remove/reorder), quote tweet, inline image.
- `ImageInput` URL-paste field wired into every image slot, with `http://` mixed-content
  warning and `alt`/dimension fields.

**Phase 4 — Polish:**
- localStorage persistence, Minify toggle, Reset, first-run demo seeded from the example,
  copy toasts, empty/long-input handling, accessibility (labels, focus, keyboard).

**Phase 5 — Tests, docs, deploy:**
- Vitest coverage on `render.ts`, `htmlBuilder.ts`.
- README with usage + the AO3 paste workflow. CI build + deploy to GitHub/Cloudflare Pages.

---

## 11. Testing strategy

- **Unit:** `renderTwitter` snapshot/structure tests; HTML-escaping tests (inject `<script>`,
  `&`, quotes into name/content → assert escaped, no `style`/`id` leakage). Builder rejects
  disallowed attrs. Assert the stats label preserves its gaps (NBSP, not collapsed spaces) and
  that avatar `<img>`s are `<p>`-wrapped with `width`/`height` attributes (§4/§6).
- **Component:** form edits propagate to preview; add/remove/reorder replies; image URL input
  (including the `http://` mixed-content warning).
- **Manual AO3 acceptance:** paste generated CSS + HTML into a real AO3 work draft and confirm
  it renders identically to the local preview (this is the true source of truth — the AO3
  sanitizer is the spec).

---

## 12. Open questions / risks

- **Broken hotlinked images** — images depend on the external host staying up and serving over
  `https://`; the app warns on `http://` URLs (§7) but can't guarantee a third-party host won't
  go down or hotlink-block later. This is inherent to the URL-only approach (§3.5).
- **Font/utility classes** — the example CSS ships many extra classes (fonts, buttons,
  Facebook/IG containers, self-notes). v1 keeps them in the CSS block but doesn't expose
  controls for them; they become hooks for future formats.
- **Preview fidelity** — AO3's surrounding site CSS can subtly affect rendering; the iframe
  preview gets us close but the manual AO3 check remains authoritative.
- **Unverified quote-tweet / inline-image markup** — neither appears in the example HTML, so
  their DOM structure (§4) is inferred from CSS class names. Build them, but flag them for the
  manual AO3 acceptance check before trusting the layout; the negative-margin CSS may need the
  exact nesting to look right.
- **iframe auto-height** — a `srcdoc` iframe won't size to its content automatically; sync
  height via `ResizeObserver` on the iframe's `contentDocument.body` (Shadow DOM avoids this if
  iframe sizing proves too fiddly, per §8).

---

## 13. Definition of done (v1)

- A user can fill the Twitter form (author, content, optional image/quote, stats, multiple
  replies), see an accurate live preview, copy the HTML and CSS, paste both into AO3, and get
  a result matching the preview.
- Generated HTML uses only whitelisted tags/classes, no inline styles, all text escaped.
- App is static, builds clean, and is deployed to a public static URL.
