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

Choose **Front**, **Inside** or **Back** to inspect the case. Back flips the entire case while preserving the current lid and tray angles: an open case stays open, and a closed case stays closed. Back covers can be uploaded independently and persist after reload; without an upload, the case generates a back cover from the album details and tracks.

The independent **OBI paper strip** has front, spine and back folds. **Attached** wraps it around the closed case, **Hidden** slides it away, and **Lay flat** lifts it off and unfolds it for inspection. The strip automatically hides before the lid opens, including the initial opening; attachment is disabled while the case is open, but flat inspection remains available. Attach or hide the strip to resume case/disc controls. Closing folds the strip before returning the case; reduced motion changes states immediately. The editor accepts an optional scan of the entire unfolded OBI (back flap, spine, front flap from left to right), stored separately from the case's spine artwork. Without a scan, a paper strip is generated from the album details. Viewing states last until the viewer closes; uploaded artwork persists after reload.

Search by album or artist, filter by genre, and sort by shelf order, artist or year. **Edit shelf** restores the unfiltered shelf order. Drag within each shelf, or focus a CD and use Space, arrow keys and Space again to reorder.

Click a disc to lift it from the case and load the retro **CDP–01** player from the first track, or click a song title to start that track. Music starts after the disc transfer completes and the disc begins rotating. The transparent top shows the spinning CD while audio plays; pause and stop halt the rotation. Physical-style controls provide play/pause, stop, previous/next track and return to case. The amber seven-segment display shows elapsed time and remaining time; drag the timeline to seek and adjust the volume slider. Playback advances through the current disc and stops after the last track. Put away the viewer to keep listening through the compact player while browsing other albums; reopening the loaded album restores its player. Playing another disc ejects the old disc before inserting and starting the new one. Return to case stops playback, and closing during insertion cancels it. Reduced motion skips the disc transfer and rotation.

Multi-disc albums use hinged, double-sided trays: **Disc 1** / **Disc 2** flips the tray around its spine, and three-disc sets reveal a third disc underneath. Switching between the already visible **Disc 2** and **Disc 3** updates the selection and tracks immediately without moving the tray. Other track details update after the turn; reduced motion switches immediately. One to three discs default to standard-width jewel cases, while four to six use a thicker multi-disc case. These are representative packaging defaults; actual editions also use digipaks and box sets. The mock collection includes two-disc and three-disc sets.

**Add recording** creates an album with a title, artist, year, genre and 1–6 discs. A cover is generated automatically from five preset designs, with matching colors for the generated back cover, spine and OBI. **Try another cover** picks a different design; each artwork can still be uploaded independently. Generated covers update with the album details and retain their design after saving and reloading. Open an existing album and choose **Edit recording** to update these details or its images. Cover, optional back cover and spine artwork accept JPG, PNG and WebP up to 5 MB each. Uploaded side artwork appears on both the shelf and case; without it the text spine is generated. Adding discs preserves existing tracks; reducing the count merges removed discs' tracks into the last remaining disc.

In **Music & tracks**, choose a disc and add one audio file per song, individually or in a batch. Files become tracks in selection order, with editable titles taken from filenames and automatically read durations. Existing tracks can have their audio attached, replaced or removed independently; tracks can also be removed. MP3, M4A, WAV, OGG, FLAC, AAC and WebM are accepted up to 100 MB per file when the browser can decode them. M4A files can contain AAC or Apple Lossless (ALAC); if your browser cannot decode ALAC, convert the file to FLAC to preserve audio quality, or MP3 for broad compatibility, then import it again. Batch validation is sequential and updates the draft only when every file is valid. Cancelling discards the draft. The fictional demo albums include track names but no audio; attach files in the editor to listen.

Albums, artwork, audio and shelf order are saved in IndexedDB in the current browser and survive refresh. Images and audio Blobs are stored separately so reordering and text edits only write album metadata, not all uploaded files. Saving writes metadata and files in one transaction; removed audio is deleted and failed saves roll back together. Clearing site data or switching browsers removes or separates this local collection. Storage failures are shown with a retry action. There is no cloud upload or synchronization.

## Structure

- `src/components/Shelf`: cabinet and accessible sortable spines
- `src/components/CDCase`: reusable CSS 3D jewel case
- `src/components/ActiveCD`: fixed viewing layer, focus and dismissal
- `src/components/CDPlayer`: retro player, transport controls and seven-segment display
- `src/hooks/useAlbumAnimation.ts`: measured origin and reversible GSAP timeline
- `src/hooks/useAudioPlayback.ts`: audio playback, track changes and media resource cleanup
- `src/components/AlbumDetails`: album metadata and tracks
- `src/components/AlbumEditor`: album creation, artwork previews and per-disc audio/track editing
- `src/lib/album.ts`: disc model and case thickness
- `src/lib/readArtwork.ts`: image format, size and decoding validation
- `src/lib/audio.ts`: audio format, size and browser decoding validation, time formatting
- `src/lib/collectionStorage.ts`: browser-local IndexedDB reads and writes
- `src/store/collectionStore.ts`: collection business state and ordering
- `src/data/albums.ts`, `src/types/album.ts`: mock collection and model
- `public/assets/albums`: self-contained vector artwork
- `src/styles/global.css`: responsive cabinet, case and reduced motion styles

Fonts and artwork are bundled locally. Font licenses are included in `public/assets/fonts`. The application makes no external requests.
