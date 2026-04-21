/**
 * Chapter 6 — Les programmes
 * ──────────────────────────
 * Mini smart-contract VM with a visible gas budget. Learner deploys
 * the Counter contract, calls its methods, watches gas decrement and
 * state evolve. Challenge: push count ≥ 10.
 */
(function installChapter6(){
  'use strict';
  if (document.body.dataset.page !== 'chapter') return;
  if (!document.getElementById('ch6Deploy')) return;

  const $ = id => document.getElementById(id);

  const GAS_MAX = 100;
  const GAS_COST = { increment: 5, decrement: 5, reset: 20, get: 0 };

  const vm = {
    deployed: false,
    count: null,
    gas: 0,
    txIndex: 0
  };

  // ───── Render ────────────────────────────────────────────────
  function renderState(){
    $('ch6Count').textContent = vm.deployed ? vm.count : '—';
    $('ch6Gas').textContent = vm.gas;
    $('ch6GasMax').textContent = GAS_MAX;
    const pct = GAS_MAX > 0 ? Math.round((vm.gas / GAS_MAX) * 100) : 0;
    const fill = $('ch6GasFill');
    fill.style.width = pct + '%';
    fill.classList.toggle('low', pct < 20);

    // Enable/disable buttons according to gas
    document.querySelectorAll('.ch6-ctrl[data-op]').forEach(btn => {
      const op = btn.dataset.op;
      const cost = GAS_COST[op] || 0;
      btn.disabled = !vm.deployed || vm.gas < cost;
    });
    $('ch6CurrentVal').textContent = vm.deployed ? vm.count : '—';
  }

  // ───── Logging ───────────────────────────────────────────────
  function log(kind, text){
    const el = $('ch6Log');
    const line = document.createElement('div');
    line.className = 'ch6-log__line' + (kind === 'ok' ? ' ok' : kind === 'ko' ? ' ko' : '');
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.innerHTML = '<span class="ts">' + ts + '</span>' + text;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    while (el.children.length > 30) el.removeChild(el.firstChild);
  }

  // ───── Deploy ────────────────────────────────────────────────
  function deploy(){
    if (vm.deployed) {
      if (window.TSCUi) window.TSCUi.toast('Contrat déjà déployé', { level: 'info', duration: 1600 });
      return;
    }
    vm.deployed = true;
    vm.count = 0;
    vm.gas = GAS_MAX;
    vm.txIndex = 0;
    renderState();
    log('ok', '<strong>✓ Contrat Counter déployé.</strong> Gas initial = ' + GAS_MAX + '. Tu es prêt à l\'appeler.');
    $('ch6Deploy').disabled = true;
    $('ch6Deploy').textContent = '✓ CONTRAT DÉPLOYÉ';
    $('ch6Guide').textContent = 'Appelle increment() au moins 10 fois';
  }

  // ───── Method calls ──────────────────────────────────────────
  function call(op){
    if (!vm.deployed) return;
    const cost = GAS_COST[op] || 0;
    vm.txIndex++;

    if (vm.gas < cost) {
      log('ko', '<strong>✗ TX #' + vm.txIndex + ' rejetée</strong> — ' + op + '() requiert ' + cost + ' gas, disponible ' + vm.gas + '. Plus assez de carburant.');
      if (window.TSCUi) window.TSCUi.toast('Gas insuffisant pour ' + op, { level: 'warn', duration: 2400 });
      return;
    }

    // Execute
    let ret;
    if (op === 'increment') { vm.count++; ret = vm.count; }
    else if (op === 'decrement') { vm.count = Math.max(0, vm.count - 1); ret = vm.count; }
    else if (op === 'reset') { vm.count = 0; ret = 0; }
    else if (op === 'get') { ret = vm.count; }

    vm.gas -= cost;
    renderState();

    log('ok', '<strong>TX #' + vm.txIndex + '</strong> ' + op + '() → <span style="color:var(--cy)">' + ret + '</span> · gas −' + cost + ' (reste ' + vm.gas + ')');
    tryFinishChallenge();
  }

  // ───── Challenge ─────────────────────────────────────────────
  let challengeFired = false;
  async function tryFinishChallenge(){
    if (challengeFired) return;
    if (!vm.deployed || vm.count < 10) return;
    challengeFired = true;
    const status = $('ch6ChallStatus');
    const fb = $('ch6ChallFeedback');
    status.textContent = 'RÉUSSI';
    status.classList.add('ok'); status.classList.remove('ko');
    fb.classList.remove('ch-chall__feedback--ko');
    fb.classList.add('on', 'ch-chall__feedback--ok');
    fb.innerHTML = '<strong>✓ count ≥ 10 atteint.</strong> Tu viens d\'exécuter un smart contract : chaque appel a été réellement calculé (ici localement, sur une vraie blockchain chaque nœud l\'aurait fait). Le gas consommé aurait été prélevé sur ton wallet. Et si tu continues, tu verras le gas se vider — bienvenue dans la réalité économique d\'Ethereum.';
    if (window.TSCAcademy) {
      const res = await window.TSCAcademy.runChallenge('6.counter-10', { count: vm.count });
      if (res && res.ok && window.TSCUi) window.TSCUi.toast('Défi VM ✓', { level: 'success' });
    }
    tryCompleteChapter();
  }

  if (window.TSCAcademy) {
    window.TSCAcademy.registerChallenge({
      id: '6.counter-10',
      chapter: 6,
      validate: async ({ count }) => {
        if (!count || count < 10) return { ok: false, hint: 'Atteins au moins count = 10.' };
        return { ok: true };
      }
    });
  }

  // ───── Wire up controls ──────────────────────────────────────
  $('ch6Deploy').addEventListener('click', deploy);
  document.querySelectorAll('.ch6-ctrl[data-op]').forEach(btn => {
    btn.addEventListener('click', () => call(btn.dataset.op));
  });

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
    $('ch6QuizN').textContent = n;
    $('ch6QuizMsg').textContent = n === 3 ? 'Parfait — tu as tout compris.'
                                : n === 2 ? 'Bon score — chapitre validé.'
                                : n === 1 ? 'Relis la section « Raconter » et refais le quiz.'
                                          : 'Prends le temps de relire tranquillement, puis recommence.';
    $('ch6QuizScore').classList.add('on');
    if (window.TSCAcademy) window.TSCAcademy.setQuizScore(6, n);
    tryCompleteChapter();
  }

  function tryCompleteChapter(){
    if (!challengeFired) return;
    if (quizState.answered < quizState.total || quizState.score < 2) return;
    if (window.TSCAcademy) {
      window.TSCAcademy.markChapterDone(6);
      // Fin du parcours — toast solennel
      if (window.TSCUi) {
        setTimeout(() => {
          window.TSCUi.toast('Parcours Académie complet ✓ · 6 / 6 chapitres', {
            level: 'success',
            duration: 6000
          });
        }, 400);
      }
    }
  }

  // ───── Boot ──────────────────────────────────────────────────
  function boot(){
    if (window.TSCAcademy) window.TSCAcademy.markChapterStarted(6);
    renderState();
    log('', '<strong>Laboratoire prêt.</strong> Déploie le contrat pour commencer.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
