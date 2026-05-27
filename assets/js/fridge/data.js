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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { db, storage, auth } from "./firebase-init.js";

const COLORS = ["yellow", "pink", "blue", "green"];

export async function listBlobs({ includeArchived = false } = {}) {
  const base = collection(db, "blobs");
  const q = includeArchived
    ? query(base, orderBy("createdAt", "desc"))
    : query(base, where("archived", "==", false), orderBy("createdAt", "desc"));
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
