// assets/js/fridge/modal.js
import { auth } from "./firebase-init.js";

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

/**
 * Open a read-mode modal for a blob.
 * onEdit, onArchive are callbacks shown only if the current user is the author.
 * Returns a function to close.
 */
export function openReadModal(blob, { onEdit, onArchive } = {}) {
  const root = document.getElementById("fridge-modal-root");
  root.innerHTML = "";

  const isAuthor = auth.currentUser && auth.currentUser.uid === blob.authorUid;
  const children = [];
  if (blob.emoji) children.push(el("div", { class: "emoji", style: "font-size:32px;" }, blob.emoji));
  if (blob.imageUrl) children.push(el("img", { src: blob.imageUrl, style: "max-width:100%;border-radius:6px;margin-bottom:10px;" }));
  if (blob.text) children.push(el("div", { style: "white-space:pre-wrap;margin-bottom:10px;" }, blob.text));
  if (blob.link) {
    children.push(el("a", { href: blob.link, target: "_blank", rel: "noopener noreferrer" }, blob.link));
  }

  const actions = [el("button", { onclick: close }, "close")];
  if (isAuthor) {
    actions.unshift(
      el(
        "button",
        {
          class: blob.archived ? "" : "danger",
          onclick: () => {
            close();
            onArchive && onArchive(blob);
          },
        },
        blob.archived ? "unhide" : "hide"
      ),
      el(
        "button",
        {
          class: "primary",
          onclick: () => {
            onEdit && onEdit(blob);
          },
        },
        "edit"
      )
    );
  }

  const modal = el("div", { class: "fridge-modal" }, [...children, el("div", { class: "actions" }, actions)]);
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

  function close() {
    root.innerHTML = "";
  }
  return close;
}
