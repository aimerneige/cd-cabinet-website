# CD Cabinet

A desktop-first virtual CD collection built with React, TypeScript, Vite, GSAP and Zustand. All 24 fictional album artworks are local SVGs; no API key or backend is needed.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
npm test
```

Browser interaction tests (requires a Playwright Chromium installation):

```bash
npx playwright install chromium
npm run test:browser
```

Use Node.js 22.12 or later.

## Interaction

Hover or focus a spine, then click or press Enter to pull out the album. Its jewel case opens to reveal the artwork and disc. Close, Escape, or the background returns it to its original slot using the same timeline in reverse. Reduced motion uses a short fade.

Search by album or artist, filter by genre, and sort by shelf order, artist or year. **Edit shelf** restores the unfiltered shelf order. Drag within each shelf, or focus a CD and use Space, arrow keys and Space again to reorder. Collection changes are in memory and reset on reload. Track lists are informational; playback is intentionally absent.

## Structure

- `src/components/Shelf`: cabinet and accessible sortable spines
- `src/components/CDCase`: reusable CSS 3D jewel case
- `src/components/ActiveCD`: fixed viewing layer, focus and dismissal
- `src/hooks/useAlbumAnimation.ts`: measured origin and reversible GSAP timeline
- `src/components/AlbumDetails`: album metadata and tracks
- `src/store/collectionStore.ts`: collection business state and ordering
- `src/data/albums.ts`, `src/types/album.ts`: mock collection and model
- `public/assets/albums`: self-contained vector artwork
- `src/styles/global.css`: responsive cabinet, case and reduced motion styles

Fonts and artwork are bundled locally. Font licenses are included in `public/assets/fonts`. The application makes no external requests.
