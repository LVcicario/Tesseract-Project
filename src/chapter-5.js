/**
 * Chapter 5 — Le consensus
 * ────────────────────────
 * Simulation de 5 nœuds qui votent sur un bloc proposé. L'utilisateur
 * peut rendre chaque nœud byzantin (vote toujours NO) et choisir le
 * quorum requis. Défi validé quand le bloc passe avec ≥ 2 byzantins.
 */
(function installChapter5(){
  'use strict';
  if (document.body.dataset.page !== 'chapter') return;
  if (!document.getElementById('ch5Nodes')) return;

  const $ = id => document.getElementById(id);
  const TOTAL = 5;
  const state = {
    nodes: Array.from({ length: TOTAL }, (_, i) => ({
      id: i,
      byzantine: false,
      vote: null // 'yes' | 'no' | null
    })),
    quorum: 4,
    lastVerdict: null,
    lastByzCount: 0
  };

  // ───── Render ────────────────────────────────────────────────
  function render(){
    const container = $('ch5Nodes');
    container.innerHTML = '';
    state.nodes.forEach((n, i) => {
      const card = document.createElement('div');
      card.className = 'ch5-node ' + (n.byzantine ? 'byzantine' : 'honest');
      const voteClass = n.vote === 'yes' ? 'yes' : n.vote === 'no' ? 'no' : 'idle';
      const voteLabel = n.vote === 'yes' ? '✓ ACCEPT' : n.vote === 'no' ? '✗ REJECT' : '— attend';
      card.innerHTML =
        '<div class="ch5-node__id">NŒUD ' + String(i + 1).padStart(2, '0') + '</div>' +
        '<div class="ch5-node__kind">' + (n.byzantine ? 'BYZANTIN' : 'HONNÊTE') + '</div>' +
        '<div class="ch5-node__vote ch5-node__vote--' + voteClass + '">' + voteLabel + '</div>' +
        '<button type="button" class="ch5-node__toggle" data-idx="' + i + '" data-hover>' +
          (n.byzantine ? '↺ redevenir honnête' : '⚠ rendre byzantin') +
        '</button>';
      container.appendChild(card);
    });
    container.querySelectorAll('.ch5-node__toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleByzantine(parseInt(btn.dataset.idx, 10)));
    });
    updateStats();
  }

  function toggleByzantine(i){
    state.nodes[i].byzantine = !state.nodes[i].byzantine;
    state.nodes[i].vote = null;
    state.lastVerdict = null;
    updateVerdict('—', null);
    render();
  }

  function updateStats(){
    const byz = state.nodes.filter(n => n.byzantine).length;
    $('ch5ByzCount').textContent = byz;
    const guide = $('ch5ChallGuide');
    if (guide) {
      if (byz < 2) guide.textContent = 'Transforme ' + (2 - byz) + ' nœud(s) de plus';
      else if (state.lastVerdict !== 'accept') guide.textContent = 'Propose un bloc — verdict attendu : ACCEPTÉ';
      else guide.textContent = 'Défi validé ✓';
    }
  }

  // ───── Quorum picker ─────────────────────────────────────────
  document.querySelectorAll('#ch5Quorum button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ch5Quorum button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.quorum = parseInt(btn.dataset.q, 10);
    });
  });

  // ───── Voting ────────────────────────────────────────────────
  async function proposeBlock(){
    // Reset votes, then cascade yes/no with a small delay for theatre
    state.nodes.forEach(n => n.vote = null);
    render();
    for (let i = 0; i < state.nodes.length; i++) {
      await new Promise(r => setTimeout(r, 220));
      state.nodes[i].vote = state.nodes[i].byzantine ? 'no' : 'yes';
      render();
    }
    // Tally
    const yes = state.nodes.filter(n => n.vote === 'yes').length;
    const byz = state.nodes.filter(n => n.byzantine).length;
    $('ch5Votes').textContent = yes;
    const verdict = yes >= state.quorum ? 'accept' : 'reject';
    state.lastVerdict = verdict;
    state.lastByzCount = byz;
    updateVerdict(
      verdict === 'accept' ? '✓ BLOC ACCEPTÉ' : '✗ BLOC REJETÉ',
      verdict
    );
    updateStats();
    checkChallenge();
  }

  function updateVerdict(text, cls){
    const el = $('ch5Verdict');
    el.textContent = text;
    el.classList.remove('accept', 'reject');
    if (cls) el.classList.add(cls);
  }

  // ───── Challenge ─────────────────────────────────────────────
  let challengeFired = false;
  async function checkChallenge(){
    if (challengeFired) return;
    if (state.lastVerdict !== 'accept') return;
    if (state.lastByzCount < 2) return;
    challengeFired = true;
    const status = $('ch5ChallStatus');
    const fb = $('ch5ChallFeedback');
    status.textContent = 'RÉUSSI';
    status.classList.add('ok'); status.classList.remove('ko');
    fb.classList.remove('ch-chall__feedback--ko');
    fb.classList.add('on', 'ch-chall__feedback--ok');
    fb.innerHTML = '<strong>✓ Consensus tenu malgré ' + state.lastByzCount + ' byzantins.</strong> Le quorum de ' + state.quorum + '/5 force l\'accord d\'au moins ' + state.quorum + ' nœuds honnêtes — exactement ce qu\'il faut pour dominer la minorité byzantine. Si tu essaies avec 3 byzantins, le même quorum ne tiendra plus : plus de nœuds menteurs que d\'honnêtes.';
    if (window.TSCAcademy) {
      const res = await window.TSCAcademy.runChallenge('5.resist-byzantine', { byzantine: state.lastByzCount, quorum: state.quorum });
      if (res && res.ok && window.TSCUi) window.TSCUi.toast('Défi consensus ✓', { level: 'success' });
    }
    tryCompleteChapter();
  }

  // Register validator
  if (window.TSCAcademy) {
    window.TSCAcademy.registerChallenge({
      id: '5.resist-byzantine',
      chapter: 5,
      validate: async ({ byzantine, quorum }) => {
        if (!byzantine || byzantine < 2) return { ok: false, hint: 'Au moins 2 nœuds byzantins requis.' };
        if (!quorum || quorum < 3) return { ok: false, hint: 'Quorum insuffisant.' };
        return { ok: true };
      }
    });
  }

  // ───── Reset ─────────────────────────────────────────────────
  function reset(){
    state.nodes.forEach(n => { n.byzantine = false; n.vote = null; });
    state.lastVerdict = null;
    render();
    updateVerdict('EN ATTENTE', null);
    $('ch5Votes').textContent = '—';
  }

  $('ch5Propose').addEventListener('click', proposeBlock);
  $('ch5Reset').addEventListener('click', reset);

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
    $('ch5QuizN').textContent = n;
    $('ch5QuizMsg').textContent = n === 3 ? 'Parfait — tu as tout compris.'
                                : n === 2 ? 'Bon score — chapitre validé.'
                                : n === 1 ? 'Relis la section « Raconter » et refais le quiz.'
                                          : 'Prends le temps de relire tranquillement, puis recommence.';
    $('ch5QuizScore').classList.add('on');
    if (window.TSCAcademy) window.TSCAcademy.setQuizScore(5, n);
    tryCompleteChapter();
  }

  function tryCompleteChapter(){
    if (!challengeFired) return;
    if (quizState.answered < quizState.total || quizState.score < 2) return;
    if (window.TSCAcademy) window.TSCAcademy.markChapterDone(5);
  }

  // ───── Boot ──────────────────────────────────────────────────
  function boot(){
    if (window.TSCAcademy) window.TSCAcademy.markChapterStarted(5);
    render();
    updateVerdict('EN ATTENTE', null);
    updateStats();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
