/**
 * Chapter 2 — Le bloc
 * ───────────────────
 * Interactive 4-block chain where the learner can tamper with block
 * #001, watch the cascade invalidate subsequent blocks, and "repair"
 * each maillon one at a time by propagating its hash. Challenge is
 * validated once the whole chain is valid again AFTER the learner
 * has actually modified block #001.
 */
(function installChapter2(){
  'use strict';

  if (document.body.dataset.page !== 'chapter') return;
  const chainEl = document.getElementById('ch2Chain');
  if (!chainEl) return;

  const $ = id => document.getElementById(id);
  const sha = async s => {
    const b = new TextEncoder().encode(s);
    const h = await crypto.subtle.digest('SHA-256', b);
    return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const INITIAL_DATA = [
    'Genesis — TESSERACT.CHAIN 3 janvier 2026',
    'Alice → Bob : 10 TSC',
    'Bob → Carol : 3 TSC',
    'Carol → Dave : 1 TSC'
  ];

  // blocks[i] = { index, data, prev, hash, originalData, valid, stale }
  // `stale` means: the block's hash is outdated relative to current data/prev.
  let blocks = [];
  let userTampered = false;
  let propagatedCount = 0;

  // ───── Initial chain build ─────────────────────────────────────
  async function buildInitial(){
    blocks = [];
    let prev = '0'.repeat(64);
    for (let i = 0; i < INITIAL_DATA.length; i++) {
      const data = INITIAL_DATA[i];
      const hash = await sha(`${i}|${data}|${prev}`);
      blocks.push({
        index: i,
        data: data,
        originalData: data,
        prev: prev,
        hash: hash,
        stale: false
      });
      prev = hash;
    }
    render();
  }

  // ───── Rendering ───────────────────────────────────────────────
  function blockStatus(b, i){
    const expectedPrev = i === 0 ? '0'.repeat(64) : blocks[i-1].hash;
    const prevOk = b.prev === expectedPrev;
    const hashOk = !b.stale; // stale means hash doesn't match current data/prev
    return {
      prevOk,
      hashOk,
      valid: prevOk && hashOk
    };
  }

  function render(){
    chainEl.innerHTML = '';
    blocks.forEach((b, i) => {
      const status = blockStatus(b, i);
      const cls = 'ch2-blk'
        + (i === 1 ? ' source' : '')
        + (!status.valid && i !== 1 ? ' invalid' : '')
        + (!status.valid && i === 1 && b.stale ? ' invalid' : '');
      const statusLabel = !status.valid
        ? '✗ INVALIDE'
        : (i === 1 ? '✎ MODIFIABLE' : '✓ VALIDE');

      const card = document.createElement('div');
      card.className = cls;

      // Header
      const header = document.createElement('div');
      header.className = 'ch2-blk__h';
      header.innerHTML = `<span class="ch2-blk__idx">BLOC #${String(i).padStart(3,'0')}</span><span class="ch2-blk__st">${statusLabel}</span>`;
      card.appendChild(header);

      // Data
      const dataLabel = document.createElement('div');
      dataLabel.className = 'ch2-blk__l';
      dataLabel.textContent = 'Données';
      card.appendChild(dataLabel);

      if (i === 1) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'ch2-blk__edit';
        inp.value = b.data;
        inp.setAttribute('aria-label', 'Données modifiables du bloc #001');
        inp.addEventListener('input', e => onEdit(e.target.value));
        card.appendChild(inp);
      } else {
        const v = document.createElement('div');
        v.className = 'ch2-blk__v';
        v.textContent = b.data;
        card.appendChild(v);
      }

      // Prev hash
      const prevLabel = document.createElement('div');
      prevLabel.className = 'ch2-blk__l';
      prevLabel.textContent = 'Prev (hash du bloc précédent)';
      card.appendChild(prevLabel);
      const prevVal = document.createElement('div');
      prevVal.className = 'ch2-blk__hash';
      if (i === 0) prevVal.textContent = '—  (bloc genèse, pas de prédécesseur)';
      else {
        const expectedPrev = blocks[i-1].hash;
        const ok = b.prev === expectedPrev;
        prevVal.innerHTML = '0x' + b.prev.slice(0, 48) + '…' + (!ok ? ' <span style="color:var(--rd)">✗ ne correspond plus</span>' : '');
      }
      card.appendChild(prevVal);

      // Own hash
      const hashLabel = document.createElement('div');
      hashLabel.className = 'ch2-blk__l';
      hashLabel.textContent = 'Hash du bloc';
      card.appendChild(hashLabel);
      const hashVal = document.createElement('div');
      hashVal.className = 'ch2-blk__hash';
      hashVal.innerHTML = '0x' + b.hash.slice(0, 48) + '…' + (b.stale ? ' <span style="color:var(--rd)">✗ périmé</span>' : '');
      card.appendChild(hashVal);

      // Action
      if (i !== 0) {
        const action = document.createElement('div');
        action.className = 'ch2-blk__action';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ch2-blk__btn primary';
        btn.textContent = '⟲ Propager le hash';
        const needsRepair = !status.valid;
        btn.disabled = !needsRepair;
        btn.setAttribute('data-hover', '');
        btn.addEventListener('click', () => propagate(i));
        action.appendChild(btn);
        if (needsRepair) {
          const warn = document.createElement('span');
          warn.className = 'ch2-blk__warn';
          warn.textContent = '▸ ce bloc doit être recalculé';
          action.appendChild(warn);
        }
        card.appendChild(action);
      }

      chainEl.appendChild(card);
    });

    updateChallengeUI();
  }

  // ───── Interactions ────────────────────────────────────────────
  function onEdit(newData){
    blocks[1].data = newData;
    blocks[1].stale = true;
    // block #001's hash is now stale, so #002 and #003 (which contain
    // the OLD #001 hash in their .prev) are also effectively invalid.
    render();
    if (newData !== blocks[1].originalData && !userTampered) {
      userTampered = true;
      propagatedCount = 0;
    }
    tryComplete();
  }

  async function propagate(i){
    const b = blocks[i];
    if (i > 0) b.prev = blocks[i-1].hash;
    b.hash = await sha(`${i}|${b.data}|${b.prev}`);
    b.stale = false;
    // After propagating #i, #i+1 still holds the OLD hash of #i in
    // its .prev. We don't auto-update it — the learner has to hit
    // "propager" on it themselves. That's the whole point.
    propagatedCount++;
    render();
    tryComplete();
  }

  // ───── Challenge flow ──────────────────────────────────────────
  function allValid(){
    return blocks.every((b, i) => blockStatus(b, i).valid);
  }

  function updateChallengeUI(){
    const validCount = blocks.filter((b, i) => blockStatus(b, i).valid).length;
    const countEl = document.getElementById('ch2Valid');
    const guide = document.getElementById('ch2Guide');
    const status = document.getElementById('ch2ChallStatus');
    if (countEl) countEl.textContent = validCount;
    if (guide) {
      if (!userTampered) guide.textContent = 'Modifie d\'abord le bloc #001 pour démarrer';
      else if (!allValid()) guide.textContent = 'Propage les hashes jusqu\'au dernier bloc';
      else guide.textContent = 'Chaîne cohérente ✓';
    }
    if (status) {
      if (allValid() && userTampered) {
        status.textContent = 'RÉUSSI';
        status.classList.remove('ko');
        status.classList.add('ok');
      } else if (userTampered) {
        status.textContent = 'EN COURS';
        status.classList.add('ko');
        status.classList.remove('ok');
      }
    }
  }

  let challengeFired = false;
  async function tryComplete(){
    if (challengeFired) return;
    if (!userTampered || !allValid() || propagatedCount < 3) return;
    challengeFired = true;
    const fb = document.getElementById('ch2ChallFeedback');
    if (fb) {
      fb.classList.remove('ch-chall__feedback--ko');
      fb.classList.add('on', 'ch-chall__feedback--ok');
      fb.innerHTML = '<strong>✓ Chaîne restaurée.</strong> Tu as propagé trois hashes pour réparer une seule modification. Imagine répéter cela sur 50 000 blocs pendant que 10 000 machines honnêtes en ajoutent de nouveaux à chaque seconde.';
    }
    if (window.TSCAcademy) {
      await window.TSCAcademy.runChallenge('2.repair-chain', { propagated: propagatedCount });
      if (window.TSCUi) window.TSCUi.toast('Chaîne réparée ✓', { level: 'success' });
    }
    tryFinish();
  }

  // Register challenge validator
  if (window.TSCAcademy) {
    window.TSCAcademy.registerChallenge({
      id: '2.repair-chain',
      chapter: 2,
      validate: async ({ propagated }) => {
        if (!propagated || propagated < 3) return { ok: false, hint: 'Il faut propager les trois blocs.' };
        return { ok: true };
      }
    });
  }

  // ───── Quiz (same pattern as chapter 1) ───────────────────────
  const quizState = { answered: 0, score: 0, total: 3 };

  (function installQuiz(){
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
  })();

  function finishQuiz(){
    const n = quizState.score;
    const scoreEl = $('ch2QuizScore');
    $('ch2QuizN').textContent = n;
    $('ch2QuizMsg').textContent = n === 3 ? 'Parfait — tu as tout compris.'
                                : n === 2 ? 'Bon score — chapitre validé.'
                                : n === 1 ? 'Relis la section « Raconter » et refais le quiz.'
                                          : 'Prends le temps de relire tranquillement, puis recommence.';
    scoreEl.classList.add('on');
    if (window.TSCAcademy) window.TSCAcademy.setQuizScore(2, n);
    tryFinish();
  }

  function tryFinish(){
    if (!challengeFired) return;
    if (quizState.answered < quizState.total || quizState.score < 2) return;
    if (window.TSCAcademy) window.TSCAcademy.markChapterDone(2);
  }

  // ───── Boot ────────────────────────────────────────────────────
  function boot(){
    if (window.TSCAcademy) window.TSCAcademy.markChapterStarted(2);
    buildInitial();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
