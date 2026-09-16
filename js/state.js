import { $, log } from "./utils.js";
import { Settings } from "./settings.js";
import { endSession } from "./main.js";

export const Session = {
  shots: [], chosen: [], template: null, result: null,
  reset() { this.shots = []; this.chosen = []; this.template = null; this.result = null; }
};

const LAYERS = ["boot","attract","countdown","choose","templates","processing","result","printed","error"];

export const State = {
  current: "boot",
  idleTimer: null,
  nudgeTimer: null,
  abortShoot: false,

  go(name, opts) {
    opts = opts || {};
    if (!LAYERS.includes(name)) return;
    this.current = name;
    LAYERS.forEach(l => $("#" + l).classList.toggle("on", l === name));

    const wrap = $("#feedWrap");
    wrap.classList.remove("dim", "deep");
    if (["attract"].includes(name)) wrap.classList.add("dim");
    if (["choose","templates","processing","result","printed"].includes(name)) wrap.classList.add("deep");

    $("#strip").classList.toggle("on", name === "countdown");
    $("#guide").classList.toggle("on", Settings.data.showGuide && name === "countdown");
    $("#nudge").classList.remove("on");

    this.resetIdle();
    if (name === "attract" || name === "error" || name === "boot") this.clearIdle();

    if (name === "error") {
      $("#errMsg").textContent = opts.reason
        ? opts.reason + " Check the phone is plugged in and the webcam app is running."
        : "Check the phone is plugged in and the webcam app is running, then try again.";
      $("#errDetail").textContent = opts.detail || "";
    }
    log("state -> " + name);
  },

  clearIdle() {
    clearTimeout(this.idleTimer); clearTimeout(this.nudgeTimer);
    this.idleTimer = this.nudgeTimer = null;
  },

  resetIdle() {
    this.clearIdle();
    if (["attract","boot","error","countdown","processing"].includes(this.current)) return;
    const secs = Settings.data.idleSeconds;
    this.nudgeTimer = setTimeout(() => $("#nudge").classList.add("on"), Math.max(5, secs - 15) * 1000);
    this.idleTimer = setTimeout(() => { log("idle timeout"); endSession(false); }, secs * 1000);
  }
};
