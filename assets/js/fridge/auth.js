// assets/js/fridge/auth.js
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { ALLOWED_UIDS } from "./firebase-config.js";

/**
 * Calls onAuthed(user) when a permitted user is signed in,
 * and onUnauthed() when no permitted user is signed in.
 */
export function watchAuth(onAuthed, onUnauthed) {
  onAuthStateChanged(auth, (user) => {
    if (user && ALLOWED_UIDS.includes(user.uid)) {
      onAuthed(user);
    } else {
      onUnauthed();
    }
  });
}

export function bindLoginForm(formId, errorId) {
  const form = document.getElementById(formId);
  const errorEl = document.getElementById(errorId);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const email = form.querySelector("#fridge-email").value;
    const password = form.querySelector("#fridge-password").value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!ALLOWED_UIDS.includes(cred.user.uid)) {
        errorEl.textContent = "this account isn't allowed here";
        await signOut(auth);
      }
    } catch (err) {
      errorEl.textContent = err.code === "auth/invalid-credential" ? "wrong email or password" : err.message;
    }
  });
}

export function bindSignOut(buttonId) {
  document.getElementById(buttonId).addEventListener("click", () => signOut(auth));
}
