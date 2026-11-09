/**
 * timer.js — Shared countdown timer component
 * Party Hub shared module
 */

import { EventBus } from '../core/event-bus.js';

/**
 * CountdownTimer — manages a countdown and emits tick/done events.
 *
 * Usage:
 *   const timer = new CountdownTimer(30, (remaining, pct) => { ... }, () => { ... });
 *   timer.start();
 *   timer.stop();
 *   timer.reset(30);
 */
export class CountdownTimer {
  /**
   * @param {number} durationSeconds - Total duration in seconds
   * @param {Function} onTick - Called each second: (remaining, percent) => void
   * @param {Function} onDone - Called when timer reaches 0
   */
  constructor(durationSeconds, onTick, onDone) {
    this._duration = durationSeconds;
    this._remaining = durationSeconds;
    this._onTick = onTick;
    this._onDone = onDone;
    this._intervalId = null;
    this._startedAt = null;
  }

  start() {
    if (this._intervalId) this.stop();
    this._startedAt = Date.now();
    this._remaining = this._duration;

    this._intervalId = setInterval(() => {
      this._remaining = Math.max(0, this._duration - Math.floor((Date.now() - this._startedAt) / 1000));
      const percent = this._duration > 0 ? (this._remaining / this._duration) * 100 : 0;

      if (this._onTick) {
        try { this._onTick(this._remaining, percent); } catch {}
      }

      if (this._remaining <= 0) {
        this.stop();
        if (this._onDone) {
          try { this._onDone(); } catch {}
        }
      }
    }, 1000);

    // Immediately tick once
    if (this._onTick) {
      try { this._onTick(this._remaining, 100); } catch {}
    }
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  reset(newDuration) {
    this.stop();
    this._duration = newDuration ?? this._duration;
    this._remaining = this._duration;
    this._startedAt = null;
  }

  getRemaining() {
    return this._remaining;
  }

  isRunning() {
    return this._intervalId !== null;
  }
}

/**
 * Render a timer bar + number display.
 * @param {HTMLElement} container
 * @param {number} remaining
 * @param {number} total
 */
export function renderTimerBar(container, remaining, total) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const isUrgent = remaining <= 10;

  container.innerHTML = `
    <div class="timer-display">
      <span class="timer-value${isUrgent ? ' urgent' : ''}">${remaining}</span>
      <span class="timer-label">seconds</span>
    </div>
    <div class="progress-bar timer-bar">
      <div class="progress-fill${isUrgent ? ' progress-fill-red' : ''}" style="width: ${pct}%"></div>
    </div>
  `;
}
