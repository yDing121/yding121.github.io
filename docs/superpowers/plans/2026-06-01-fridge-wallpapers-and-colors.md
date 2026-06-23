# Fridge Wallpapers + Expanded Color Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add (1) user-uploaded photo wallpapers to the fridge board with per-device daily auto-selection by viewport orientation, and (2) expand the sticky note color pool from 4 to 10 soft pastels.

**Architecture:** Pure client-side, same patterns as the existing fridge. Wallpaper files live in Firebase Storage under `fridge-wallpapers/{uid}/{ts}-{name}`; metadata (incl. orientation computed at upload) lives in a new Firestore `wallpapers` collection. Selection caches per-orientation in localStorage. A new `wallpaper.js` module handles paint/daily-pick/shuffle; a new `wallpapers-modal.js` handles upload/manage UI. Colors are expanded purely in `data.js` (random pool) and `fridge.css` (new classes).

**Tech Stack:**

- Firebase v10 modular SDK (Firestore + Storage) — already loaded from gstatic CDN
- Vanilla ES modules — no build tooling
- Jekyll (al-folio) static site
- Firebase CLI for rules deploy

**Spec:** [docs/superpowers/specs/2026-06-01-fridge-wallpapers-and-colors-design.md](../specs/2026-06-01-fridge-wallpapers-and-colors-design.md)

**Testing approach:** This repo has no JS test framework — verification is manual via `bundle exec jekyll serve --livereload` and the live Firebase backend. Each task ends with an explicit "do X, expect Y" step. Do not fake automated tests.

**Prerequisites:**

- Firebase CLI installed and authenticated (`firebase login`). Used only to deploy rules.
- The dev account in `firebase-config.js` is already in the allowed-UIDs list.
- An existing logged-in fridge session works (i.e., the fridge feature from `2026-05-27-fridge.md` is deployed and functional).

---

## File Structure

**New files:**

| Path                                   | Responsibility                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `assets/js/fridge/wallpaper.js`        | Daily-pick logic, paint, shuffle, orientation listener; exports public helpers |
| `assets/js/fridge/wallpapers-modal.js` | Manage Wallpapers modal: upload, thumbnail grid, click-to-set, delete          |

**Modified files:**

| Path                       | Change                                                                            |
| -------------------------- | --------------------------------------------------------------------------------- |
| `assets/js/fridge/data.js` | Expand `COLORS` array; add `listWallpapers`, `uploadWallpaper`, `deleteWallpaper` |
| `assets/js/fridge/main.js` | Wire shuffle + manage-wallpapers buttons; call wallpaper init on auth ready       |
| `_pages/fridge.md`         | Add `↻` shuffle button and `wallpapers` button to toolbar                         |
| `assets/css/fridge.css`    | Six new sticky color classes; wallpaper background rules; modal grid styles       |
| `firestore.rules`          | Add `wallpapers` collection rules                                                 |
| `storage.rules`            | Add `fridge-wallpapers/*` rules                                                   |

---

## Task 1: Expand the sticky color palette

**Files:**

- Modify: `assets/js/fridge/data.js:16`
- Modify: `assets/css/fridge.css:159-170` (after the existing color classes)

- [ ] **Step 1: Expand the COLORS array**

In `assets/js/fridge/data.js`, replace line 16:

```js
const COLORS = ["yellow", "pink", "blue", "green"];
```

with:

```js
const COLORS = ["yellow", "pink", "blue", "green", "peach", "lavender", "mint", "lemon", "sky", "coral"];
```

- [ ] **Step 2: Add the six new CSS color classes**

In `assets/css/fridge.css`, immediately after the existing `.sticky.green { ... }` block (around line 170), append:

```css
.sticky.peach {
  background: #ffd6b0;
}
.sticky.lavender {
  background: #e0c8ff;
}
.sticky.mint {
  background: #c8f0e0;
}
.sticky.lemon {
  background: #fff3b0;
}
.sticky.sky {
  background: #c8e8f8;
}
.sticky.coral {
  background: #ffb8b0;
}
```

- [ ] **Step 3: Verify locally**

Run: `bundle exec jekyll serve --livereload`

Navigate to `/fridge/`, sign in, click `+ new note`, post 6+ new notes (text-only is fine, e.g. "test 1", "test 2", …). Expected: across the new notes you see colors beyond the original yellow/pink/blue/green — peach, lavender, mint, lemon, sky, or coral should appear. (Probability that all 6 random picks land in the original 4 is ~5%; if all 6 are old colors, post a few more.)

Existing notes (from before this change) should still render in their stored color, unchanged.

- [ ] **Step 4: Commit**

```bash
git add assets/js/fridge/data.js assets/css/fridge.css
git commit -m "feat(fridge): expand sticky color palette to 10 pastels"
```

---

## Task 2: Update Firestore and Storage rules

**Files:**

- Modify: `firestore.rules`
- Modify: `storage.rules`

- [ ] **Step 1: Add `wallpapers` collection rules to firestore.rules**

In `firestore.rules`, immediately before the closing `}` of the `match /databases/{database}/documents { ... }` block (i.e., after the existing `match /blobs/{blobId}` block), add:

```
match /wallpapers/{wallpaperId} {
  allow read: if isAllowed();
  allow create: if isAllowed()
    && request.resource.data.uploaderUid == request.auth.uid;
  allow update: if false;
  allow delete: if isAllowed();
}
```

The full file should look like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAllowed() {
      return request.auth != null
        && request.auth.uid in ['RugOVEKFNMWscEAF3SJ1xONUFYf1', '1qdT6tgDJwR9HFrYxfiwObeS9ug2'];
    }
    match /blobs/{blobId} {
      allow read: if isAllowed();
      allow create: if isAllowed()
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.archived == false;
      allow update: if isAllowed()
        && resource.data.authorUid == request.auth.uid
        && request.resource.data.authorUid == resource.data.authorUid;
      allow delete: if false;
    }
    match /wallpapers/{wallpaperId} {
      allow read: if isAllowed();
      allow create: if isAllowed()
        && request.resource.data.uploaderUid == request.auth.uid;
      allow update: if false;
      allow delete: if isAllowed();
    }
  }
}
```

- [ ] **Step 2: Add `fridge-wallpapers/*` rules to storage.rules**

In `storage.rules`, immediately before the closing `}` of the `match /b/{bucket}/o { ... }` block (after the existing `match /blob-images/...` block), add:

```
match /fridge-wallpapers/{userId}/{file=**} {
  allow read: if isAllowed();
  allow write: if isAllowed()
    && request.auth.uid == userId
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
  allow delete: if isAllowed();
}
```

Full file should look like:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAllowed() {
      return request.auth != null
        && request.auth.uid in ['RugOVEKFNMWscEAF3SJ1xONUFYf1', '1qdT6tgDJwR9HFrYxfiwObeS9ug2'];
    }
    match /blob-images/{userId}/{file=**} {
      allow read: if isAllowed();
      allow write: if isAllowed()
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if false;
    }
    match /fridge-wallpapers/{userId}/{file=**} {
      allow read: if isAllowed();
      allow write: if isAllowed()
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if isAllowed();
    }
  }
}
```

- [ ] **Step 3: Deploy both rule files**

Run from repo root:

```bash
firebase deploy --only firestore:rules,storage
```

Expected: output ends with `✔  Deploy complete!` and no errors. If `firebase` errors about a missing project, run `firebase use <project-id>` (the project id is in `assets/js/fridge/firebase-config.js` as `projectId`).

- [ ] **Step 4: Smoke-test rules via Firebase Console**

Open Firebase Console → Firestore → Rules Playground. Simulate:

- `get /wallpapers/abc` as authenticated user with one of the two allowed UIDs → Expected: allowed.
- `get /wallpapers/abc` as authenticated user with a random UID → Expected: denied.
- `create /wallpapers/abc` with `uploaderUid` matching authed UID, allowed UID → Expected: allowed.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules storage.rules
git commit -m "feat(fridge): rules for wallpapers collection and storage path"
```

---

## Task 3: Add wallpaper data-layer functions

**Files:**

- Modify: `assets/js/fridge/data.js`

- [ ] **Step 1: Add the wallpaper functions to data.js**

At the bottom of `assets/js/fridge/data.js`, append:

```js
// ── Wallpapers ──────────────────────────────────────────────────────────────

import { deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

export async function listWallpapers() {
  const snap = await getDocs(query(collection(db, "wallpapers"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Upload a wallpaper image to Storage and create its Firestore metadata doc.
 * Reads natural dimensions client-side via an <img> element to compute orientation.
 * Returns the created wallpaper { id, url, path, width, height, orientation }.
 */
export async function uploadWallpaper(file) {
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  if (!file) throw new Error("no file");
  if (file.size > 5 * 1024 * 1024) throw new Error("image must be under 5MB");

  // Measure natural dimensions before uploading.
  const { width, height } = await new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read image dimensions"));
    };
    img.src = url;
  });
  const orientation = width >= height ? "landscape" : "portrait";

  const path = `fridge-wallpapers/${user.uid}/${Date.now()}-${file.name}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);

  const docRef = await addDoc(collection(db, "wallpapers"), {
    uploaderUid: user.uid,
    url,
    path,
    width,
    height,
    orientation,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, uploaderUid: user.uid, url, path, width, height, orientation };
}

/**
 * Delete a wallpaper: removes the Storage object then the Firestore doc.
 * Storage delete failure is non-fatal (object may already be gone).
 */
export async function deleteWallpaper(wallpaper) {
  if (!wallpaper || !wallpaper.id) throw new Error("no wallpaper");
  try {
    await deleteObject(storageRef(storage, wallpaper.path));
  } catch (err) {
    console.warn("wallpaper: storage delete failed (continuing)", err);
  }
  await deleteDoc(doc(db, "wallpapers", wallpaper.id));
}
```

Note: the additional imports go inline at the bottom of the file (rather than refactoring the existing top-of-file import) to keep this task's diff minimal and to keep each wallpaper-related concern visually grouped.

- [ ] **Step 2: Smoke-test the data layer from the browser console**

Run: `bundle exec jekyll serve --livereload`. Navigate to `/fridge/`, sign in.

Open the browser DevTools console. Paste:

```js
const data = await import("/assets/js/fridge/data.js");
console.log(await data.listWallpapers());
```

Expected: `[]` (empty array, no errors). If you see a permission-denied error, confirm Task 2's rules deployed.

To smoke-test upload, in the console paste (this assumes you have a JPG handy; replace the URL with an actual reachable image):

```js
const resp = await fetch("https://placehold.co/800x600/png");
const blob = await resp.blob();
const file = new File([blob], "test.png", { type: "image/png" });
const created = await data.uploadWallpaper(file);
console.log("created:", created);
console.log("list now:", await data.listWallpapers());
```

Expected: `created` logs an object with `id`, `url`, `width: 800`, `height: 600`, `orientation: "landscape"`. The list call returns one item. The Firebase Console → Storage should show the file under `fridge-wallpapers/<uid>/`.

Then test delete:

```js
const list = await data.listWallpapers();
await data.deleteWallpaper(list[0]);
console.log("list after delete:", await data.listWallpapers());
```

Expected: `[]`. Verify in Firebase Console that both the Storage object and the Firestore doc are gone.

- [ ] **Step 3: Commit**

```bash
git add assets/js/fridge/data.js
git commit -m "feat(fridge): data-layer functions for wallpaper CRUD"
```

---

## Task 4: Wallpaper rendering module + CSS

**Files:**

- Create: `assets/js/fridge/wallpaper.js`
- Modify: `assets/css/fridge.css`

- [ ] **Step 1: Create wallpaper.js**

Create `assets/js/fridge/wallpaper.js` with:

```js
// assets/js/fridge/wallpaper.js
// Daily wallpaper selection + paint for the fridge board.
//
// Selection is per-device, per viewport orientation, per local date.
// Cache key: `fridge.wallpaper.daily.${orientation}` →
//   { date: "YYYY-MM-DD", wallpaperId, url }
//
// Public API:
//   initWallpaper(boardEl)  — call once after auth-ready; paints + wires resize listener
//   shuffleWallpaper()      — picks a different random wallpaper of current orientation
//   setTodaysWallpaper(w)   — explicitly set a chosen wallpaper as today's, paints
//   refreshWallpaper()      — re-runs the daily-pick logic (use after delete invalidates cache)

import { listWallpapers } from "./data.js";

const KEY_PREFIX = "fridge.wallpaper.daily.";

let boardElRef = null;
let catalogCache = null; // { fetchedAt: number, items: Wallpaper[] }
const CATALOG_TTL_MS = 60 * 1000; // 1 minute — keeps shuffle from refetching constantly

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function currentOrientation() {
  return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
}

function cacheKey(orientation) {
  return KEY_PREFIX + orientation;
}

function readCache(orientation) {
  try {
    const raw = localStorage.getItem(cacheKey(orientation));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(orientation, entry) {
  try {
    localStorage.setItem(cacheKey(orientation), JSON.stringify(entry));
  } catch (err) {
    console.warn("wallpaper: localStorage write failed", err);
  }
}

function clearCache(orientation) {
  try {
    localStorage.removeItem(cacheKey(orientation));
  } catch {
    /* ignore */
  }
}

function paint(url) {
  if (!boardElRef) return;
  if (url) {
    boardElRef.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
    boardElRef.classList.add("has-wallpaper");
  } else {
    boardElRef.style.backgroundImage = "";
    boardElRef.classList.remove("has-wallpaper");
  }
}

async function getCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.items;
  }
  const items = await listWallpapers();
  catalogCache = { fetchedAt: now, items };
  return items;
}

function invalidateCatalog() {
  catalogCache = null;
}

function pickRandomExcept(items, excludeId) {
  if (items.length === 0) return null;
  if (items.length === 1 || !excludeId) return items[Math.floor(Math.random() * items.length)];
  const filtered = items.filter((w) => w.id !== excludeId);
  if (filtered.length === 0) return items[0];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Ensure today's wallpaper for the current orientation is painted.
 * Uses cache if it matches today's date AND the wallpaper still exists in catalog.
 * If catalog has no wallpapers for this orientation, paints nothing (fallback look).
 */
async function ensureTodaysWallpaper({ forceRepick = false } = {}) {
  const orientation = currentOrientation();
  const today = todayStr();
  const cached = readCache(orientation);

  // Fast path: paint immediately from cache if date matches.
  if (!forceRepick && cached && cached.date === today && cached.url) {
    paint(cached.url);
  }

  // Always refresh catalog in the background to detect deletions / new uploads.
  let catalog;
  try {
    catalog = await getCatalog();
  } catch (err) {
    console.warn("wallpaper: catalog fetch failed", err);
    return;
  }
  const pool = catalog.filter((w) => w.orientation === orientation);

  // If the cached wallpaper still exists in the pool and we're not forcing, we're done.
  if (!forceRepick && cached && cached.date === today && pool.some((w) => w.id === cached.wallpaperId)) {
    return;
  }

  // Pick fresh (excluding current if forcing a reshuffle so we don't pick the same one).
  const excludeId = forceRepick && cached ? cached.wallpaperId : null;
  const picked = pickRandomExcept(pool, excludeId);
  if (!picked) {
    clearCache(orientation);
    paint(null);
    return;
  }
  const entry = { date: today, wallpaperId: picked.id, url: picked.url };
  writeCache(orientation, entry);
  paint(picked.url);
}

let resizeTimer = null;
let lastOrientation = null;
function onResize() {
  // Debounce; only react when orientation actually flips.
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const o = currentOrientation();
    if (o !== lastOrientation) {
      lastOrientation = o;
      ensureTodaysWallpaper();
    }
  }, 200);
}

export function initWallpaper(boardEl) {
  boardElRef = boardEl;
  lastOrientation = currentOrientation();
  ensureTodaysWallpaper();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
}

export async function shuffleWallpaper() {
  invalidateCatalog();
  await ensureTodaysWallpaper({ forceRepick: true });
}

export function setTodaysWallpaper(wallpaper) {
  if (!wallpaper || !wallpaper.id || !wallpaper.url) return;
  const orientation = wallpaper.orientation || currentOrientation();
  writeCache(orientation, { date: todayStr(), wallpaperId: wallpaper.id, url: wallpaper.url });
  // Only repaint if this matches the current viewport orientation.
  if (orientation === currentOrientation()) {
    paint(wallpaper.url);
  }
}

/** Re-run the daily-pick logic. Useful after a delete invalidates the current pick. */
export async function refreshWallpaper() {
  invalidateCatalog();
  // Check whether the currently-cached wallpaper still exists; if not, repick.
  await ensureTodaysWallpaper();
}
```

- [ ] **Step 2: Add wallpaper CSS rules to fridge.css**

In `assets/css/fridge.css`, locate the `.fridge-board { ... }` block (around lines 60-67) and replace it with:

```css
/* Board background — warm corkboard feel (fallback) */
.fridge-board {
  background-color: #f3efe7;
  background-image: radial-gradient(circle at 20% 30%, rgba(180, 140, 80, 0.05) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(
          180,
          140,
          80,
          0.05
        ) 0, transparent 40%);
  background-size: auto;
  background-position: 0 0;
  min-height: calc(100dvh - 60px);
  position: relative;
  overflow: hidden;
}

/* When a wallpaper is applied, swap to cover-fit photo and drop the gradient. */
.fridge-board.has-wallpaper {
  background-image: var(--fridge-wallpaper, none);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

Note: the JS sets `style.backgroundImage` directly (which overrides the `has-wallpaper` class's `background-image: var(...)`). The CSS variable approach in `.has-wallpaper` is a fallback; the inline style wins. The `has-wallpaper` class is what removes the gradient and sets `background-size: cover`.

- [ ] **Step 3: Manually create a wallpaper to test against**

If you deleted the test wallpaper at the end of Task 3, recreate one. Open the live `/fridge/` page, sign in, open DevTools console, paste:

```js
const data = await import("/assets/js/fridge/data.js");
const resp = await fetch("https://placehold.co/1600x900/4a90e2/ffffff.png?text=landscape+test");
const blob = await resp.blob();
const file = new File([blob], "ls-test.png", { type: "image/png" });
await data.uploadWallpaper(file);
```

Expected: no error.

- [ ] **Step 4: Wire wallpaper init into main.js temporarily for verification**

This wiring is the proper Task 6 work — but to verify Task 4 in isolation, paste in DevTools console:

```js
const wp = await import("/assets/js/fridge/wallpaper.js");
wp.initWallpaper(document.getElementById("fridge-board"));
```

Expected: the fridge board background swaps from corkboard color to the uploaded photo (filling the viewport). Reloading the page should NOT paint the wallpaper yet (main.js hasn't been wired) — but if you re-run the console snippet, it should paint instantly from localStorage cache.

Also test shuffle: upload a second wallpaper (re-run Step 3 with a different URL like `https://placehold.co/1600x900/e24a4a/ffffff.png?text=second`), then in console:

```js
await wp.shuffleWallpaper();
```

Expected: background changes to the second image.

Test orientation: resize browser narrower than tall (drag to a phone-ish portrait shape). Expected: background may disappear (no portrait wallpapers exist) — corkboard fallback returns. Upload a portrait test image and re-run:

```js
const resp = await fetch("https://placehold.co/900x1600/4ae290/ffffff.png?text=portrait+test");
const blob = await resp.blob();
const file = new File([blob], "pt-test.png", { type: "image/png" });
await data.uploadWallpaper(file);
await wp.refreshWallpaper();
```

Expected: portrait wallpaper paints.

- [ ] **Step 5: Commit**

```bash
git add assets/js/fridge/wallpaper.js assets/css/fridge.css
git commit -m "feat(fridge): wallpaper render module with daily-pick + shuffle"
```

---

## Task 5: Manage Wallpapers modal

**Files:**

- Create: `assets/js/fridge/wallpapers-modal.js`
- Modify: `assets/css/fridge.css`

- [ ] **Step 1: Create wallpapers-modal.js**

Create `assets/js/fridge/wallpapers-modal.js` with:

```js
// assets/js/fridge/wallpapers-modal.js
import { listWallpapers, uploadWallpaper, deleteWallpaper } from "./data.js";
import { setTodaysWallpaper, refreshWallpaper } from "./wallpaper.js";

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v != null) e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

function renderTile(wallpaper, { onPick, onDelete }) {
  const badge = el("span", { class: "wp-badge" }, wallpaper.orientation === "landscape" ? "L" : "P");
  const del = el(
    "button",
    {
      class: "wp-delete",
      title: "delete",
      onclick: (e) => {
        e.stopPropagation();
        if (confirm("delete this wallpaper?")) onDelete(wallpaper);
      },
    },
    "×"
  );
  return el(
    "div",
    {
      class: "wp-tile",
      onclick: () => onPick(wallpaper),
      title: "set as today's wallpaper",
    },
    [el("img", { src: wallpaper.url, loading: "lazy", alt: "" }), badge, del]
  );
}

export function openWallpapersModal() {
  const root = document.getElementById("fridge-modal-root");
  root.innerHTML = "";

  const grid = el("div", { class: "wp-grid" });
  const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none;" });
  const uploadBtn = el(
    "button",
    {
      onclick: () => fileInput.click(),
    },
    "+ upload"
  );
  const status = el("p", { class: "error", style: "margin: 6px 0;" });
  const closeBtn = el("button", { onclick: close }, "close");

  async function refreshGrid() {
    grid.innerHTML = "loading…";
    try {
      const wallpapers = await listWallpapers();
      grid.innerHTML = "";
      if (wallpapers.length === 0) {
        grid.appendChild(el("p", { style: "color:#888;font-style:italic;" }, "no wallpapers yet — upload one"));
        return;
      }
      for (const w of wallpapers) {
        grid.appendChild(
          renderTile(w, {
            onPick: (chosen) => {
              setTodaysWallpaper(chosen);
              close();
            },
            onDelete: async (chosen) => {
              try {
                await deleteWallpaper(chosen);
                await refreshWallpaper();
                await refreshGrid();
              } catch (err) {
                status.textContent = err.message || "delete failed";
              }
            },
          })
        );
      }
    } catch (err) {
      grid.innerHTML = "";
      grid.appendChild(el("p", { class: "error" }, err.message || "failed to load wallpapers"));
    }
  }

  fileInput.addEventListener("change", async () => {
    const f = fileInput.files[0];
    fileInput.value = "";
    if (!f) return;
    status.textContent = "uploading…";
    uploadBtn.disabled = true;
    try {
      await uploadWallpaper(f);
      status.textContent = "";
      await refreshGrid();
    } catch (err) {
      status.textContent = err.message || "upload failed";
    } finally {
      uploadBtn.disabled = false;
    }
  });

  const modal = el("div", { class: "fridge-modal" }, [
    el("h3", {}, "wallpapers"),
    el("div", { class: "actions", style: "justify-content:flex-start;margin: 0 0 12px;" }, [uploadBtn]),
    status,
    grid,
    fileInput,
    el("div", { class: "actions" }, [closeBtn]),
  ]);
  const backdrop = el(
    "div",
    {
      class: "fridge-modal-backdrop",
      onclick: (e) => {
        if (e.target === backdrop) close();
      },
    },
    [modal]
  );
  root.appendChild(backdrop);
  refreshGrid();

  function close() {
    root.innerHTML = "";
  }
}
```

- [ ] **Step 2: Add modal grid CSS**

At the bottom of `assets/css/fridge.css`, append:

```css
/* Wallpapers manage modal */
.wp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}
@media (max-width: 600px) {
  .wp-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.wp-tile {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #ddd;
  cursor: pointer;
  background: #f5f5f5;
}
.wp-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.wp-tile:hover {
  border-color: #4a90e2;
}
.wp-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff !important;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1;
}
.wp-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff !important;
  border: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wp-delete:hover {
  background: rgba(192, 57, 43, 0.85);
}
```

Also update the existing color-override block at the top of the file to include the new modal's color text. Find the block starting at line 11:

```css
.fridge-body .fridge-toolbar,
.fridge-body .fridge-toolbar *,
.fridge-body .sticky,
.fridge-body .sticky *,
.fridge-body .fridge-modal,
.fridge-body .fridge-modal *,
.fridge-body .fridge-login,
.fridge-body .fridge-login *,
.fridge-body .archive-list,
.fridge-body .archive-list * {
  color: #333 !important;
}
```

No change needed — the `.fridge-modal *` selector already covers the new modal content. Verify by inspection that the new modal renders with dark text on a dark-mode site.

- [ ] **Step 3: Verify the modal in isolation**

Run: `bundle exec jekyll serve --livereload`. Navigate to `/fridge/`, sign in. In DevTools console:

```js
const m = await import("/assets/js/fridge/wallpapers-modal.js");
m.openWallpapersModal();
```

Expected: a modal appears with "wallpapers" heading, "+ upload" button, and a grid showing the wallpapers uploaded during Task 4. Each tile has the photo, an `L` or `P` badge in the top-left, and an `×` button in the top-right.

Test upload via the modal: click `+ upload`, pick any image file. Expected: status shows "uploading…", then the new tile appears in the grid.

Test click-to-pick: click any tile. Expected: modal closes. Verify localStorage has updated: `localStorage.getItem("fridge.wallpaper.daily.landscape")` (or `.portrait`, depending on viewport) should reflect the picked wallpaper's id and url. Reload the page — the wallpaper still won't paint on load yet (main.js wiring is Task 6), but localStorage should persist the choice.

Test delete: re-open modal, click `×` on a tile, confirm the prompt. Expected: tile disappears from the grid, the Firestore doc and Storage object are gone (verify in Firebase Console).

Test delete-of-current-pick: pick wallpaper A, close, re-open, delete wallpaper A. Expected: works without error. Check localStorage — the cache entry should have been re-picked or cleared by `refreshWallpaper()` (so the next page load won't try to paint a deleted URL).

- [ ] **Step 4: Commit**

```bash
git add assets/js/fridge/wallpapers-modal.js assets/css/fridge.css
git commit -m "feat(fridge): manage-wallpapers modal with upload/grid/delete"
```

---

## Task 6: Wire toolbar buttons and main.js

**Files:**

- Modify: `_pages/fridge.md`
- Modify: `assets/js/fridge/main.js`

- [ ] **Step 1: Add toolbar buttons to fridge.md**

In `_pages/fridge.md`, replace the toolbar block (lines 19-27):

```html
<div id="fridge-toolbar" class="fridge-toolbar">
  <button id="fridge-new" type="button">+ new note</button>
  <label class="cap-label">
    showing <span id="fridge-cap-value">5</span>
    <input id="fridge-cap" type="range" min="1" max="20" value="5" />
  </label>
  <a id="fridge-archive-link" href="/fridge/archive/">archive →</a>
  <button id="fridge-signout" type="button">sign out</button>
</div>
```

with:

```html
<div id="fridge-toolbar" class="fridge-toolbar">
  <button id="fridge-new" type="button">+ new note</button>
  <label class="cap-label">
    showing <span id="fridge-cap-value">5</span>
    <input id="fridge-cap" type="range" min="1" max="20" value="5" />
  </label>
  <button id="fridge-shuffle-wallpaper" type="button" title="shuffle wallpaper">↻</button>
  <button id="fridge-wallpapers" type="button">wallpapers</button>
  <a id="fridge-archive-link" href="/fridge/archive/">archive →</a>
  <button id="fridge-signout" type="button">sign out</button>
</div>
```

- [ ] **Step 2: Wire wallpaper init + buttons in main.js**

In `assets/js/fridge/main.js`, add imports and wiring.

Replace the existing imports at the top (lines 1-7) with:

```js
// assets/js/fridge/main.js
import { watchAuth, bindLoginForm, bindSignOut } from "./auth.js";
import { listBlobs, pickRandom } from "./data.js";
import { startDrift } from "./drift.js";
import { openReadModal } from "./modal.js";
import { openSubmitModal } from "./submit.js";
import { openEditModal, toggleArchive } from "./edit.js";
import { initWallpaper, shuffleWallpaper } from "./wallpaper.js";
import { openWallpapersModal } from "./wallpapers-modal.js";
```

Then, immediately after the existing line `document.getElementById("fridge-new").addEventListener(...)` block (currently ends around line 70), append:

```js
document.getElementById("fridge-shuffle-wallpaper").addEventListener("click", () => {
  shuffleWallpaper();
});

document.getElementById("fridge-wallpapers").addEventListener("click", () => {
  if (drift) drift.pause();
  openWallpapersModal();
  const root = document.getElementById("fridge-modal-root");
  const obs = new MutationObserver(() => {
    if (root.children.length === 0) {
      drift && drift.resume();
      obs.disconnect();
    }
  });
  obs.observe(root, { childList: true });
});
```

Finally, modify the `watchAuth` signed-in callback (currently lines 75-80) to also init the wallpaper. Replace:

```js
watchAuth(
  async () => {
    loginEl.classList.add("hidden");
    boardEl.classList.remove("hidden");
    await refresh();
  },
```

with:

```js
watchAuth(
  async () => {
    loginEl.classList.add("hidden");
    boardEl.classList.remove("hidden");
    initWallpaper(boardEl);
    await refresh();
  },
```

(The rest of the `watchAuth` block — the signed-out callback — is unchanged.)

- [ ] **Step 3: Verify end-to-end**

Run: `bundle exec jekyll serve --livereload`. Hard-reload (Ctrl+Shift+R) `/fridge/`.

Sign in. Expected:

- Toolbar now shows `+ new note`, the `showing N` slider, a `↻` button, a `wallpapers` button, `archive →`, `sign out`.
- The fridge-board background paints with one of your previously-uploaded wallpapers (matching the current viewport orientation) within ~1 second of sign-in.
- Stickies render and drift over the wallpaper.

Click `↻`. Expected: wallpaper swaps to a different one (if you have ≥2 of the current orientation).

Click `wallpapers`. Expected: manage modal opens with the thumbnail grid. Upload a new image — grid updates. Click a tile — modal closes, the chosen wallpaper paints on the board.

Reload the page. Expected: same wallpaper persists (cached in localStorage) and paints instantly without a Firestore round-trip flicker.

Resize browser to portrait shape (narrow). Expected: if portrait wallpapers exist, board swaps to one; otherwise the corkboard fallback returns.

Open browser private window (no localStorage). Sign in. Expected: fresh random wallpaper for the current orientation; cache is written.

Day-rollover test (skip if pressed for time): change your machine's date to tomorrow, reload `/fridge/`. Expected: a new random wallpaper is chosen (different from yesterday's, unless only one exists). Reset your date afterwards.

- [ ] **Step 4: Toolbar overflow check (mobile)**

The toolbar now has more buttons. In DevTools, switch to a 375px-wide phone viewport. Expected: buttons wrap to a second line cleanly; nothing is cut off; the `↻` and `wallpapers` buttons are tappable (≥32px tall — already enforced by existing `.fridge-toolbar button` rules).

If buttons look cramped, inspect `_sass`/the existing media queries (`@media (max-width: 600px)` block in `fridge.css` around line 115). No change should be necessary because the toolbar already uses `flex-wrap: wrap`.

- [ ] **Step 5: Commit**

```bash
git add _pages/fridge.md assets/js/fridge/main.js
git commit -m "feat(fridge): wire wallpaper toolbar buttons and on-load paint"
```

---

## Self-review (to be performed by the writer before handoff)

- Spec coverage check: every section of the design doc (data model, behavior, files touched, expanded palette) is implemented in tasks 1–6.
- Type/name consistency check: `initWallpaper`, `shuffleWallpaper`, `setTodaysWallpaper`, `refreshWallpaper`, `openWallpapersModal`, `listWallpapers`, `uploadWallpaper`, `deleteWallpaper` are spelled identically in defining and calling tasks.
- No placeholders: every code block contains real code; every verification step states what to do and what to expect.
- Orientation cache keys (`fridge.wallpaper.daily.landscape` / `.portrait`) are used consistently across `wallpaper.js` and the verification snippets.
