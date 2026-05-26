# AO3 Social Media Formatter

> ⚠️ **Alpha software — expect bugs.**
> **Local only. No data leaves your browser.**
>
>  Use it here:
>  https://prichmp.github.io/ao3-social-media-formatter/

A static web app for fan-fiction authors who want to embed social-media-post
mockups (Twitter/X to start) in their AO3 works. You fill in a form describing a
post — author, content, replies, an optional quote tweet and inline image — and
the app renders it to a **single downloadable PNG image** that you can host
anywhere and link into your fic.

Everything runs in the browser. There is no backend, no account, and no network
request for your content — your draft is saved only to your browser's
`localStorage`.

## Why an image?

AO3's HTML sanitizer strips most styling, which makes a pixel-faithful tweet
hard to reproduce as work-skin markup. Rendering to an image sidesteps the
sanitizer entirely: you upload the PNG to an image host (Imgur, Tumblr, your own
host) and embed it like any other picture.

## Features

- **Form-driven editor** with a live preview that re-renders as you type.
- **Twitter/X format:** author header, tweet body, timestamp, a stats line,
  an optional quote tweet, an optional inline image, and any number of replies.
- **Per-image input modes** — for every avatar and the inline image you can
  either:
  - **paste a remote URL** (e.g. an Imgur/Tumblr link), or
  - **upload a file**, which is resized, re-encoded to **WebP**, and stored as a
    base64 data URL right in your saved state.
- **Save / Load / Export / Import** — name and keep multiple drafts in
  `localStorage`, or export/import a draft as a JSON file.
- **Saved Users** — a reusable library of authors you can drag into the author
  or reply slots.
- **Download PNG** — exports the preview at 2× for a crisp image.

## Getting started

Requires Node 18+.

```bash
npm install     # install dependencies
npm run dev     # start the dev server at http://localhost:5173
npm run build   # type-check and produce a production build in dist/
npm run test    # run the unit tests (Vitest)
npm run lint    # run ESLint
```

The build output in `dist/` is fully static and can be deployed to any static
host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

## Using it with AO3

1. Fill in the form and check the live preview.
2. Click **Download image (PNG)**.
3. Upload the PNG to an image host that serves over **HTTPS**.
4. Embed the hosted image in your AO3 work as you would any other image.

## A note on images & CORS

The exported PNG is produced with an HTML `<canvas>`. To export it, the browser
must be able to read every image drawn onto the canvas, which means remote
images need to allow cross-origin use (`Access-Control-Allow-Origin`).

- **Imgur** (`i.imgur.com`) and **Tumblr** (`64.media.tumblr.com`) both allow
  this, so links from them work for both preview *and* download.
- A host that doesn't send CORS headers will load as a **placeholder** in the
  preview (with a warning) rather than silently breaking the download.
- **Uploaded files** become same-origin data URLs, so they always export
  cleanly — when in doubt, upload instead of linking.

`http://` (non-HTTPS) image URLs are flagged: AO3 is served over HTTPS, so a
plain-`http` image is blocked as mixed content for readers.

## Tech stack

- **Vite** + **React 18** + **TypeScript** (strict)
- **CSS Modules** for app styling
- **Vitest** for tests
- No runtime dependencies beyond React — the renderer is hand-written canvas
  code.

## Project structure

```
src/
  App.tsx                     # top-level state, save/load/import/export, layout wiring
  components/
    Layout.tsx                # responsive shell + Saved Users drawer
    CanvasPreview.tsx         # live <canvas> preview, re-renders on edit
    DownloadButton.tsx        # canvas → PNG download
    DropdownMenu.tsx          # top-bar actions menu
    ImageInput.tsx            # URL-or-upload field for each image slot
    ...
  formats/
    registry.ts               # format definitions (extensible seam)
    types.ts                  # shared ImageRef / FormatDefinition / RenderResult
    twitter/
      types.ts, defaults.ts   # data model + seed content
      Form.tsx                # the Twitter form
      canvas/
        theme.ts              # colors, fonts, sizes
        text.ts               # word-wrapping helpers (pure)
        images.ts             # crossOrigin image preloading
        drawTweet.ts          # layout (measure) + paint passes
        renderTweetImage.ts   # orchestrator: fonts → preload → measure → paint
  lib/
    storage.ts                # debounced localStorage persistence
    saves.ts                  # named saves
    imageUpload.ts            # resize + WebP encode for uploads
    UserListContext.tsx       # Saved Users state
```

Adding another format (Facebook, Instagram, text messages, …) means dropping a
new module under `formats/` that supplies a data model, a form, and a
`renderImage` function — the shell, preview, download, and image pipeline are
format-agnostic.

## Limitations & roadmap

- Only the **Twitter/X** format exists so far.
- The tweet layout is a clean re-creation, not a pixel-perfect clone of any
  specific Twitter/X version.
- Drafts live in `localStorage`, which is **per-browser** and has a size limit
  (~5 MB); large uploads across many saved drafts can hit it. Use Export to back
  up a draft.
- This is alpha software — expect rough edges.
