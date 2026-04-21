/**
 * UI primitives — shared components used across the extension layer.
 * ──────────────────────────────────────────────────────────────────
 * Keeps simple, DA-coherent building blocks (toast notifications,
 * modal dialog) in one place so every feature uses the same visual
 * language instead of ad-hoc alert()/confirm() popups.
 *
 * Exposed on `window.TSCUi`:
 *   toast(message, { level, duration })
 *     level    : 'info' | 'success' | 'warn' | 'error'   (default 'info')
 *     duration : milliseconds before auto-dismiss        (default 4200)
 *
 *   modal({ title, body, actions })
 *     title    : string (displayed in header)
 *     body     : HTML string or HTMLElement
 *     actions  : array of { label, kind, onClick }; kind ∈ {primary,ghost}
 *     returns  : a close() function the caller can invoke manually
 */
(function installUiPrimitives(){
  'use strict';

  // ───── DOM scaffold ──────────────────────────────────────────────
  function ensureToastContainer(){
    let c = document.getElementById('tsc-toasts');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'tsc-toasts';
    c.setAttribute('role', 'region');
    c.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(c);
    return c;
  }

  // ───── Toast ─────────────────────────────────────────────────────
  function toast(message, opts){
    opts = opts || {};
    const level = opts.level || 'info';
    const duration = opts.duration != null ? opts.duration : 4200;

    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'tsc-toast tsc-toast--' + level;
    el.setAttribute('role', level === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-live', level === 'error' ? 'assertive' : 'polite');

    const icon = { info:'◆', success:'✓', warn:'⚠', error:'✕' }[level] || '◆';
    el.innerHTML =
      '<span class="tsc-toast__icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="tsc-toast__msg"></span>' +
      '<button class="tsc-toast__close" aria-label="Fermer">✕</button>';
    el.querySelector('.tsc-toast__msg').textContent = message;

    const close = () => {
      el.classList.add('tsc-toast--leaving');
      setTimeout(() => el.remove(), 260);
    };
    el.querySelector('.tsc-toast__close').addEventListener('click', close);
    container.appendChild(el);

    if (duration > 0) setTimeout(close, duration);
    return close;
  }

  // ───── Modal ─────────────────────────────────────────────────────
  let openModalClose = null;

  function modal(config){
    config = config || {};
    if (openModalClose) openModalClose();

    const overlay = document.createElement('div');
    overlay.className = 'tsc-modal__overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (config.title) overlay.setAttribute('aria-label', config.title);

    const dialog = document.createElement('div');
    dialog.className = 'tsc-modal__dialog';

    const header = document.createElement('div');
    header.className = 'tsc-modal__header';
    header.innerHTML =
      '<h2 class="tsc-modal__title"></h2>' +
      '<button class="tsc-modal__close" aria-label="Fermer">✕</button>';
    header.querySelector('.tsc-modal__title').textContent = config.title || '';
    dialog.appendChild(header);

    const body = document.createElement('div');
    body.className = 'tsc-modal__body';
    if (config.body instanceof HTMLElement) body.appendChild(config.body);
    else body.innerHTML = config.body || '';
    dialog.appendChild(body);

    if (Array.isArray(config.actions) && config.actions.length){
      const footer = document.createElement('div');
      footer.className = 'tsc-modal__footer';
      config.actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'tsc-modal__btn tsc-modal__btn--' + (action.kind || 'ghost');
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          try { if (action.onClick) action.onClick(close); }
          finally { if (action.closeOnClick !== false) close(); }
        });
        footer.appendChild(btn);
      });
      dialog.appendChild(footer);
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus trap: remember what had focus, move focus inside, trap Tab.
    const previouslyFocused = document.activeElement;
    const focusables = () => Array.from(dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    const first = focusables()[0];
    if (first) first.focus();

    function onKeydown(e){
      if (e.key === 'Escape'){ e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const firstEl = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl){ e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl){ e.preventDefault(); firstEl.focus(); }
    }
    overlay.addEventListener('keydown', onKeydown);
    header.querySelector('.tsc-modal__close').addEventListener('click', () => close());
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    requestAnimationFrame(() => overlay.classList.add('tsc-modal--in'));

    function close(){
      overlay.classList.remove('tsc-modal--in');
      overlay.classList.add('tsc-modal--leaving');
      setTimeout(() => {
        overlay.remove();
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      }, 220);
      openModalClose = null;
    }
    openModalClose = close;
    return close;
  }

  // ───── Safe localStorage wrapper ─────────────────────────────────
  // Writes transparently, reports back to the caller, and surfaces
  // quota errors to the user via a toast rather than a silent failure.
  function safeSetItem(key, value){
    try {
      localStorage.setItem(key, value);
      return { ok: true };
    } catch (err){
      const name = err && err.name;
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'){
        toast('Stockage local saturé — certaines données n\'ont pas pu être sauvegardées.', { level: 'error', duration: 6000 });
      } else {
        toast('Sauvegarde locale indisponible (' + (name || 'erreur') + ').', { level: 'warn' });
      }
      return { ok: false, error: err };
    }
  }

  window.TSCUi = Object.freeze({ toast, modal, safeSetItem });
})();
