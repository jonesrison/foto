import { $, log, sleep } from "./utils.js";
import { Stats, Settings } from "./settings.js";

export const Printer = {
  get endpoint() {
    return Settings.data.backendIp ? `http://${Settings.data.backendIp}/print` : null;
  },
  queue: [],
  busy: false,

  enqueue(dataUrl, meta) {
    this.queue.push({ dataUrl, meta, tries: 0 });
    this.paintQueue();
    this._drain();
  },

  async _drain() {
    if (this.busy || !this.queue.length) return;
    this.busy = true;
    const job = this.queue[0];
    try {
      await this.send(job.dataUrl, job.meta);
      this.queue.shift();
      Stats.bump("prints");
      log("printed job ok, " + this.queue.length + " left in queue");
    } catch (e) {
      job.tries++;
      log("print failed (try " + job.tries + "): " + e.message);
      if (job.tries >= 3) { this.queue.shift(); Stats.bump("fails"); log("job dropped after 3 tries"); }
      await sleep(2500);
    } finally {
      this.busy = false;
      this.paintQueue();
      if (this.queue.length) this._drain();
    }
  },

  async send(dataUrl, meta) {
    if (this.endpoint) {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, copies: 1, meta })
      });
      if (!res.ok) throw new Error("Print service returned " + res.status);
      return;
    }
    log("no print endpoint set — job simulated");
    await sleep(600);
  },

  paintQueue() {
    const b = $("#queueBadge");
    const n = this.queue.length;
    b.classList.toggle("on", n > 0);
    b.textContent = n === 1 ? "1 print queued" : n + " prints queued";
  }
};
