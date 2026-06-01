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
    // Escape `"` and `\` so the URL is safe to interpolate inside a CSS url("…") string.
    const escaped = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    boardElRef.style.setProperty("--fridge-wallpaper", `url("${escaped}")`);
    boardElRef.classList.add("has-wallpaper");
  } else {
    boardElRef.style.removeProperty("--fridge-wallpaper");
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
async function ensureTodaysWallpaper({ forceRepick = false, skipFastPath = false } = {}) {
  const orientation = currentOrientation();
  const today = todayStr();
  const cached = readCache(orientation);

  // Fast path: paint immediately from cache if date matches.
  if (!skipFastPath && !forceRepick && cached && cached.date === today && cached.url) {
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
  await ensureTodaysWallpaper({ skipFastPath: true });
}
