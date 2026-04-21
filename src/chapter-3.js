/**
 * Chapter 3 — La course au nonce
 * ──────────────────────────────
 * Mini-mineur didactique embarqué sur la page du chapitre. Permet de
 * choisir la difficulté (3/4/5 zéros), lance une vraie recherche de
 * nonce via Web Crypto SHA-256, affiche un journal live. Le défi se
 * valide sur tout minage réussi à difficulté ≥ 4.
 */
(function installChapter3(){
  'use strict';
  if (document.body.dataset.page !== 'chapter') return;
  if (!document.getElementById('ch3Go')) return;

  const $ = id => document.getElementById(id);
  const sha = async s => {
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest('SHA-256', b);
    return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // ───── Difficulty picker ─────────────────────────────────────
  let currentDifficulty = 4;
  const DIFF_META = {
    3: { expected: 4096,    time: '≈ < 1 s'   },
    4: { expected: 65536,   time: '≈ 3–8 s'   },
    5: { expected: 1048576, time: '≈ 1–5 min' }
  };

  function updateDiffLabels(){
    const meta = DIFF_META[currentDifficulty];
    $('ch3DiffLabel').textContent = '0'.repeat(currentDifficulty);
    $('ch3ExpLabel').textContent = '~' + meta.expected.toLocaleString('fr-FR');
    $('ch3TimeLabel').textContent = meta.time;
  }

  document.querySelectorAll('.ch3-mine__diff button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (mining) return;
      document.querySelectorAll('.ch3-mine__diff button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      currentDifficulty = parseInt(btn.dataset.diff, 10);
      updateDiffLabels();
    });
  });
  updateDiffLabels();

  // ───── Mining loop ───────────────────────────────────────────
  const logEl = $('ch3Log');
  const goBtn = $('ch3Go');
  let mining = false;

  function log(html, cls){
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
    while (logEl.children.length > 60) logEl.removeChild(logEl.firstChild);
  }

  function yieldToMain(){
    if (window.scheduler && window.scheduler.yield) return window.scheduler.yield();
    return new Promise(r => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => r();
      ch.port2.postMessage(0);
    });
  }

  async function mine(){
    if (mining) return;
    mining = true;
    goBtn.disabled = true;
    goBtn.textContent = '⧫ MINAGE EN COURS…';

    const diff = currentDifficulty;
    const target = '0'.repeat(diff);
    const base = `CH3|acad|${diff}|${Math.floor(Math.random() * 1e9)}|${Date.now()}`;
    log(`<span class="info">▸ nouvelle tentative · cible « ${target}… » · base ${base.slice(0, 32)}…</span>`);

    const tStart = performance.now();
    let nonce = 0;
    let lastLog = 0;
    let hash = '';
    const MAX = diff === 5 ? 4_000_000 : 500_000;

    while (nonce < MAX) {
      const chunkStart = performance.now();
      while (performance.now() - chunkStart < 6) {
        hash = await sha(base + '|' + nonce);
        if (hash.startsWith(target)) break;
        nonce++;
      }
      const elapsed = (performance.now() - tStart) / 1000;
      const rate = Math.floor(nonce / elapsed);
      $('ch3Nonce').textContent = nonce.toLocaleString('fr-FR');
      $('ch3Rate').textContent = rate.toLocaleString('fr-FR');
      $('ch3Elapsed').textContent = elapsed.toFixed(2) + ' s';
      if (hash.startsWith(target)) break;
      if (performance.now() - lastLog > 480) {
        lastLog = performance.now();
        log(`nonce=${String(nonce).padStart(7, '0')} hash=0x${hash.slice(0, 18)}…`);
      }
      await yieldToMain();
    }

    mining = false;
    goBtn.disabled = false;

    if (hash.startsWith(target)) {
      const elapsed = ((performance.now() - tStart) / 1000).toFixed(2);
      log('');
      log('<span class="ok">✦ HASH VALIDE TROUVÉ</span>', 'ok');
      log(`<span class="ok">   nonce   = <strong>${nonce.toLocaleString('fr-FR')}</strong></span>`, 'ok');
      log(`<span class="needle">   hash    = 0x${hash}</span>`);
      log(`<span class="ok">   temps   = ${elapsed} s · difficulté = ${diff} zéros</span>`, 'ok');
      goBtn.textContent = '⧫ MINER UN AUTRE BLOC';

      $('ch3BestNonce').textContent = nonce.toLocaleString('fr-FR');
      const guide = $('ch3Guide');
      if (guide) guide.textContent = diff >= 4 ? 'Défi validé · tu peux continuer' : 'Re-tente à difficulté 4 pour valider';
      const status = $('ch3ChallStatus');
      const fb = $('ch3ChallFeedback');

      if (diff >= 4) {
        if (status) { status.textContent = 'RÉUSSI'; status.classList.add('ok'); status.classList.remove('ko'); }
        if (fb) {
          fb.classList.remove('ch-chall__feedback--ko');
          fb.classList.add('on', 'ch-chall__feedback--ok');
          fb.innerHTML = `<strong>✓ Défi réussi.</strong> Tu as miné un bloc à ${diff} zéros en ${nonce.toLocaleString('fr-FR')} essais (${elapsed} s). Bitcoin exige aujourd'hui environ <strong>19 zéros</strong> — à la même vitesse que toi, il faudrait approximativement <strong>${Math.round(Math.pow(16, 19 - diff)).toExponential(1)}</strong> fois plus de temps. Les fermes de minage compensent avec du matériel spécialisé (ASIC) qui tourne des millions de fois plus vite qu'un CPU.`;
        }
        if (window.TSCAcademy) {
          window.TSCAcademy.runChallenge('3.mine-4', { difficulty: diff, nonce, elapsed: parseFloat(elapsed) })
            .then(res => {
              if (res && res.ok && window.TSCUi) {
                window.TSCUi.toast('Défi ✓ · bloc miné à difficulté ' + diff, { level: 'success' });
              }
              tryFinish();
            });
        }
      } else {
        if (status) { status.textContent = 'EN COURS'; status.classList.add('ko'); }
        if (fb) {
          fb.classList.remove('ch-chall__feedback--ok');
          fb.classList.add('on', 'ch-chall__feedback--ko');
          fb.innerHTML = '<strong>Presque.</strong> Tu as miné à 3 zéros — le défi exige au moins 4. Relance avec la difficulté 4.';
        }
      }
    } else {
      log('<span style="color:var(--rd)">⚠ abandon après ' + MAX.toLocaleString('fr-FR') + ' tentatives.</span>');
      goBtn.textContent = '⧫ RELANCER';
      if (window.TSCUi) window.TSCUi.toast('Minage abandonné — relance-le', { level: 'warn' });
    }
  }

  goBtn.addEventListener('click', mine);

  // Register challenge validator
  if (window.TSCAcademy) {
    window.TSCAcademy.registerChallenge({
      id: '3.mine-4',
      chapter: 3,
      validate: async ({ difficulty, nonce }) => {
        if (!difficulty || difficulty < 4) return { ok: false, hint: 'Difficulté < 4 — mine à 4 zéros ou plus.' };
        if (!nonce || nonce < 1) return { ok: false, hint: 'Aucun nonce.' };
        return { ok: true };
      }
    });
  }

  // Restore solved state on return visits
  try {
    const ac = window.TSCAcademy && window.TSCAcademy.state;
    if (ac && ac.chapters && ac.chapters[3] && ac.chapters[3].challengesSolved.includes('3.mine-4')) {
      const fb = $('ch3ChallFeedback');
      const status = $('ch3ChallStatus');
      if (status) { status.textContent = 'RÉUSSI'; status.classList.add('ok'); }
      if (fb) {
        fb.classList.add('on', 'ch-chall__feedback--ok');
        fb.innerHTML = '<strong>✓ Défi déjà validé.</strong> Tu peux relancer le minage à n\'importe quelle difficulté pour t\'entraîner.';
      }
    }
  } catch (_) {}

  // ───── Quiz ──────────────────────────────────────────────────
  const quizState = { answered: 0, score: 0, total: 3 };

  document.querySelectorAll('.ch-q').forEach(q => {
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
          const right = q.querySelector('.ch-q__opt[data-opt="' + correct + '"]');
          if (right) right.setAttribute('data-answered', 'right');
        }
        opts.forEach(o => { if (!o.hasAttribute('data-answered')) o.disabled = true; });
        if (feedback) feedback.classList.add('on');
        quizState.answered++;
        if (ok) quizState.score++;
        if (quizState.answered === quizState.total) finishQuiz();
      });
    });
  });

  function finishQuiz(){
    const n = quizState.score;
    const scoreEl = $('ch3QuizScore');
    $('ch3QuizN').textContent = n;
    $('ch3QuizMsg').textContent = n === 3 ? 'Parfait — tu as tout compris.'
                                : n === 2 ? 'Bon score — chapitre validé.'
                                : n === 1 ? 'Relis la section « Raconter » et refais le quiz.'
                                          : 'Prends le temps de relire tranquillement, puis recommence.';
    scoreEl.classList.add('on');
    if (window.TSCAcademy) window.TSCAcademy.setQuizScore(3, n);
    tryFinish();
  }

  function tryFinish(){
    const ac = window.TSCAcademy && window.TSCAcademy.state;
    const ch = ac && ac.chapters && ac.chapters[3];
    if (!ch) return;
    const challengeDone = ch.challengesSolved.includes('3.mine-4');
    if (quizState.answered < quizState.total || quizState.score < 2) return;
    if (!challengeDone) return;
    if (window.TSCAcademy) window.TSCAcademy.markChapterDone(3);
  }

  // Start chapter
  function boot(){
    if (window.TSCAcademy) window.TSCAcademy.markChapterStarted(3);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
