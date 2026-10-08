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

Search by album or artist, filter by genre, and sort by shelf order, artist or year. **Edit shelf** restores the unfiltered shelf order. Drag within each shelf, or focus a CD and use Space, arrow keys and Space again to reorder. Track lists are informational; playback is intentionally absent.

Multi-disc albums use thicker spines and cases. Open one and select **Disc 1**, **Disc 2**, etc. to see its individual disc and track list. The mock collection includes two-disc and three-disc sets.

**Add recording** creates an album with a title, artist, year, genre, 1–6 discs and an uploaded cover. Open an existing album and choose **Edit recording** to update these details or its images. Cover and optional spine artwork accept JPG, PNG and WebP up to 5 MB each. Uploaded side artwork appears on both the shelf and case; without it the text spine is generated. Adding discs preserves existing tracks; reducing the count merges removed discs' tracks into the last remaining disc.

Albums, artwork and shelf order are saved in IndexedDB in the current browser and survive refresh. Artwork is stored separately so reordering only writes album metadata, not all uploaded image data. Clearing site data or switching browsers removes or separates this local collection. Storage failures are shown with a retry action. There is no cloud upload or synchronization.

## Structure

- `src/components/Shelf`: cabinet and accessible sortable spines
- `src/components/CDCase`: reusable CSS 3D jewel case
- `src/components/ActiveCD`: fixed viewing layer, focus and dismissal
- `src/hooks/useAlbumAnimation.ts`: measured origin and reversible GSAP timeline
- `src/components/AlbumDetails`: album metadata and tracks
- `src/components/AlbumEditor`: album creation, editing and artwork previews
- `src/lib/album.ts`: disc model and case thickness
- `src/lib/readArtwork.ts`: image format, size and decoding validation
- `src/lib/collectionStorage.ts`: browser-local IndexedDB reads and writes
- `src/store/collectionStore.ts`: collection business state and ordering
- `src/data/albums.ts`, `src/types/album.ts`: mock collection and model
- `public/assets/albums`: self-contained vector artwork
- `src/styles/global.css`: responsive cabinet, case and reduced motion styles

Fonts and artwork are bundled locally. Font licenses are included in `public/assets/fonts`. The application makes no external requests.
