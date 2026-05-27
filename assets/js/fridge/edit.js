// assets/js/fridge/edit.js
import { updateBlobText, setArchived } from "./data.js";

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

export function openEditModal(blob, { onSaved } = {}) {
  const root = document.getElementById("fridge-modal-root");
  root.innerHTML = "";

  const textInput = el("textarea", { maxlength: "1000" }, blob.text || "");
  const linkInput = el("input", { type: "url", placeholder: "https://… (optional)", value: blob.link || "" });
  const emojiInput = el("input", { type: "text", placeholder: "emoji", maxlength: "4", value: blob.emoji || "" });
  const error = el("p", { class: "error" });
  const saveBtn = el("button", { class: "primary", onclick: save }, "save");
  const cancelBtn = el("button", { onclick: close }, "cancel");

  async function save() {
    error.textContent = "";
    saveBtn.disabled = true;
    saveBtn.textContent = "saving…";
    try {
      await updateBlobText(blob.id, {
        text: textInput.value.trim(),
        link: linkInput.value.trim() || null,
        emoji: emojiInput.value.trim() || null,
      });
      close();
      onSaved && onSaved();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "save";
      error.textContent = err.message || "failed to save";
    }
  }
  function close() {
    root.innerHTML = "";
  }

  const note = el("p", { style: "font-size:12px;color:#888;" }, "image can't be edited in v1");
  const modal = el("div", { class: "fridge-modal" }, [
    el("h3", {}, "edit note"),
    textInput,
    linkInput,
    emojiInput,
    blob.imageUrl ? note : null,
    error,
    el("div", { class: "actions" }, [cancelBtn, saveBtn]),
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
}

export async function toggleArchive(blob) {
  await setArchived(blob.id, !blob.archived);
}
