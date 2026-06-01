// assets/js/fridge/wallpapers-modal.js
import { listWallpapers, uploadWallpaper, deleteWallpaper } from "./data.js";
import { setTodaysWallpaper, refreshWallpaper } from "./wallpaper.js";

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

function renderTile(wallpaper, { onPick, onDelete }) {
  const badge = el("span", { class: "wp-badge" }, wallpaper.orientation === "landscape" ? "L" : "P");
  const del = el(
    "button",
    {
      class: "wp-delete",
      title: "delete",
      onclick: (e) => {
        e.stopPropagation();
        if (confirm("delete this wallpaper?")) onDelete(wallpaper);
      },
    },
    "×"
  );
  return el(
    "div",
    {
      class: "wp-tile",
      onclick: () => onPick(wallpaper),
      title: "set as today's wallpaper",
    },
    [el("img", { src: wallpaper.url, loading: "lazy", alt: "" }), badge, del]
  );
}

export function openWallpapersModal() {
  const root = document.getElementById("fridge-modal-root");
  root.innerHTML = "";

  const grid = el("div", { class: "wp-grid" });
  const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none;" });
  const uploadBtn = el(
    "button",
    {
      onclick: () => fileInput.click(),
    },
    "+ upload"
  );
  const status = el("p", { class: "error", style: "margin: 6px 0;" });
  const closeBtn = el("button", { onclick: close }, "close");

  async function refreshGrid() {
    grid.innerHTML = "loading…";
    try {
      const wallpapers = await listWallpapers();
      grid.innerHTML = "";
      if (wallpapers.length === 0) {
        grid.appendChild(el("p", { style: "color:#888;font-style:italic;" }, "no wallpapers yet — upload one"));
        return;
      }
      for (const w of wallpapers) {
        grid.appendChild(
          renderTile(w, {
            onPick: (chosen) => {
              setTodaysWallpaper(chosen);
              close();
            },
            onDelete: async (chosen) => {
              try {
                await deleteWallpaper(chosen);
                await refreshWallpaper();
                await refreshGrid();
              } catch (err) {
                status.textContent = err.message || "delete failed";
              }
            },
          })
        );
      }
    } catch (err) {
      grid.innerHTML = "";
      grid.appendChild(el("p", { class: "error" }, err.message || "failed to load wallpapers"));
    }
  }

  fileInput.addEventListener("change", async () => {
    const f = fileInput.files[0];
    fileInput.value = "";
    if (!f) return;
    status.textContent = "uploading…";
    uploadBtn.disabled = true;
    try {
      await uploadWallpaper(f);
      status.textContent = "";
      await refreshGrid();
    } catch (err) {
      status.textContent = err.message || "upload failed";
    } finally {
      uploadBtn.disabled = false;
    }
  });

  const modal = el("div", { class: "fridge-modal" }, [
    el("h3", {}, "wallpapers"),
    el("div", { class: "actions", style: "justify-content:flex-start;margin: 0 0 12px;" }, [uploadBtn]),
    status,
    grid,
    fileInput,
    el("div", { class: "actions" }, [closeBtn]),
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
  refreshGrid();

  function close() {
    root.innerHTML = "";
  }
}
