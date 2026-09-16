import { log, OUT_W, OUT_H, sleep, loadImage } from "./utils.js";
import { Stats } from "./settings.js";
import { drawTemplate } from "./templates.js";

export const Pipeline = {
  endpoint: "http://127.0.0.1:3000/process", // Update to Laptop 2 IP in production
  timeoutMs: 45000,

  async process(photoDataUrl, template, onProgress) {
    const t0 = performance.now();
    let out;
    if (this.endpoint) {
      out = await this._remote(photoDataUrl, template, onProgress);
    } else {
      out = await this._local(photoDataUrl, template, onProgress);
    }
    const ms = performance.now() - t0;
    Stats.bump("procTotal", ms); Stats.bump("procCount");
    log("processed in " + Math.round(ms) + "ms");
    return out;
  },

  async _remote(photoDataUrl, template, onProgress) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      onProgress(0.15);
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoDataUrl, template: template.id }),
        signal: ctl.signal
      });
      if (!res.ok) throw new Error("Server returned " + res.status);
      onProgress(0.85);
      const data = await res.json();
      if (!data.image) throw new Error("Response had no image");
      onProgress(1);
      return data.image;
    } finally { clearTimeout(timer); }
  },

  async _local(photoDataUrl, template, onProgress) {
    onProgress(0.2);
    const img = await loadImage(photoDataUrl);
    onProgress(0.5);
    const c = document.createElement("canvas");
    c.width = OUT_W; c.height = OUT_H;
    const ctx = c.getContext("2d");
    drawTemplate(ctx, template, OUT_W, OUT_H);

    const pad = 70, capH = 150;
    const iw = OUT_W - pad * 2, ih = OUT_H - pad * 2 - capH;
    const ratio = Math.max(iw / img.width, ih / img.height);
    const dw = img.width * ratio, dh = img.height * ratio;
    ctx.save();
    ctx.beginPath(); ctx.rect(pad, pad, iw, ih); ctx.clip();
    ctx.drawImage(img, pad + (iw - dw) / 2, pad + (ih - dh) / 2, dw, dh);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 6;
    ctx.strokeRect(pad, pad, iw, ih);

    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.font = "600 52px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(template.name, OUT_W / 2, OUT_H - pad - capH / 2 + 10);

    await sleep(900);
    onProgress(1);
    return c.toDataURL("image/jpeg", 0.95);
  }
};
