// assets/js/fridge/main.js
import { watchAuth, bindLoginForm, bindSignOut } from "./auth.js";
import { listBlobs, pickRandom } from "./data.js";
import { startDrift } from "./drift.js";
import { openReadModal } from "./modal.js";
import { openSubmitModal } from "./submit.js";
import { openEditModal, toggleArchive } from "./edit.js";

const loginEl = document.getElementById("fridge-login");
const boardEl = document.getElementById("fridge-board");
const stageEl = document.getElementById("fridge-stage");
const capInput = document.getElementById("fridge-cap");
const capValue = document.getElementById("fridge-cap-value");

let drift = null;
let allBlobs = [];

async function refresh() {
  allBlobs = await listBlobs();
  applyCap();
}

function applyCap() {
  const cap = parseInt(capInput.value, 10);
  capValue.textContent = String(cap);
  if (drift) drift.stop();
  if (allBlobs.length === 0) {
    stageEl.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#888;font-style:italic;">nothing on the fridge yet — click "+ new note"</div>`;
    drift = null;
    return;
  }
  drift = startDrift(stageEl, pickRandom(allBlobs, cap), (blob) => {
    drift && drift.pause();
    openReadModal(blob, {
      onEdit: (b) => openEditModal(b, { onSaved: refresh }),
      onArchive: async (b) => { await toggleArchive(b); await refresh(); },
    });
    const root = document.getElementById("fridge-modal-root");
    const obs = new MutationObserver(() => {
      if (root.children.length === 0) { drift && drift.resume(); obs.disconnect(); }
    });
    obs.observe(root, { childList: true });
  });
}

capInput.addEventListener("input", applyCap);

document.getElementById("fridge-new").addEventListener("click", () => {
  if (drift) drift.pause();
  openSubmitModal({ onCreated: refresh });
  const root = document.getElementById("fridge-modal-root");
  const obs = new MutationObserver(() => {
    if (root.children.length === 0) { drift && drift.resume(); obs.disconnect(); }
  });
  obs.observe(root, { childList: true });
});

bindLoginForm("fridge-login-form", "fridge-login-error");
bindSignOut("fridge-signout");

watchAuth(
  async () => {
    loginEl.classList.add("hidden");
    boardEl.classList.remove("hidden");
    await refresh();
  },
  () => {
    loginEl.classList.remove("hidden");
    boardEl.classList.add("hidden");
    if (drift) { drift.stop(); drift = null; }
    allBlobs = [];
  },
);
