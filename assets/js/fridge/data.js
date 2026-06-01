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
