import { $, OUT_W, OUT_H } from "./utils.js";
import { Session } from "./state.js";

export const TEMPLATES = [
  { id: "backwater",  name: "Backwaters",   sky: "#0F3A4D", mid: "#1D6B6E", low: "#E8C46A" },
  { id: "neon",       name: "Neon city",    sky: "#170B2E", mid: "#5B1E82", low: "#FF4E88" },
  { id: "studio",     name: "Studio",       sky: "#2B2118", mid: "#5C4632", low: "#C89B62" },
  { id: "monsoon",    name: "Monsoon",      sky: "#10222E", mid: "#2C5364", low: "#6FA8A0" },
  { id: "gold",       name: "Gold hour",    sky: "#3A1A0C", mid: "#A34719", low: "#F2B13C" },
  { id: "bloom",      name: "Bloom",        sky: "#3B0F2A", mid: "#8C2258", low: "#F08CA8" }
];

export function drawTemplate(ctx, t, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, t.sky); g.addColorStop(0.55, t.mid); g.addColorStop(1, t.low);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.16; ctx.fillStyle = "#000";
  for (let i = 0; i < 5; i++) {
    const y = h * (0.6 + i * 0.08);
    ctx.beginPath(); ctx.moveTo(0, y);
    ctx.quadraticCurveTo(w * 0.5, y - h * 0.05 * (i % 2 ? 1 : -1), w, y);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function buildTemplateThumbs() {
  const grid = $("#tplGrid");
  grid.innerHTML = "";
  TEMPLATES.forEach(t => {
    const b = document.createElement("button");
    b.className = "pick"; b.dataset.id = t.id;
    b.setAttribute("aria-label", "Scene: " + t.name);
    const c = document.createElement("canvas");
    c.width = 200; c.height = 300;
    drawTemplate(c.getContext("2d"), t, 200, 300);
    b.appendChild(c);
    const n = document.createElement("div");
    n.className = "tplName"; n.textContent = t.name;
    b.appendChild(n);
    const tick = document.createElement("div");
    tick.className = "tick"; tick.textContent = "\u2713";
    b.appendChild(tick);
    b.addEventListener("click", () => {
      grid.querySelectorAll(".pick").forEach(p => p.classList.remove("sel"));
      b.classList.add("sel");
      Session.template = t;
      $("#makeBtn").disabled = false;
    });
    grid.appendChild(b);
  });
}
