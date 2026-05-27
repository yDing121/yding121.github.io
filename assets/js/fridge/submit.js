// assets/js/fridge/submit.js
import { createBlob } from "./data.js";

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

export function openSubmitModal({ onCreated } = {}) {
  const root = document.getElementById("fridge-modal-root");
  root.innerHTML = "";

  const textInput = el("textarea", { placeholder: "what's on your mind?", maxlength: "1000" });
  const linkInput = el("input", { type: "url", placeholder: "https://… (optional)" });
  const emojiInput = el("input", { type: "text", placeholder: "emoji (optional)", maxlength: "4" });
  const fileInput = el("input", { type: "file", accept: "image/*" });
  const preview = el("img", { style: "max-width:100%;max-height:200px;display:none;margin:8px 0;border-radius:6px;" });
  const error = el("p", { class: "error" });
  const submitBtn = el("button", { class: "primary", onclick: submit }, "post");
  const cancelBtn = el("button", { onclick: close }, "cancel");

  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (!f) {
      preview.style.display = "none";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      error.textContent = "image must be under 5MB";
      fileInput.value = "";
      preview.style.display = "none";
      return;
    }
    error.textContent = "";
    preview.src = URL.createObjectURL(f);
    preview.style.display = "block";
  });

  async function submit() {
    error.textContent = "";
    const text = textInput.value.trim();
    const file = fileInput.files[0] || null;
    if (!text && !file && !emojiInput.value.trim()) {
      error.textContent = "add some text, an image, or an emoji";
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "posting…";
    try {
      await createBlob({
        text,
        link: linkInput.value.trim() || null,
        emoji: emojiInput.value.trim() || null,
        imageFile: file,
      });
      close();
      onCreated && onCreated();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "post";
      error.textContent = err.message || "failed to post";
    }
  }

  function close() {
    if (preview.src && preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
    root.innerHTML = "";
  }

  const modal = el("div", { class: "fridge-modal" }, [
    el("h3", {}, "new note"),
    textInput,
    linkInput,
    emojiInput,
    fileInput,
    preview,
    error,
    el("div", { class: "actions" }, [cancelBtn, submitBtn]),
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
