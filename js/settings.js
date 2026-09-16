import { log } from "./utils.js";
import { paintStats } from "./admin.js";

export const DEFAULTS = {
  deviceId: "",
  mirrorPreview: true,
  mirrorSave: true,
  showGuide: false,
  shots: 4,
  countdown: 3,
  keep: 1,
  idleSeconds: 60
};

export const Settings = {
  data: Object.assign({}, DEFAULTS),
  load() {
    try {
      const raw = localStorage.getItem("booth.settings");
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { log("settings load failed: " + e.message); }
  },
  save() {
    try { localStorage.setItem("booth.settings", JSON.stringify(this.data)); }
    catch (e) { log("settings save failed: " + e.message); }
  }
};

export const Stats = {
  data: { sessions: 0, prints: 0, fails: 0, procTotal: 0, procCount: 0 },
  load() {
    try {
      const raw = localStorage.getItem("booth.stats");
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) {}
  },
  save() {
    try { localStorage.setItem("booth.stats", JSON.stringify(this.data)); } catch (e) {}
  },
  bump(k, n) { this.data[k] = (this.data[k] || 0) + (n === undefined ? 1 : n); this.save(); paintStats(); }
};
