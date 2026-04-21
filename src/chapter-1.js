/**
 * Chapter 1 — Le hash
 * ───────────────────
 * Behaviour for academy/1-le-hash.html. Wires up the live hash
 * demonstration, the "find a hash starting with 00" challenge,
 * and the 3-question quiz. Progression flows through
 * window.TSCAcademy (registered in src/academy.js).
 *
 * Boot-time handshake:
 *   - markChapterStarted(1) once DOM is ready.
 *   - registerChallenge('1.hash-00', ...) for replay.
 *   - After all three quiz answers, if score ≥ 2 AND the challenge
 *     is solved, markChapterDone(1).
 */
(function installChapter1(){
  'use strict';

  if (document.body.dataset.page !== 'chapter') return;

  const $ = id => document.getElementById(id);
  const sha256hex = async s => {
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest('SHA-256', b);
    return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // Hamming distance in bits between two hex strings of equal length.
  function bitDistance(a, b) {
    let d = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
      while (x) { d += x & 1; x >>= 1; }
    }
    return d;
  }

  // ─── Demo : live hash with avalanche highlight ────────────────
  (function installDemo(){
    const input = $('ch1Input');
    const out   = $('ch1Hash');
    const len   = $('ch1Len');
    const diff  = $('ch1Diff');
    const hexD  = $('ch1HexDiff');
    if (!input || !out) return;

    let prevHash = '';

    async function render() {
      const v = input.value;
      const h = v ? await sha256hex(v) : '—'.repeat(32);

      out.innerHTML = h.split('').map((c, i) => {
        const changed = prevHash && prevHash.length === h.length && prevHash[i] !== c;
        return '<span class="hx' + (changed ? ' changed' : '') + '">' + c + '</span>';
      }).join('');

      if (len) len.textContent = new Blob([v]).size + ' o';
      if (prevHash && prevHash.length === h.length) {
        const bd = bitDistance(prevHash, h);
        const hd = Array.from(prevHash).reduce((a, c, i) => a + (c !== h[i] ? 1 : 0), 0);
        if (diff) diff.textContent = bd + ' / 256';
        if (hexD) hexD.textContent = hd + ' / 64';
      }
      prevHash = h;
    }

    let t;
    input.addEventListener('input', () => {
      if (t) clearTimeout(t);
      t = setTimeout(render, 60);
    });
    // Initial render without highlight noise.
    sha256hex(input.value).then(h => {
      prevHash = h;
      out.innerHTML = h.split('').map(c => '<span class="hx">' + c + '</span>').join('');
      if (len) len.textContent = new Blob([input.value]).size + ' o';
    });
  })();

  // ─── Challenge : find a hash starting with 00 ────────────────
  const challengeState = {
    tries: 0,
    solved: false,
    winningInput: null,
    winningHash: null
  };

  (function installChallenge(){
    const input    = $('ch1ChallInput');
    const submit   = $('ch1ChallSubmit');
    const hashEl   = $('ch1ChallHash');
    const fb       = $('ch1ChallFeedback');
    const status   = $('ch1ChallStatus');
    const triesEl  = $('ch1ChallTries');
    if (!input || !submit) return;

    // Restore previous solution if user already validated the challenge
    try {
      const ac = window.TSCAcademy && window.TSCAcademy.state;
      const solved = ac && ac.chapters && ac.chapters[1] && ac.chapters[1].challengesSolved.includes('1.hash-00');
      if (solved) {
        status.textContent = 'RÉUSSI';
        status.classList.add('ok');
        challengeState.solved = true;
        fb.classList.add('on', 'ch-chall__feedback--ok');
        fb.innerHTML = '<strong>✓ Défi déjà validé lors d\'une session précédente.</strong> Tu peux retenter autant que tu veux, mais le chapitre est déjà crédité.';
      }
    } catch (_) {}

    async function attempt() {
      const v = input.value.trim();
      if (!v) return;
      challengeState.tries++;
      triesEl.textContent = challengeState.tries;
      const h = await sha256hex(v);
      const match = h.startsWith('00');

      const highlight = '<span class="' + (match ? 'need' : '') + '">' + h.slice(0, 2) + '</span>' + h.slice(2);
      hashEl.innerHTML = '0x' + highlight;

      fb.classList.remove('ch-chall__feedback--ok', 'ch-chall__feedback--ko');
      fb.classList.add('on');
      if (match) {
        fb.classList.add('ch-chall__feedback--ok');
        fb.innerHTML = '<strong>✓ Bravo !</strong> Le hash de « ' + escapeHtml(v) + ' » commence par <code>00</code>. Tu viens de miner à difficulté 2. À difficulté réelle Bitcoin (19 zéros), il faudrait des milliards de milliards d\'essais.';
        status.textContent = 'RÉUSSI';
        status.classList.remove('ko');
        status.classList.add('ok');
        challengeState.solved = true;
        challengeState.winningInput = v;
        challengeState.winningHash = h;
        if (window.TSCAcademy) {
          const res = await window.TSCAcademy.runChallenge('1.hash-00', { input: v, hash: h });
          if (res && res.ok && window.TSCUi) {
            window.TSCUi.toast('Défi réussi en ' + challengeState.tries + ' tentatives ✓', { level: 'success' });
          }
        }
        tryCompleteChapter();
      } else {
        fb.classList.add('ch-chall__feedback--ko');
        const hint = challengeState.tries < 5
          ? 'Essaie des mots variés. Avec 2 zéros, ça arrive environ 1 fois sur 256.'
          : challengeState.tries < 20
          ? 'Astuce : ajoute un numéro à la fin d\'un mot (ex. « tesseract1 », « tesseract2 »…). En moyenne 1 réussite sur 256 essais.'
          : 'Tu approches statistiquement. Si tu n\'as toujours pas trouvé après 100 essais, c\'est que la chance n\'est vraiment pas avec toi ce soir.';
        fb.innerHTML = '<strong>Pas encore.</strong> ' + hint;
        status.textContent = 'EN COURS';
        status.classList.add('ko');
      }
    }

    submit.addEventListener('click', attempt);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  })();

  // ─── Quiz : 3 questions ──────────────────────────────────────
  const quizState = { answered: 0, score: 0, total: 3 };

  (function installQuiz(){
    const questions = document.querySelectorAll('.ch-q');
    const scoreEl   = $('ch1QuizScore');
    const scoreN    = $('ch1QuizN');
    const scoreMsg  = $('ch1QuizMsg');

    questions.forEach(q => {
      const correct = parseInt(q.dataset.correct, 10);
      const opts = q.querySelectorAll('.ch-q__opt');
      const feedback = q.querySelector('.ch-q__feedback');
      opts.forEach(btn => {
        btn.addEventListener('click', () => {
          if (q.dataset.done) return;
          q.dataset.done = '1';
          const chosen = parseInt(btn.dataset.opt, 10);
          const ok = chosen === correct;
          btn.setAttribute('data-answered', ok ? 'ok' : 'ko');
          if (!ok) {
            // also highlight the correct one
            const correctBtn = q.querySelector('.ch-q__opt[data-opt="' + correct + '"]');
            if (correctBtn) correctBtn.setAttribute('data-answered', 'right');
          }
          opts.forEach(o => { if (!o.hasAttribute('data-answered')) o.disabled = true; });
          if (feedback) feedback.classList.add('on');
          quizState.answered++;
          if (ok) quizState.score++;
          if (quizState.answered === quizState.total) finishQuiz();
        });
      });
    });

    function finishQuiz() {
      const n = quizState.score;
      scoreN.textContent = n;
      scoreMsg.textContent = n === 3 ? 'Parfait — tu as tout compris.'
                            : n === 2 ? 'Bon score — chapitre validé.'
                            : n === 1 ? 'Relis la section « Raconter » et refais le quiz.'
                                      : 'Prends le temps de relire tranquillement, puis recommence.';
      scoreEl.classList.add('on');
      if (window.TSCAcademy) window.TSCAcademy.setQuizScore(1, n);
      if (n >= 2) tryCompleteChapter();
    }
  })();

  // ─── Chapter completion ──────────────────────────────────────
  function tryCompleteChapter(){
    if (!challengeState.solved) return;
    if (quizState.answered < quizState.total || quizState.score < 2) return;
    if (window.TSCAcademy) window.TSCAcademy.markChapterDone(1);
  }

  // ─── Boot ────────────────────────────────────────────────────
  function boot(){
    if (window.TSCAcademy) window.TSCAcademy.markChapterStarted(1);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // ─── Register challenge so TSCAcademy can validate replays ───
  if (window.TSCAcademy) {
    window.TSCAcademy.registerChallenge({
      id: '1.hash-00',
      chapter: 1,
      validate: async ({ input, hash }) => {
        if (!input || !hash) return { ok: false, hint: 'Entrée manquante.' };
        const h = await sha256hex(input);
        if (h !== hash) return { ok: false, hint: 'Hash incohérent avec l\'entrée.' };
        if (!h.startsWith('00')) return { ok: false, hint: 'Le hash ne commence pas par 00.' };
        return { ok: true };
      }
    });
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  }
})();
