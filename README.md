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

Packaging has separate images for the **booklet front and back**, **left and right spines**, and **outside and inside of the back insert**. The booklet front is visible through the closed lid; its back is visible on the left when opened. The inside back insert sits beneath the disc tray. **Case artwork** opens a reader for inspecting both sides of the back insert, both spines and the OBI without the plastic or discs covering them. Each disc has its own image upload and can independently return to its generated label.

**Booklet pages** accepts multiple image files and editable text or lyrics pages. Pages can combine an image and text, be reordered or deleted; image batches are added only when every file is valid. **Read booklet** shows the front cover, ordered inner pages and back cover, with buttons or Left/Right keys to turn pages. Long text scrolls within its page and images fit without cropping. Escape closes the reader and returns focus to its opening button. All images use the same JPG, PNG or WebP limit of 64 MB each; booklet contents and per-disc artwork persist after reload. Image upload errors open a warning dialog immediately; OK or Escape dismisses it and returns focus to the upload control.

**Import entire booklet**, next to the cover images, accepts scans in reading order. The first image becomes the front cover, the last the back cover, and all images between become inner pages. All crops must be confirmed before replacing the current booklet; cancelling or invalid files preserves its images and text. Add or reorder individual pages as needed, then use the reader's page selector to jump to any page.

Every image upload opens a crop preview before replacing artwork. Drag or use arrow keys to position the image, zoom, or reset the crop. Ratios stay fixed: booklet covers/pages are square; both sides of the back insert use the 138 × 118 mm center panel (69:59), excluding the separately uploaded spines; spines use the inner paper width and unfolded OBI uses the fixed 10.4 mm case thickness. Disc uploads use a circular guide with the center hub marked. Booklet image batches are cropped one at a time and added together after the last confirmation; cancelling keeps the existing pages. Cropped images are saved locally as PNGs with a maximum edge of 2048 pixels.

Spine crops have a width slider below the image, ranging from 2 to 40 mm in 0.1 mm steps, using a 118 mm panel height. It starts at the current inner paper width; Reset restores that starting width. Confirming a crop updates the spine previews and generated spine artwork. Both spines share the thinner of their selected widths: uploading a thinner second image crops the first equally from both edges, while a wider second image is cropped to match the first. The images and shared paper width update together and persist after reload; cancelling leaves both unchanged. Resetting both sides to generated artwork restores the default paper width. Case thickness, shelf width and OBI side thickness stay fixed. Other artwork keeps its fixed ratio.

The independent **OBI paper strip** has front, spine and back folds. **Attached** wraps it around the closed case, **Hidden** slides it away, and **Lay flat** lifts it off and unfolds it for inspection. The strip automatically hides before the lid opens, including the initial opening; attachment is disabled while the case is open, but flat inspection remains available. Attach or hide the strip to resume case/disc controls. Closing folds the strip before returning the case; reduced motion changes states immediately. The editor accepts an optional scan of the entire unfolded OBI (back flap, spine, front flap from left to right), stored separately from the case's spine artwork. Without a scan, a full unfolded image is generated from the album details and cover colors, previewed in the editor and used for all three folds. It updates with album details and disc count, while the side remains fixed at 10.4 mm. Uploaded OBI images are preserved when changing the cover design; **Use generated OBI** restores the automatic design. Viewing states last until the viewer closes; uploaded artwork persists after reload.

Search by album or artist, filter by genre, and sort by shelf order, artist or year. **Edit shelf** restores the unfiltered shelf order. Drag within each shelf, or focus a CD and use Space, arrow keys and Space again to reorder.

OBI is optional. New recordings start without one; enable **Include OBI** to generate or upload a strip. Without OBI, the viewer omits the strip, its controls and its case-artwork page. Removing OBI and saving also deletes its uploaded image. The fictional demo recordings explicitly include OBI.

Uploaded OBI artwork is rendered as a loaded image on each folded surface, with matching offsets for the back flap, spine and front flap, throughout attached and flat animations.

**OBI dimensions** independently adjusts the front and back flaps from 5–60 mm and the paper height from 40–130 mm, in 0.1 mm steps. The spine follows the case thickness. Generation, crop proportions, fold guides and 3D animation use the same dimensions. Set these before uploading, or choose **Recrop OBI image** to fit an existing image to a new size. Uploaded images retain their proportions when dimensions change. **Reset OBI size** restores the standard layout; dimensions persist with the recording.

Click a disc to lift it from the case and load the retro **CDP–01** player from the first track, or click a song title to start that track. Music starts after the disc transfer completes and the disc begins rotating. The transparent top shows the spinning CD while audio plays; pause and stop halt the rotation. Physical-style controls provide play/pause, stop, previous/next track and return to case. The amber seven-segment display shows elapsed time and remaining time; drag the timeline to seek and adjust the volume slider. Playback advances through the current disc and stops after the last track. Put away the viewer to keep listening through the compact player while browsing other albums; reopening the loaded album restores its player. Playing another disc ejects the old disc before inserting and starting the new one. Return to case stops playback, and closing during insertion cancels it. Reduced motion skips the disc transfer and rotation.

Multi-disc albums use hinged, double-sided trays, with each disc fixed to its own face. Four- and five-disc sets have two trays; six-disc sets have three. Three- and five-disc sets reveal the final disc in the base underneath. Page jumps turn each intervening tray in order, and returning or closing folds them in reverse order. Switching between two discs already visible on the same spread updates the selection and tracks immediately without moving the trays. Other track details update after the turn; reduced motion switches immediately. Front, Inside and Back preserve the selected spread when reopening. All disc counts use the standard CD case thickness of 10.4 mm. The editor and OBI crop controls cannot change it, and saved custom thickness values are ignored. The mock collection includes two-disc and three-disc sets.

**Add recording** creates an album with a title, one or more artists, year, genre and 1–6 discs. **Add artist** adds a separate name; artists can be removed individually, and search matches any artist. Genre selection includes 25 defaults covering common styles. **Add custom genre** accepts another genre name; saving the recording makes it available for other recordings and shelf filtering after reload. A cover is generated automatically from five preset designs, with matching colors for the generated disc labels, back cover, spine and OBI. The editor previews the back cover with its track list and each disc's independent circular artwork; disc text avoids the outer edge and center hole. The case, player and disc transfer animations use the same disc label. **Try another cover** picks a different design; uploaded cover, back cover, spine and OBI images can still be used independently. Generated artwork updates with the album details and retains its design after saving and reloading. Open an existing album and choose **Edit recording** to update these details or its images. Cover, optional back cover and spine artwork accept JPG, PNG and WebP up to 64 MB each. Uploaded side artwork appears on both the shelf and case; without it the text spine is generated. Adding discs preserves existing tracks; reducing the count merges removed discs' tracks into the last remaining disc.

In **Music & tracks**, choose a disc and add one audio file per song, individually or in a batch. Files become tracks in selection order, with editable titles taken from filenames and automatically read durations. Existing tracks can have their audio attached, replaced or removed independently; tracks can also be removed. MP3, M4A, WAV, OGG, FLAC, AAC and WebM are accepted up to 100 MB per file when the browser can decode them. M4A files can contain AAC or Apple Lossless (ALAC); if your browser cannot decode ALAC, convert the file to FLAC to preserve audio quality, or MP3 for broad compatibility, then import it again. Batch validation is sequential and updates the draft only when every file is valid. Cancelling discards the draft. The fictional demo albums include track names but no audio; attach files in the editor to listen.

Albums, artwork, booklet pages, audio and shelf order are saved in IndexedDB in the current browser and survive refresh. Images and audio Blobs are stored separately so reordering and text edits only write album metadata, not all uploaded files. Saving writes metadata and files in one transaction; removed artwork and audio are deleted and failed saves roll back together. Clearing site data or switching browsers removes or separates this local collection. Storage failures are shown with a retry action. There is no cloud upload or synchronization.

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
