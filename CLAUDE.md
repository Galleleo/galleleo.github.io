# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A vanilla React 18 static site — a Discogs Collection Video Player. It integrates with the Discogs API to browse a user's vinyl collection or wantlist and plays YouTube videos for each release. There is **no build step**: React, ReactDOM, and Babel are loaded from CDN; Babel transpiles JSX in the browser at runtime.

## Development

**Local dev server** (HTTPS required for YouTube IFrame API):
```bash
python3 server.py
```
Runs on `https://localhost:8443` using `cert.pem`. You need to generate `key.pem` locally (it is gitignored). The cert is self-signed; accept the browser warning.

There are **no tests, no linter, no package.json**. Edit files directly and reload the browser.

**Deployment**: Push to `main` → GitHub Pages auto-deploys `index.html`.

## Architecture

### Entry Point

`index.html` loads CDN scripts in order: React → ReactDOM → Babel → YouTube IFrame API → app JS files → mounts `<div id="root">`. All `<script>` tags for `.jsx`/`.js` files use `type="text/babel"`.

### Core Application (`js/app.js`, ~1250 lines)

Single monolithic functional component (`App`) using React Hooks. Key concerns:

- **Discogs API calls**: fetch collection or wantlist pages with exponential backoff on 429 rate-limit responses. Requires a user-provided OAuth token for wantlist access.
- **YouTube Player lifecycle**: The YouTube IFrame API (`window.YT`) is initialized once via a global `onYouTubeIframeAPIReady` callback. Each release card manages its own player instance. A single-play constraint pauses all other players when one starts.
- **State**: 25+ `useState` hooks covering UI visibility, fetched collection data, playback settings, and modal state. No external state manager.
- **localStorage**: Persists username, token, playback preferences (autoplay, shuffle, continuous, random-next), and per-release video drag-and-drop orderings.
- **Video matching**: Fuzzy title normalization and remix detection map Discogs track names to YouTube search results.

### CSS (`css/`)

Six modular files, each scoped to a UI concern: `main.css` (layout/header/footer), `controls.css` (buttons/inputs), `release.css` (release cards), `videos.css` (video grid/player), `modal.css` (overlays), `responsive.css` (media queries). All loaded via `<link>` tags in `index.html`.

### Legal Components (`legal/`)

`terms.jsx`, `privacy.jsx`, `legal.jsx` — JSX files loaded via Babel script tags. They render into modals opened from the footer. `js/legal-config.js` updates copyright year and "Last Updated" date dynamically.

### Utilities

- `js/test_videos.js` — debug script for inspecting duplicate video extraction; not used in production flow.
- `server.py` — Python 3 HTTPS server for local dev; reads `cert.pem` + `key.pem`.

## Key Constraints

- **No npm / no bundler**: Do not introduce `import`/`export` ES module syntax — Babel standalone does not support module resolution. Use global variables and `window.*` for cross-file communication.
- **CORS**: All API calls go directly from the browser; no backend proxy. Discogs tokens are stored only in localStorage, never committed.
- **YouTube API timing**: `window.YT` is not available synchronously. Player creation must be deferred until `onYouTubeIframeAPIReady` fires.
- **HTTPS requirement**: The YouTube IFrame API refuses to load on plain HTTP, hence the local HTTPS dev server.
