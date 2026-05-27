// assets/js/fridge/main.js
import { watchAuth, bindLoginForm, bindSignOut } from "./auth.js";
import { listBlobs, pickRandom } from "./data.js";
import { startDrift } from "./drift.js";
import { openReadModal } from "./modal.js";

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
  drift = startDrift(stageEl, pickRandom(allBlobs, cap), (blob) => {
    drift && drift.pause();
    openReadModal(blob, {
      onEdit: (b) => console.log("TODO edit", b.id),
      onArchive: async (b) => { /* wired in Task 9 */ },
    });
    const root = document.getElementById("fridge-modal-root");
    const obs = new MutationObserver(() => {
      if (root.children.length === 0) { drift && drift.resume(); obs.disconnect(); }
    });
    obs.observe(root, { childList: true });
  });
}

capInput.addEventListener("input", applyCap);

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
