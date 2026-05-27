// assets/js/fridge/drift.js
const STICKY_W = 140;
const STICKY_H = 140;

function preview(blob) {
  const parts = [];
  if (blob.emoji) parts.push(`<div class="emoji">${escapeHtml(blob.emoji)}</div>`);
  if (blob.imageUrl) parts.push(`<img src="${escapeAttr(blob.imageUrl)}" alt="">`);
  if (blob.text) parts.push(`<div class="text">${escapeHtml(truncate(blob.text, 80))}</div>`);
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

export function startDrift(stageEl, blobs, onClick) {
  stageEl.innerHTML = "";
  const stageRect = () => stageEl.getBoundingClientRect();
  const items = blobs.map((blob) => {
    const el = document.createElement("div");
    el.className = `sticky ${blob.color || "yellow"}`;
    el.style.transform = `rotate(${(Math.random() - 0.5) * 8}deg)`;
    el.innerHTML = preview(blob);
    el.addEventListener("click", () => onClick(blob));
    stageEl.appendChild(el);
    const r = stageRect();
    return {
      el,
      blob,
      x: Math.random() * Math.max(1, r.width - STICKY_W),
      y: Math.random() * Math.max(1, r.height - STICKY_H),
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
      const maxX = Math.max(1, r.width - STICKY_W);
      const maxY = Math.max(1, r.height - STICKY_H);
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
        if (it.y < 0) {
          it.y = 0;
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
