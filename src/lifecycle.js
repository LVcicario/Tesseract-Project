/**
 * Lifecycle registry
 * ──────────────────
 * Tracks every long-lived timer (setInterval) and animation frame
 * (requestAnimationFrame) so they can be cancelled in one sweep on
 * `beforeunload` / `pagehide`. This prevents memory leaks from timers
 * and render loops that would otherwise survive the page lifecycle
 * (e.g. when the tab is placed in bfcache).
 *
 * Implementation strategy
 * ───────────────────────
 * Monkey-patches the four global functions (`setInterval`,
 * `clearInterval`, `requestAnimationFrame`, `cancelAnimationFrame`)
 * so existing code requires no change. Every timer/frame created
 * after this file loads is tracked; manual clears still work as
 * expected because we de-register on clear.
 *
 * Load order: this file MUST run before `core.js` and
 * `extensions.js`, otherwise the intervals they create at module-
 * evaluation time escape tracking.
 *
 * Exposed on `window.TSCLifecycle` for debugging:
 *   - `intervals` : Set<intervalId>
 *   - `rafs`      : Set<rafId>
 *   - `cleanup()` : cancel everything right now
 */
(function installLifecycleRegistry(){
  'use strict';

  const origSetInterval = window.setInterval.bind(window);
  const origClearInterval = window.clearInterval.bind(window);
  const origRAF = window.requestAnimationFrame.bind(window);
  const origCAF = window.cancelAnimationFrame.bind(window);

  const intervals = new Set();
  const rafs = new Set();

  window.setInterval = function trackedSetInterval(fn, ms, ...args){
    const id = origSetInterval(fn, ms, ...args);
    intervals.add(id);
    return id;
  };

  window.clearInterval = function trackedClearInterval(id){
    intervals.delete(id);
    return origClearInterval(id);
  };

  window.requestAnimationFrame = function trackedRAF(callback){
    let id;
    id = origRAF(function wrapped(timestamp){
      // Self-deregister before calling user code so re-requesting
      // a frame inside `callback` is tracked as a fresh entry.
      rafs.delete(id);
      callback(timestamp);
    });
    rafs.add(id);
    return id;
  };

  window.cancelAnimationFrame = function trackedCAF(id){
    rafs.delete(id);
    return origCAF(id);
  };

  function cleanup(){
    intervals.forEach(id => origClearInterval(id));
    intervals.clear();
    rafs.forEach(id => origCAF(id));
    rafs.clear();
  }

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);

  window.TSCLifecycle = Object.freeze({
    get intervals(){ return intervals; },
    get rafs(){ return rafs; },
    cleanup
  });
})();
