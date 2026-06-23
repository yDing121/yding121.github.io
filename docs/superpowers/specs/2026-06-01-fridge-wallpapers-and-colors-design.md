# Fridge wallpapers + expanded sticky color palette

Date: 2026-06-01
Status: design approved, pending spec review

## Summary

Add two enhancements to the fridge page:

1. **Wallpapers** — render a photo as the fridge-board background. Photos are user-uploaded to Firebase Storage, catalogued in a new `wallpapers` Firestore collection with orientation metadata, and one is auto-selected per day per device per viewport orientation. Users get a shuffle button and a manage modal (view / upload / delete / pick).
2. **Expanded sticky colors** — grow the random color pool from 4 to 10 soft pastels. No DB schema change.

Both features live entirely inside the existing fridge auth gate.

## Non-goals

- No wallpaper on `/fridge/archive/` (only the main board).
- No per-user wallpaper preferences (daily pick is per device, not per user).
- No server-side or client-side image transforms (no resize on upload, no smart-crop, no thumbnail generation). Rendering uses CSS `background-size: cover` which crops at the browser; the original file is preserved.
- No global daily sync — each device picks independently.
- No user-driven color choice for sticky notes; colors remain random across the expanded pool.

## Data model

### Firebase Storage

New path: `fridge-wallpapers/{uid}/{timestamp}-{filename}`. Mirrors the existing `blob-images/` path.

Storage rules (`storage.rules`):

```
match /fridge-wallpapers/{userId}/{file=**} {
  allow read: if isAllowed();
  allow write: if isAllowed()
    && request.auth.uid == userId
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
  allow delete: if isAllowed();   // any allowed user can delete any wallpaper
}
```

Note the deviation from `blob-images` (which has `allow delete: if false`): wallpapers are user-managed and need deletion.

### Firestore

New collection: `wallpapers`. Document shape:

```js
{
  uploaderUid: string,
  url: string,           // Storage download URL
  path: string,          // Storage object path, needed for deletion
  width: number,         // natural width in px
  height: number,        // natural height in px
  orientation: "landscape" | "portrait",  // derived at upload from width >= height
  createdAt: serverTimestamp,
}
```

Firestore rules (`firestore.rules`):

```
match /wallpapers/{wallpaperId} {
  allow read: if isAllowed();
  allow create: if isAllowed()
    && request.resource.data.uploaderUid == request.auth.uid;
  allow update: if false;          // wallpapers are immutable
  allow delete: if isAllowed();    // any allowed user can delete
}
```

Storing orientation at upload (rather than measuring on each page load) means catalog reads are free of per-image work.

### localStorage

Two keys (one per orientation) so that rotating a phone doesn't keep rerolling:

- `fridge.wallpaper.daily.landscape` → `{ date: "YYYY-MM-DD", wallpaperId, url }`
- `fridge.wallpaper.daily.portrait` → `{ date: "YYYY-MM-DD", wallpaperId, url }`

`url` is cached so the background can paint instantly on next load, before Firestore returns.

## Behavior

### Wallpaper selection (page load)

1. Determine current orientation: `window.innerWidth >= window.innerHeight ? "landscape" : "portrait"`.
2. Read localStorage key for that orientation.
3. If cached entry exists _and_ `date` matches today (local date, `YYYY-MM-DD`): paint background from cached `url` immediately.
4. Either way, fetch the wallpapers catalog from Firestore in the background.
5. If cache was stale or empty: filter catalog to current orientation, pick a random doc, write to localStorage, paint.
6. If catalog is empty for this orientation: fall back to the current corkboard look (no background image, no error).

### Orientation change

Listen for `resize` and `orientationchange`. When orientation flips, re-run the selection logic for the new orientation (uses that orientation's cached entry if today, else picks a new one).

### Shuffle button

Toolbar gets a `↻` icon button. On click: pick a different random wallpaper of the current orientation (one not equal to the current one if possible), write to localStorage, repaint. No confirm dialog.

### Manage modal

Toolbar gets a `wallpapers` link/button that opens a modal:

- Header: `wallpapers`
- `+ upload` button → opens native file picker (`<input type="file" accept="image/*">`). On selection:
  - Construct an `Image()` to read `naturalWidth/Height`.
  - Compute orientation.
  - Upload bytes to `fridge-wallpapers/{uid}/{ts}-{name}`.
  - Get download URL.
  - Write Firestore doc.
  - Append to grid in-place. Show a spinner during upload.
- Thumbnail grid: 3 columns desktop, 2 columns mobile. Each tile:
  - Image (loaded directly from the full URL — no separate thumbnail file).
  - Small `L` / `P` orientation badge in a corner.
  - Click tile → set as today's wallpaper for its orientation (writes localStorage, repaints, closes modal).
  - Small `×` delete button in another corner → `confirm("delete this wallpaper?")` → delete Firestore doc + Storage object. If deleted wallpaper was today's choice, clear that localStorage entry and re-pick.

### Rendering

`.fridge-board` background:

```css
.fridge-board {
  background-color: #f3efe7; /* fallback while wallpaper loads */
  background-size: cover;
  background-position: center;
  /* background-image is set inline via JS when a wallpaper is chosen */
}
```

The existing radial-gradient warmth is removed when a wallpaper is applied (gradient layered over a photo looks muddy). When the board falls back to no-wallpaper, the radial gradients return — easiest to achieve by adding a `.has-wallpaper` class on the board that overrides the gradient declaration.

The toolbar already has `background: rgba(255,255,255,0.7)` + `backdrop-filter: blur(6px)`, which reads fine over photos.

No darkening overlay added by default. If darker wallpapers prove to bury stickies in practice, add a faint `rgba(255,255,255,0.08)` scrim in a follow-up — flagged but not pre-emptive.

### Expanded color palette

`assets/js/fridge/data.js`:

```js
const COLORS = ["yellow", "pink", "blue", "green", "peach", "lavender", "mint", "lemon", "sky", "coral"];
```

`assets/css/fridge.css` adds six classes (`.sticky.peach`, `.sticky.lavender`, `.sticky.mint`, `.sticky.lemon`, `.sticky.sky`, `.sticky.coral`) in the same soft-pastel range as the existing four. Existing blobs in Firestore keep their stored color string and render unchanged.

Suggested hex values (final tuning at implementation):

| name     | hex     |
| -------- | ------- |
| peach    | #ffd6b0 |
| lavender | #e0c8ff |
| mint     | #c8f0e0 |
| lemon    | #fff3b0 |
| sky      | #c8e8f8 |
| coral    | #ffb8b0 |

## Files touched

- **New:** `assets/js/fridge/wallpaper.js` — daily-pick + paint + shuffle + orientation listener.
- **New:** `assets/js/fridge/wallpapers-modal.js` — manage modal markup + handlers.
- **Modified:** `assets/js/fridge/data.js` — add `listWallpapers`, `uploadWallpaper`, `deleteWallpaper`; expand `COLORS`.
- **Modified:** `assets/js/fridge/main.js` — wire shuffle + manage buttons, kick off wallpaper paint on load.
- **Modified:** `_pages/fridge.md` — add `↻` and `wallpapers` toolbar buttons.
- **Modified:** `assets/css/fridge.css` — six new sticky color classes, wallpaper background rules, manage-modal grid styles.
- **Modified:** `storage.rules` — add `fridge-wallpapers/*` rules.
- **Modified:** `firestore.rules` — add `wallpapers` collection rules.

## Risks / open questions

- **Storage cost** — wallpapers can be large (multi-MB). The 5 MB per-file cap matches `blob-images`. No total-storage cap; the manage modal makes pruning easy.
- **Catalog scale** — if the collection grows past ~100 wallpapers, loading every doc on each page load is wasteful. Acceptable for foreseeable use; revisit with pagination if it becomes a problem.
- **Race on delete** — if user A deletes the wallpaper that user B has cached as today's pick on another device, B will see a broken image until the next page load (when the catalog refetch will re-pick). Acceptable; no real-time invalidation.
- **iOS background-attachment** — `background-attachment: fixed` has well-known iOS Safari bugs. The board doesn't scroll meaningfully, so this is moot — we use the default (`scroll`).

## Out of scope (deferred)

- Thumbnail generation for the manage modal grid (add only if grid feels sluggish).
- White scrim overlay for low-contrast wallpapers (add only if readability suffers).
- Wallpaper on the archive page.
- Per-user wallpaper preferences or global daily sync.
- User-driven sticky color picking.
