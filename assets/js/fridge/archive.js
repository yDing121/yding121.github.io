// assets/js/fridge/archive.js
import { watchAuth, bindLoginForm } from "./auth.js";
import { listBlobs } from "./data.js";
import { openReadModal } from "./modal.js";
import { openEditModal, toggleArchive } from "./edit.js";

const loginEl = document.getElementById("fridge-login");
const archiveEl = document.getElementById("fridge-archive");
const listEl = document.getElementById("fridge-archive-list");
const showHidden = document.getElementById("fridge-show-archived");

bindLoginForm("fridge-login-form", "fridge-login-error");

async function render() {
  const blobs = await listBlobs({ includeArchived: showHidden.checked });
  listEl.innerHTML = "";
  for (const b of blobs) {
    const li = document.createElement("li");
    if (b.archived) li.classList.add("archived");
    const date = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().toLocaleDateString() : "";
    const preview = (b.text || b.emoji || (b.imageUrl ? "[image]" : "(empty)")).slice(0, 80);
    li.innerHTML = `<div class="date">${date}${b.archived ? " · hidden" : ""}</div><div>${escapeHtml(preview)}</div>`;
    li.addEventListener("click", () => {
      openReadModal(b, {
        onEdit: (x) => openEditModal(x, { onSaved: render }),
        onArchive: async (x) => { await toggleArchive(x); await render(); },
      });
    });
    listEl.appendChild(li);
  }
  if (blobs.length === 0) {
    listEl.innerHTML = `<li style="border:none;background:none;color:#888;">nothing here yet</li>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

showHidden.addEventListener("change", render);

watchAuth(
  async () => {
    loginEl.classList.add("hidden");
    archiveEl.classList.remove("hidden");
    await render();
  },
  () => {
    loginEl.classList.remove("hidden");
    archiveEl.classList.add("hidden");
    listEl.innerHTML = "";
  },
);
