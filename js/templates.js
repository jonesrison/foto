import { $ } from "./utils.js";
import { Session } from "./state.js";

export const TEMPLATES = [
  { id: "white", name: "Classic White", type: "solid", color: "#ffffff" },
  { id: "checkered", name: "Checkered Grey", type: "checkered", color1: "#f2f2f2", color2: "#ffffff" },
  { id: "retropop", name: "Retro Pop", type: "solid", color: "#FF9A00" },
  { id: "polkadot", name: "Polka Dot", type: "polkadot", bg: "#f4f1ea", dot: "#d3c5b8" }
];

export function drawTemplate(ctx, t, w, h) {
  if (t.type === "solid") {
    ctx.fillStyle = t.color;
    ctx.fillRect(0, 0, w, h);
  } else if (t.type === "checkered") {
    ctx.fillStyle = t.color1;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.color2;
    const size = w / 6; 
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        if ((Math.floor(x/size) + Math.floor(y/size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  } else if (t.type === "polkadot") {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.dot;
    const spacing = w / 6;
    for (let y = 0; y < h + spacing; y += spacing) {
      for (let x = 0; x < w + spacing; x += spacing) {
        const xOffset = (Math.floor(y/spacing) % 2 === 0) ? 0 : spacing/2;
        ctx.beginPath();
        ctx.arc(x + xOffset, y, spacing/5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Add 90s retro icons overlay to ALL templates
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  if (t.type !== "solid" || t.id !== "white") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)"; // lighter icons for darker/colored backgrounds
  }
  ctx.font = "35px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const retroIcons = ["👾", "📼", "💾", "🕹️", "⚡", "💥", "🛹", "🎸"];
  let iconIdx = 0;
  for (let y = 30; y < h; y += 120) {
    for (let x = 40; x < w; x += 120) {
      const xOffset = (Math.floor(y / 120) % 2 === 0) ? 0 : 60;
      ctx.save();
      ctx.translate(x + xOffset, y);
      ctx.rotate((Math.random() - 0.5) * 0.4); // slight random rotation for extra retro feel
      ctx.fillText(retroIcons[iconIdx % retroIcons.length], 0, 0);
      ctx.restore();
      iconIdx++;
    }
  }
}

export function buildTemplateThumbs() {
  const grid = $("#tplGrid");
  grid.innerHTML = "";
  TEMPLATES.forEach(t => {
    const b = document.createElement("button");
    b.className = "pick"; b.dataset.id = t.id;
    b.setAttribute("aria-label", "Scene: " + t.name);
    const c = document.createElement("canvas");
    c.width = 200; c.height = 600; // Strip aspect ratio for thumbnail
    drawTemplate(c.getContext("2d"), t, 200, 600);
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
