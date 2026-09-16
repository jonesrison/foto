import { $, log, sleep, goFullscreen } from "./utils.js";
import { Settings, Stats } from "./settings.js";
import { Camera } from "./camera.js";
import { Session, State } from "./state.js";
import { Pipeline } from "./pipeline.js";
import { Printer } from "./printer.js";
import { buildTemplateThumbs } from "./templates.js";
import { paintCamSelect, bindAdminControls } from "./admin.js";

export function refreshAttractCopy() {
  const d = Settings.data;
  $("#attractSub").textContent =
    d.shots + " shots, pick your " + (d.keep > 1 ? "favourites" : "favourite") +
    ", choose a scene. Printed in about a minute.";
}

export function applyMirror() {
  $("#feed").classList.toggle("mirror", Settings.data.mirrorPreview);
}

function fireFlash() {
  const f = $("#flash");
  f.classList.remove("fire"); void f.offsetWidth; f.classList.add("fire");
}

function buildStrip(n) {
  const s = $("#strip"); s.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "slot"; d.dataset.i = i;
    s.appendChild(d);
  }
}

function fillSlot(i, src) {
  const slot = $('#strip .slot[data-i="' + i + '"]');
  if (!slot) return;
  const img = document.createElement("img");
  img.src = src; img.alt = "";
  slot.innerHTML = ""; slot.appendChild(img);
  slot.classList.add("filled");
}

function paintPips(activeIdx) {
  const wrap = $("#shotPips"); wrap.innerHTML = "";
  for (let i = 0; i < Settings.data.shots; i++) {
    const p = document.createElement("div");
    p.className = "pip" + (i < activeIdx ? " done" : i === activeIdx ? " now" : "");
    wrap.appendChild(p);
  }
}

function buildPhotoGrid() {
  const grid = $("#photoGrid"); grid.innerHTML = "";
  Session.chosen = [];
  const keep = Math.min(Settings.data.keep, Session.shots.length);
  $("#chooseTitle").textContent = keep > 1 ? "Pick your " + keep + " favourites" : "Pick your favourite";

  Session.shots.forEach((src, i) => {
    const b = document.createElement("button");
    b.className = "pick"; b.setAttribute("aria-label", "Photo " + (i + 1));
    const img = document.createElement("img"); img.src = src; img.alt = "";
    b.appendChild(img);
    const tick = document.createElement("div");
    tick.className = "tick"; tick.textContent = "\u2713";
    b.appendChild(tick);
    b.addEventListener("click", () => {
      const at = Session.chosen.indexOf(i);
      if (at >= 0) { Session.chosen.splice(at, 1); b.classList.remove("sel"); }
      else {
        if (Session.chosen.length >= keep) {
          const drop = Session.chosen.shift();
          grid.children[drop].classList.remove("sel");
        }
        Session.chosen.push(i); b.classList.add("sel");
      }
      $("#toTplBtn").disabled = Session.chosen.length !== keep;
      $("#chooseNote").textContent = Session.chosen.length === keep
        ? "" : "Choose " + (keep - Session.chosen.length) + " more";
    });
    grid.appendChild(b);
  });
  $("#toTplBtn").disabled = true;
  $("#chooseNote").textContent = keep > 1 ? "Choose " + keep + " more" : "";
}

async function makePhoto() {
  State.go("processing");
  $("#barFill").style.width = "0%";
  $("#procTitle").textContent = "Making your photo strip";
  $("#procSub").textContent = "Hang tight, this takes a few seconds.";

  try {
    const out = await Pipeline.process(Session.shots, p => {
      $("#barFill").style.width = Math.round(p * 100) + "%";
    });
    Session.result = out;
    
    // Show the result screen with the final strip
    $("#resultImg").src = out;
    State.go("result");
  } catch (e) {
    log("pipeline failed: " + e.message);
    Stats.bump("fails");
    State.go("error", { reason: "Processing failed.", detail: e.message });
  }
}

export function endSession(printed) {
  Session.reset();
  State.abortShoot = true;
  $("#strip").innerHTML = "";
  $("#tplGrid").querySelectorAll(".pick").forEach(p => p.classList.remove("sel"));
  $("#makeBtn").disabled = true;
  State.go("attract");
}

async function runShoot() {
  Session.reset();
  Stats.bump("sessions");
  State.abortShoot = false;
  buildStrip(Settings.data.shots);
  State.go("countdown");

  for (let i = 0; i < Settings.data.shots; i++) {
    if (State.abortShoot) return;
    paintPips(i);
    $("#countHint").textContent = i === 0 ? "Get ready" : "Shot " + (i + 1) + " of " + Settings.data.shots;

    for (let n = Settings.data.countdown; n > 0; n--) {
      if (State.abortShoot) return;
      $("#count").textContent = n;
      await sleep(1000);
    }
    $("#count").textContent = "";
    $("#countHint").textContent = "";

    let shot;
    try { shot = Camera.capture(); }
    catch (e) {
      log("capture failed: " + e.message);
      State.go("error", { reason: "The camera stopped sending pictures.", detail: e.message });
      return;
    }
    fireFlash();
    Session.shots.push(shot);
    fillSlot(i, shot);
    await sleep(1100);
  }

  paintPips(-1);
  makePhoto();
}

function bind() {
  $("#startBtn").addEventListener("click", () => { goFullscreen(); runShoot(); });
  $("#attract").addEventListener("click", e => { if (e.target.id === "attract") { goFullscreen(); runShoot(); } });
  
  // Start session with Spacebar
  document.addEventListener("keydown", e => {
    if (State.current === "attract" && (e.code === "Space" || e.key === " ")) {
      e.preventDefault();
      goFullscreen();
      runShoot();
    }
  });

  $("#retakeBtn").addEventListener("click", runShoot);
  $("#redoBtn").addEventListener("click", runShoot);

  $("#printBtn").addEventListener("click", () => {
    State.go("printed");
    setTimeout(() => { if (State.current === "printed") endSession(true); }, 5000);
  });
  $("#doneBtn").addEventListener("click", () => endSession(true));

  bindAdminControls(applyMirror, boot, goFullscreen);

  ["pointerdown", "keydown"].forEach(ev =>
    document.addEventListener(ev, () => { if (!$("#admin").classList.contains("on")) State.resetIdle(); }, true));

  $("#nudge").addEventListener("click", () => State.resetIdle());

  navigator.mediaDevices.addEventListener("devicechange", async () => {
    log("device list changed");
    await Camera.listDevices();
    if ($("#admin").classList.contains("on")) paintCamSelect();
  });
}

async function boot() {
  State.go("boot");
  try {
    await Camera.start();
    applyMirror();
    paintCamSelect();
    refreshAttractCopy();
    document.body.classList.add("cursor-hidden");
    State.go("attract");
  } catch (e) {
    let reason = "The camera isn't connected.";
    if (e && e.name === "NotAllowedError") reason = "Camera permission was blocked in the browser.";
    if (e && e.name === "NotReadableError") reason = "Another app is already using the camera.";
    if (e && e.name === "NotFoundError") reason = "No camera was found.";
    log("boot failed: " + (e && e.message));
    State.go("error", { reason, detail: (e && (e.name + ": " + e.message)) || "" });
  }
}

Settings.load();
Stats.load();
buildTemplateThumbs();
bind();
Printer.paintQueue();
boot();
