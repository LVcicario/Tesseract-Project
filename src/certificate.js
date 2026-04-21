/**
 * Academy completion certificate
 * ──────────────────────────────
 * When all six chapters are completed, reveals the finale section
 * on academy.html and generates a shareable SVG certificate built
 * deterministically from the learner's progress state.
 *
 * The certificate contains:
 *   - the learner's display name (optional) or wallet address
 *   - wallet address (truncated)
 *   - completion date
 *   - a short fingerprint derived from the progress state
 *   - the six chapter medals
 *
 * The SVG is assembled as a template literal, injected into the
 * preview pane, and downloaded as a Blob on click. No canvas, no
 * PNG conversion — SVG is shareable, scalable and crisp.
 */
(function installCertificate(){
  'use strict';
  if (document.body.dataset.page !== 'academy') return;

  const $ = id => document.getElementById(id);
  const finale = $('ay-finale');
  if (!finale) return;

  const CHAPTERS = [
    { n: 1, title: 'Le hash', c: '#00f0ff' },
    { n: 2, title: 'Le bloc', c: '#ff00d4' },
    { n: 3, title: 'La course au nonce', c: '#8b5cf6' },
    { n: 4, title: 'Les identités', c: '#ffcc3d' },
    { n: 5, title: 'Le consensus', c: '#00ff88' },
    { n: 6, title: 'Les programmes', c: '#ff2244' }
  ];

  let fingerprint = '';
  let completionDate = null;

  async function sha(s){
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest('SHA-256', b);
    return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2,'0')).join('');
  }

  function escape(s){
    return String(s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
    );
  }

  function getWalletAddr(){
    try {
      const raw = localStorage.getItem('tsc.wallet.v1');
      if (!raw) return '0x—';
      return JSON.parse(raw).addr || '0x—';
    } catch (_) { return '0x—'; }
  }

  function buildSvg(name, addr, date, fp){
    const shortAddr = addr.length > 18 ? addr.slice(0, 10) + '…' + addr.slice(-6) : addr;
    const displayName = (name || '').trim();
    const finalName = displayName || shortAddr;
    const medals = CHAPTERS.map((ch, i) => {
      const x = 80 + i * 166;
      return `
    <g transform="translate(${x}, 660)">
      <circle cx="40" cy="40" r="34" fill="none" stroke="${ch.c}" stroke-width="1.4"/>
      <circle cx="40" cy="40" r="28" fill="${ch.c}" opacity="0.08"/>
      <text x="40" y="36" text-anchor="middle" font-family="Impact, sans-serif" font-size="24" font-weight="900" fill="${ch.c}">${ch.n}</text>
      <text x="40" y="54" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" fill="#a6aecc" letter-spacing="1.5">VALIDÉ</text>
      <text x="40" y="100" text-anchor="middle" font-family="ui-sans-serif, sans-serif" font-size="10" fill="#5a6488">${escape(ch.title)}</text>
    </g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#0a1330"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffedae"/>
      <stop offset="50%" stop-color="#ffcc3d"/>
      <stop offset="100%" stop-color="#c48a00"/>
    </linearGradient>
    <linearGradient id="cy" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#00f0ff"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#8b5cf6" stroke-opacity="0.06"/>
    </pattern>
  </defs>

  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="url(#grid)"/>

  <!-- Frame -->
  <rect x="30" y="30" width="1140" height="740" fill="none" stroke="#00f0ff" stroke-width="1" opacity="0.5"/>
  <rect x="42" y="42" width="1116" height="716" fill="none" stroke="#ff00d4" stroke-width="1" opacity="0.4"/>

  <!-- Tesseract decoration -->
  <g transform="translate(1050, 130)" fill="none" stroke="#00f0ff" stroke-width="1.3" opacity="0.7" filter="url(#glow)">
    <rect x="-60" y="-60" width="120" height="120"/>
    <rect x="-30" y="-30" width="120" height="120" stroke="#ff00d4"/>
    <line x1="-60" y1="-60" x2="-30" y2="-30" stroke="#8b5cf6"/>
    <line x1="60" y1="-60" x2="90" y2="-30" stroke="#8b5cf6"/>
    <line x1="-60" y1="60" x2="-30" y2="90" stroke="#8b5cf6"/>
    <line x1="60" y1="60" x2="90" y2="90" stroke="#8b5cf6"/>
  </g>

  <!-- Header kicker -->
  <text x="80" y="95" font-family="ui-monospace, monospace" font-size="13" fill="#ffcc3d" letter-spacing="6">
    ◆ CERTIFICAT · PARCOURS COMPLET · 6 / 6 CHAPITRES
  </text>

  <!-- Title -->
  <g font-family="Impact, sans-serif" fill="url(#gold)" filter="url(#glow)">
    <text x="80" y="210" font-size="92" font-weight="900" letter-spacing="-2">TESSERACT</text>
    <text x="80" y="300" font-size="92" font-weight="900" letter-spacing="-2">.CHAIN</text>
  </g>
  <text x="80" y="342" font-family="ui-sans-serif, sans-serif" font-size="26" fill="#e8ecff" font-weight="300">
    Académie de blockchain — Diplôme honorifique
  </text>

  <!-- Recipient block -->
  <rect x="60" y="395" width="1080" height="180" fill="#000000" opacity="0.4" stroke="#00f0ff" stroke-width="1"/>

  <text x="90" y="430" font-family="ui-monospace, monospace" font-size="11" fill="#5a6488" letter-spacing="4">
    CERTIFIE QUE
  </text>
  <text x="90" y="485" font-family="Impact, sans-serif" font-size="46" font-weight="900" fill="url(#cy)" letter-spacing="-1">${escape(finalName)}</text>
  <text x="90" y="525" font-family="ui-sans-serif, sans-serif" font-size="18" fill="#a6aecc" font-weight="300">
    a complété l'intégralité du parcours pédagogique et validé ses six défis.
  </text>

  <!-- Metadata columns -->
  <g font-family="ui-monospace, monospace" font-size="11" fill="#a6aecc">
    <text x="90" y="561" fill="#5a6488" letter-spacing="3">ADRESSE</text>
    <text x="210" y="561" fill="#00f0ff">${escape(shortAddr)}</text>
    <text x="510" y="561" fill="#5a6488" letter-spacing="3">DATE</text>
    <text x="600" y="561" fill="#e8ecff">${escape(date)}</text>
    <text x="830" y="561" fill="#5a6488" letter-spacing="3">EMPREINTE</text>
    <text x="960" y="561" fill="#ff00d4">0x${escape(fp.slice(0, 16))}…</text>
  </g>

  <!-- Medal strip label -->
  <text x="80" y="635" font-family="ui-monospace, monospace" font-size="11" fill="#5a6488" letter-spacing="4">
    ◆ DÉFIS VALIDÉS
  </text>

  ${medals}

  <!-- Footer -->
  <line x1="80" y1="760" x2="1120" y2="760" stroke="#8b5cf6" stroke-opacity="0.3"/>
  <text x="80" y="780" font-family="ui-monospace, monospace" font-size="10" fill="#5a6488" letter-spacing="2">
    ◆ CERTIFICAT GÉNÉRÉ LOCALEMENT · AUCUN SERVEUR CONSULTÉ · MIT · GITHUB.COM/LVCICARIO/TESSERACT-PROJECT
  </text>
</svg>`;
  }

  async function render(){
    const name = $('finaleName').value;
    const addr = getWalletAddr();
    const date = completionDate || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const svg = buildSvg(name, addr, date, fingerprint);
    $('finalePreview').innerHTML = svg;
  }

  function download(){
    const svg = buildSvg($('finaleName').value, getWalletAddr(), completionDate || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), fingerprint);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tesseract-chain-certificat.svg';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    if (window.TSCUi) window.TSCUi.toast('Certificat téléchargé', { level: 'success' });
  }

  function share(){
    const name = $('finaleName').value.trim();
    const who = name ? name : 'moi';
    const msg = `Je viens de compléter les 6 chapitres de l'Académie TESSERACT.CHAIN — blockchain de A à Z, sans compte, sans serveur. ${who} certifié 🎓 ◆`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(location.href)}`;
    window.open(url, '_blank', 'noopener');
  }

  async function copyFingerprint(){
    try {
      await navigator.clipboard.writeText('0x' + fingerprint);
      if (window.TSCUi) window.TSCUi.toast('Empreinte copiée', { level: 'success' });
    } catch (_) {
      if (window.TSCUi) window.TSCUi.toast('Copie impossible sur ce navigateur', { level: 'warn' });
    }
  }

  async function maybeShowFinale(state){
    const chapters = state && state.chapters ? state.chapters : {};
    const completedCount = Object.values(chapters).filter(c => c && c.completed).length;
    const isDone = completedCount >= 6;
    finale.classList.toggle('on', isDone);
    if (!isDone) return;

    // Deterministic fingerprint based on wallet address + chapter completion times
    const addr = getWalletAddr();
    const chunk = [1,2,3,4,5,6].map(n => {
      const c = chapters[n];
      return n + ':' + (c && c.completedAt ? c.completedAt : '-') + ':' + (c && c.quizScore ? c.quizScore : 0);
    }).join('|');
    fingerprint = await sha(addr + '|' + chunk);

    // Use the latest completedAt as the completion date
    const dates = Object.values(chapters).map(c => c && c.completedAt).filter(Boolean);
    if (dates.length) {
      const max = Math.max(...dates);
      completionDate = new Date(max).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    render();
  }

  function wire(){
    $('finaleName').addEventListener('input', render);
    $('finaleDownload').addEventListener('click', download);
    $('finaleShare').addEventListener('click', share);
    $('finaleCopy').addEventListener('click', copyFingerprint);
  }

  function boot(){
    wire();
    if (window.TSCAcademy) {
      maybeShowFinale(window.TSCAcademy.state);
      window.TSCAcademy.onChange(maybeShowFinale);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
