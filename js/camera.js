import { log, OUT_W, OUT_H, $ } from "./utils.js";
import { Settings } from "./settings.js";
import { State } from "./state.js";

export const Camera = {
  stream: null,
  devices: [],

  async listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this.devices = all.filter(d => d.kind === "videoinput");
      log("found " + this.devices.length + " camera(s)");
      return this.devices;
    } catch (e) { log("enumerate failed: " + e.message); return []; }
  },

  async start() {
    this.stop();
    const want = Settings.data.deviceId;
    const constraints = {
      audio: false,
      video: {
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      }
    };
    if (want) constraints.video.deviceId = { exact: want };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      if (want) {
        log("saved camera unavailable, falling back to default");
        delete constraints.video.deviceId;
        Settings.data.deviceId = "";
        Settings.save();
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        throw e;
      }
    }

    const video = $("#feed");
    video.srcObject = this.stream;
    await video.play().catch(() => {});

    const track = this.stream.getVideoTracks()[0];
    const s = track.getSettings();
    log("camera live: " + (track.label || "unnamed") + " " + s.width + "x" + s.height);

    track.addEventListener("ended", () => {
      log("camera track ended");
      if (State.current !== "error") State.go("error", { reason: "The camera disconnected." });
    });

    await this.listDevices();
    return s;
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  capture() {
    const video = $("#feed");
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) throw new Error("No video frame available");

    const targetRatio = 2 / 3;
    let sw = vw, sh = vh;
    if (vw / vh > targetRatio) sw = Math.round(vh * targetRatio);
    else sh = Math.round(vw / targetRatio);
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);

    const c = document.createElement("canvas");
    c.width = OUT_W; c.height = OUT_H;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    if (Settings.data.mirrorSave) { ctx.translate(OUT_W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    return c.toDataURL("image/jpeg", 0.94);
  }
};
