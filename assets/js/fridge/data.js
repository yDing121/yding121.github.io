// assets/js/fridge/data.js
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { db, storage, auth } from "./firebase-init.js";

const COLORS = [
  "yellow", "pink", "blue", "green",
  "peach", "lavender", "mint", "lemon", "sky", "coral",
];

export async function listBlobs({ includeArchived = false } = {}) {
  const base = collection(db, "blobs");
  const q = includeArchived ? query(base, orderBy("createdAt", "desc")) : query(base, where("archived", "==", false), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createBlob({ text, link, emoji, imageFile }) {
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  let imageUrl = null;
  let imagePath = null;
  if (imageFile) {
    imagePath = `blob-images/${user.uid}/${Date.now()}-${imageFile.name}`;
    const ref = storageRef(storage, imagePath);
    await uploadBytes(ref, imageFile);
    imageUrl = await getDownloadURL(ref);
  }
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return await addDoc(collection(db, "blobs"), {
    authorUid: user.uid,
    text: text || "",
    link: link || null,
    emoji: emoji || null,
    imageUrl,
    imagePath,
    color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  });
}

export async function updateBlobText(blobId, { text, link, emoji }) {
  await updateDoc(doc(db, "blobs", blobId), {
    text: text || "",
    link: link || null,
    emoji: emoji || null,
    updatedAt: serverTimestamp(),
  });
}

export async function setArchived(blobId, archived) {
  await updateDoc(doc(db, "blobs", blobId), {
    archived,
    updatedAt: serverTimestamp(),
  });
}

export function pickRandom(blobs, cap) {
  if (blobs.length <= cap) return blobs.slice();
  const copy = blobs.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, cap);
}

/**
 * Recency-weighted sampling *with replacement*.
 *
 * `blobs` is expected to be newest-first (as returned by listBlobs). We use the
 * array index as a recency rank:
 *   rank 0 = newest, rank 1 = next newest, ...
 *
 * The weight is a blend between:
 *   - uniform (so older blobs never become "impossible" to see)
 *   - exponential decay by rank (so newer blobs are more likely)
 *
 * Final weight:
 *   w(rank) = (1 - mix) * 1 + mix * 0.5^(rank / halfLife)
 *
 * Where:
 *   - halfLife is measured in ranks (not days)
 *   - mix in [0, 1] controls how strong the recency bias is
 */
export function pickWeightedRecent(blobs, cap, { halfLife = 60, mix = 0.6 } = {}) {
  const n = blobs.length;
  if (n === 0 || cap <= 0) return [];

  // Clamp/guard inputs.
  const hl = Math.max(1, Number(halfLife) || 60);
  const m = Math.max(0, Math.min(1, Number(mix)));

  // Precompute weights by rank.
  const weights = new Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const decayed = Math.pow(0.5, i / hl);
    const w = (1 - m) * 1 + m * decayed;
    weights[i] = w;
    sum += w;
  }
  if (sum <= 0) return blobs.slice(0, Math.min(cap, n));

  // Sample with replacement.
  const out = [];
  for (let k = 0; k < cap; k++) {
    let r = Math.random() * sum;
    let idx = 0;
    for (let i = 0; i < n; i++) {
      r -= weights[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(blobs[idx]);
  }
  return out;
}

// ── Wallpapers ──────────────────────────────────────────────────────────────

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
