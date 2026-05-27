// assets/js/fridge/drift.js
const STICKY_W = 140;
const STICKY_H = 140;

function preview(blob) {
  const parts = [];
  if (blob.emoji) parts.push(`<div class="emoji">${escapeHtml(blob.emoji)}</div>`);
  if (blob.imageUrl) parts.push(`<img src="${escapeAttr(blob.imageUrl)}" alt="">`);
  if (blob.text) {
    // Image-bearing stickies prioritize the photo — keep text short. CSS line-clamps anything past.
    const limit = blob.imageUrl ? 30 : 120;
    parts.push(`<div class="text">${escapeHtml(truncate(blob.text, limit))}</div>`);
  }
  return parts.join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function escapeAttr(s) {
  return escapeHtml(s);
}
function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const BOTTOM_MARGIN = 20;
const TOOLBAR_GAP = 10;

export function startDrift(stageEl, blobs, onClick) {
  stageEl.innerHTML = "";
  const stageRect = () => stageEl.getBoundingClientRect();
  // Measure the toolbar so stickies don't drift behind it. Falls back to 60px if missing.
  const topMargin = () => {
    const tb = document.getElementById("fridge-toolbar");
    if (!tb) return 60;
    const tbR = tb.getBoundingClientRect();
    const sR = stageRect();
    return Math.max(0, tbR.bottom - sR.top + TOOLBAR_GAP);
  };

  const items = blobs.map((blob) => {
    const el = document.createElement("div");
    el.className = `sticky ${blob.color || "yellow"}`;
    el.style.transform = `rotate(${(Math.random() - 0.5) * 8}deg)`;
    el.innerHTML = preview(blob);
    el.addEventListener("click", () => onClick(blob));
    stageEl.appendChild(el);
    const r = stageRect();
    const top = topMargin();
    return {
      el,
      blob,
      x: Math.random() * Math.max(1, r.width - STICKY_W),
      y: top + Math.random() * Math.max(1, r.height - STICKY_H - top - BOTTOM_MARGIN),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    };
  });

  let running = true;
  let paused = false;
  function tick() {
    if (!running) return;
    if (!paused) {
      const r = stageRect();
      const top = topMargin();
      const maxX = Math.max(1, r.width - STICKY_W);
      const maxY = Math.max(top, r.height - STICKY_H - BOTTOM_MARGIN);
      for (const it of items) {
        it.vx += (Math.random() - 0.5) * 0.04;
        it.vy += (Math.random() - 0.5) * 0.04;
        it.vx = Math.max(-0.5, Math.min(0.5, it.vx));
        it.vy = Math.max(-0.5, Math.min(0.5, it.vy));
        it.x += it.vx;
        it.y += it.vy;
        if (it.x < 0) {
          it.x = 0;
          it.vx = Math.abs(it.vx);
        }
        if (it.x > maxX) {
          it.x = maxX;
          it.vx = -Math.abs(it.vx);
        }
        if (it.y < top) {
          it.y = top;
          it.vy = Math.abs(it.vy);
        }
        if (it.y > maxY) {
          it.y = maxY;
          it.vy = -Math.abs(it.vy);
        }
        it.el.style.left = it.x + "px";
        it.el.style.top = it.y + "px";
      }
    }
    requestAnimationFrame(tick);
  }
  tick();

  return {
    stop() {
      running = false;
      stageEl.innerHTML = "";
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
  };
}
