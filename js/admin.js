import { $, logLines, log, OUT_W, OUT_H } from "./utils.js";
import { Settings, Stats, DEFAULTS } from "./settings.js";
import { Camera } from "./camera.js";
import { Printer } from "./printer.js";
import { TEMPLATES, drawTemplate } from "./templates.js";
import { refreshAttractCopy } from "./main.js";

export function openAdmin() {
  $("#admin").classList.add("on");
  document.body.classList.remove("cursor-hidden");
  const d = Settings.data;
  $("#mirrorChk").checked = d.mirrorPreview;
  $("#mirrorSaveChk").checked = d.mirrorSave;
  $("#guideChk").checked = d.showGuide;
  $("#shotsInp").value = d.shots;
  $("#cdInp").value = d.countdown;
  $("#keepInp").value = d.keep;
  $("#idleInp").value = d.idleSeconds;
  paintCamSelect();
  paintStats();
  $("#adminLog").textContent = logLines.join("\n");
}
export function closeAdmin() {
  $("#admin").classList.remove("on");
  document.body.classList.add("cursor-hidden");
}
export function paintCamSelect() {
  const sel = $("#camSel"); sel.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = ""; auto.textContent = "Automatic";
  sel.appendChild(auto);
  Camera.devices.forEach((d, i) => {
    const o = document.createElement("option");
    o.value = d.deviceId;
    o.textContent = d.label || ("Camera " + (i + 1));
    sel.appendChild(o);
  });
  sel.value = Settings.data.deviceId || "";
}
export function paintStats() {
  const s = Stats.data;
  $("#stSessions").textContent = s.sessions;
  $("#stPrints").textContent = s.prints;
  $("#stFails").textContent = s.fails;
  $("#stAvg").textContent = s.procCount
    ? (s.procTotal / s.procCount / 1000).toFixed(1) + "s" : "\u2014";
}

// Will be called from main.js bind
export function bindAdminControls(applyMirrorFunc, bootFunc, goFullscreenFunc) {
  // admin: hold the top-left corner for 2s, or Ctrl+Shift+A
  let holdTimer = null;
  const corner = $("#corner");
  const startHold = () => { holdTimer = setTimeout(openAdmin, 2000); };
  const endHold = () => { clearTimeout(holdTimer); };
  corner.addEventListener("pointerdown", startHold);
  corner.addEventListener("pointerup", endHold);
  corner.addEventListener("pointerleave", endHold);
  corner.addEventListener("pointercancel", endHold);

  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); openAdmin(); }
    if (e.key === "Escape" && $("#admin").classList.contains("on")) closeAdmin();
  });

  $("#closeAdmin").addEventListener("click", closeAdmin);
  $("#admin").addEventListener("click", e => { if (e.target.id === "admin") closeAdmin(); });

  $("#camSel").addEventListener("change", async e => {
    Settings.data.deviceId = e.target.value; Settings.save();
    try { await Camera.start(); applyMirrorFunc(); log("camera switched"); }
    catch (err) { log("switch failed: " + err.message); }
  });
  $("#mirrorChk").addEventListener("change", e => {
    Settings.data.mirrorPreview = e.target.checked; Settings.save(); applyMirrorFunc();
  });
  $("#mirrorSaveChk").addEventListener("change", e => {
    Settings.data.mirrorSave = e.target.checked; Settings.save();
  });
  $("#guideChk").addEventListener("change", e => {
    Settings.data.showGuide = e.target.checked; Settings.save();
  });
  const numField = (sel, key, min, max) => {
    $(sel).addEventListener("change", e => {
      let v = parseInt(e.target.value, 10);
      if (isNaN(v)) v = DEFAULTS[key];
      v = Math.min(max, Math.max(min, v));
      e.target.value = v;
      Settings.data[key] = v; Settings.save();
      if (key === "shots" || key === "keep") {
        Settings.data.keep = Math.min(Settings.data.keep, Settings.data.shots);
        $("#keepInp").value = Settings.data.keep; Settings.save();
      }
      refreshAttractCopy();
    });
  };
  numField("#shotsInp", "shots", 1, 6);
  numField("#cdInp", "countdown", 1, 10);
  numField("#keepInp", "keep", 1, 6);
  numField("#idleInp", "idleSeconds", 15, 300);

  $("#testShot").addEventListener("click", () => {
    try {
      const s = Camera.capture();
      const w = window.open("");
      if (w) w.document.write('<body style="margin:0;background:#111"><img src="' + s + '" style="max-width:100%">');
      log("test capture ok");
    } catch (e) { log("test capture failed: " + e.message); }
  });
  $("#testPrint").addEventListener("click", () => {
    const c = document.createElement("canvas");
    c.width = OUT_W; c.height = OUT_H;
    const ctx = c.getContext("2d");
    drawTemplate(ctx, TEMPLATES[0], OUT_W, OUT_H);
    ctx.fillStyle = "#fff"; ctx.font = "700 90px system-ui"; ctx.textAlign = "center";
    ctx.fillText("TEST PRINT", OUT_W / 2, OUT_H / 2);
    Printer.enqueue(c.toDataURL("image/jpeg", 0.9), { test: true });
    log("test print queued");
  });
  $("#reloadCams").addEventListener("click", async () => { await Camera.listDevices(); paintCamSelect(); });
  $("#resetStats").addEventListener("click", () => {
    Stats.data = { sessions: 0, prints: 0, fails: 0, procTotal: 0, procCount: 0 };
    Stats.save(); paintStats(); log("counters reset");
  });
  $("#fsBtn").addEventListener("click", goFullscreenFunc);
  
  $("#errAdminBtn").addEventListener("click", openAdmin);
  $("#retryBtn").addEventListener("click", bootFunc);
}
