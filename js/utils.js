export const $ = s => document.querySelector(s);
export const logLines = [];
export function log(msg) {
  const line = new Date().toLocaleTimeString() + "  " + msg;
  logLines.push(line);
  if (logLines.length > 60) logLines.shift();
  const el = $("#adminLog");
  if (el) { el.textContent = logLines.join("\n"); el.scrollTop = el.scrollHeight; }
  console.log("[booth]", msg);
}

export const OUT_W = 1200, OUT_H = 1800;
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not read the photo"));
    i.src = src;
  });
}

export async function goFullscreen() {
  try { await document.documentElement.requestFullscreen(); } catch (e) {}
}
