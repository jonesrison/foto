import { log, sleep, loadImage } from "./utils.js";
import { Stats, Settings } from "./settings.js";
import { drawTemplate } from "./templates.js";

export const Pipeline = {
  get endpoint() {
    return Settings.data.backendIp ? `http://${Settings.data.backendIp}/process` : null;
  },

  async process(shots, template, onProgress) {
    const t0 = performance.now();
    
    // Stitch locally first
    const stripDataUrl = await this.stitchStrip(shots, template, onProgress);
    
    // Send to backend if configured
    if (this.endpoint) {
      try {
        await this._sendToBackend(stripDataUrl, shots);
      } catch(e) {
        log("Backend save failed: " + e.message);
      }
    }
    
    const ms = performance.now() - t0;
    Stats.bump("procTotal", ms); Stats.bump("procCount");
    log("processed in " + Math.round(ms) + "ms");
    return stripDataUrl;
  },

  async stitchStrip(shots, template, onProgress) {
    onProgress(0.1);
    
    // Canvas dimensions for a standard vertical strip
    const canvas = document.createElement("canvas");
    canvas.width = 600; 
    canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    
    // Draw the selected retro template background
    if (template) {
        drawTemplate(ctx, template, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Apply nostalgic filter for the photos
    ctx.filter = "sepia(40%) contrast(120%) brightness(110%) hue-rotate(-10deg)";
    
    const pad = 40; // padding around/between images
    const imgW = canvas.width - (pad * 2);
    const imgH = imgW * (2/3); // 3:2 landscape height
    
    for (let i = 0; i < shots.length; i++) {
        const img = await loadImage(shots[i]);
        const y = pad + (i * (imgH + pad));
        ctx.drawImage(img, pad, y, imgW, imgH);
        
        onProgress(0.1 + ((i+1)/shots.length) * 0.8);
    }
    
    // Reset filter and add classic branding text at bottom
    ctx.filter = "none";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RETRO BOOTH", canvas.width / 2, canvas.height - 40);
    
    onProgress(1.0);
    return canvas.toDataURL("image/jpeg", 0.95);
  },

  async _sendToBackend(strip, originals) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: strip, originals: originals }),
        signal: ctl.signal
      });
      if (!res.ok) throw new Error("Server returned " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
};
