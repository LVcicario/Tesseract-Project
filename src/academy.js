/**
 * Academy module
 * ──────────────
 * Layer on top of the existing engine that adds the *learning*
 * dimension of the site: progression tracking, challenge
 * validation, and a floating glossary that can be invoked from
 * any page.
 *
 * Design goals
 * ────────────
 *  · Self-contained and page-agnostic — loads harmlessly on
 *    index.html (glossary only) or academy.html (full stack).
 *  · Zero external dependency; reuses window.TSCUi.
 *  · State lives in localStorage under `tsc.academy.progress.v1`
 *    with an explicit version field so future migrations are
 *    straightforward.
 *  · All mutating API goes through a single bus so the UI always
 *    reflects the canonical store.
 *
 * Public surface on `window.TSCAcademy`:
 *   state                  → deep-frozen snapshot of current progress
 *   onChange(cb)           → subscribe to progress changes
 *   markChapterStarted(id) → mark chapter N as started
 *   markChapterDone(id)    → mark chapter N as completed
 *   setQuizScore(id, n)    → record a quiz score for chapter N
 *   reset()                → wipe progress (with confirmation handled
 *                            by the caller, not here)
 *   registerChallenge(def) → register a challenge ready for PB-series
 *   glossary               → { show(term, anchor), hide() }
 */
(function installAcademy(){
  'use strict';

  // ───── Progress store ──────────────────────────────────────────
  const KEY = 'tsc.academy.progress.v1';
  const TOTAL_CHAPTERS = 6;
  const listeners = new Set();

  function emptyState(){
    return {
      version: 1,
      startedAt: null,
      lastSeenChapter: null,
      chapters: {}
    };
  }

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return emptyState();
      return parsed;
    } catch (_) {
      return emptyState();
    }
  }

  let state = load();

  function persist(){
    const safe = window.TSCUi && window.TSCUi.safeSetItem;
    const payload = JSON.stringify(state);
    if (safe) safe(KEY, payload);
    else {
      try { localStorage.setItem(KEY, payload); }
      catch (_) { /* quota — ignore silently when UI toast unavailable */ }
    }
  }

  function emit(){
    const snapshot = deepFreeze(clone(state));
    listeners.forEach(fn => { try { fn(snapshot); } catch (_) {} });
  }

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function deepFreeze(o){
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (v && typeof v === 'object') deepFreeze(v);
    });
    return Object.freeze(o);
  }

  function chapterState(id){
    return state.chapters[id] || (state.chapters[id] = {
      started: false,
      completed: false,
      startedAt: null,
      completedAt: null,
      quizScore: null,
      challengesSolved: []
    });
  }

  function markChapterStarted(id){
    const c = chapterState(id);
    if (c.started) return;
    c.started = true;
    c.startedAt = Date.now();
    if (!state.startedAt) state.startedAt = Date.now();
    state.lastSeenChapter = id;
    persist(); emit();
  }

  function markChapterDone(id){
    const c = chapterState(id);
    const wasDone = c.completed;
    c.completed = true;
    c.completedAt = c.completedAt || Date.now();
    state.lastSeenChapter = id;
    persist(); emit();
    if (!wasDone && window.TSCUi)
      window.TSCUi.toast('Chapitre ' + id + ' terminé ✓', { level: 'success' });
  }

  function setQuizScore(id, score){
    const c = chapterState(id);
    if (c.quizScore == null || score > c.quizScore) c.quizScore = score;
    persist(); emit();
  }

  function recordChallenge(chapterId, challengeId){
    const c = chapterState(chapterId);
    if (!c.challengesSolved.includes(challengeId)) {
      c.challengesSolved.push(challengeId);
      persist(); emit();
    }
  }

  function reset(){
    state = emptyState();
    persist(); emit();
    if (window.TSCUi) window.TSCUi.toast('Progression réinitialisée', { level: 'info' });
  }

  function onChange(fn){
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // ───── Challenges registry (used in Phase B) ──────────────────
  const challenges = new Map();

  function registerChallenge(def){
    if (!def || !def.id || !def.chapter || typeof def.validate !== 'function')
      throw new Error('registerChallenge: expected { id, chapter, validate }');
    challenges.set(def.id, def);
  }

  async function runChallenge(id, userInput){
    const def = challenges.get(id);
    if (!def) throw new Error('Unknown challenge: ' + id);
    const result = await def.validate(userInput);
    if (result && result.ok) recordChallenge(def.chapter, id);
    return result;
  }

  // ───── Glossary ────────────────────────────────────────────────
  // Hand-picked glossary entries, kept inline for Phase A. A later
  // phase may extract these into content/glossary.json if the
  // catalogue grows beyond what's comfortable in source.
  const GLOSSARY = {
    hash: {
      title: 'Hash (empreinte)',
      body: 'Fonction qui transforme n\'importe quelle donnée en une chaîne de taille fixe (ici 256 bits). Même sortie pour la même entrée, mais impossible en pratique de deviner l\'entrée à partir de la sortie.',
      chapter: 1
    },
    sha256: {
      title: 'SHA-256',
      body: 'Algorithme de hachage utilisé par Bitcoin et la plupart des blockchains éducatives. Produit 64 caractères hexadécimaux (256 bits). Natif dans les navigateurs via la Web Crypto API.',
      chapter: 1
    },
    nonce: {
      title: 'Nonce',
      body: 'Nombre arbitraire qu\'un mineur modifie jusqu\'à trouver un hash qui satisfait la difficulté. La seule variable libre dans un bloc candidat.',
      chapter: 3
    },
    bloc: {
      title: 'Bloc',
      body: 'Paquet de transactions accompagné du hash du bloc précédent, d\'un timestamp et d\'un nonce. C\'est cette référence au précédent qui crée la "chaîne".',
      chapter: 2
    },
    blockchain: {
      title: 'Blockchain',
      body: 'Suite de blocs liés cryptographiquement, répliquée sur un réseau de nœuds. Personne ne la possède, tout le monde peut la lire, modifier le passé nécessite de re-miner tous les blocs suivants plus vite que le réseau.',
      chapter: 2
    },
    pow: {
      title: 'Proof of Work (PoW)',
      body: 'Mécanisme de consensus qui exige de dépenser du travail de calcul (énergie) pour ajouter un bloc. Rend les attaques économiquement coûteuses.',
      chapter: 3
    },
    pos: {
      title: 'Proof of Stake (PoS)',
      body: 'Alternative au PoW : pour valider un bloc, un nœud doit mettre en jeu (staker) une partie de sa monnaie. Moins énergivore, reposant sur un incitatif économique différent.',
      chapter: 3
    },
    wallet: {
      title: 'Wallet',
      body: 'Paire clé-privée / clé-publique. La clé publique donne une adresse ; la clé privée signe les transactions. Perdre la clé privée = perdre l\'accès à jamais.',
      chapter: 4
    },
    signature: {
      title: 'Signature numérique',
      body: 'Preuve cryptographique qu\'un message a bien été produit par le détenteur d\'une clé privée, sans révéler la clé elle-même. Vérifiable par quiconque avec la clé publique.',
      chapter: 4
    },
    consensus: {
      title: 'Consensus',
      body: 'Règle qui permet à un réseau décentralisé de s\'accorder sur un état commun malgré des nœuds potentiellement défaillants ou malveillants.',
      chapter: 5
    },
    byzantin: {
      title: 'Nœud byzantin',
      body: 'Nœud qui ne suit pas les règles — par erreur ou par malveillance. Un protocole robuste tient tant que la majorité reste honnête (typiquement > 2/3).',
      chapter: 5
    },
    fork: {
      title: 'Fork',
      body: 'Divergence temporaire ou définitive de la chaîne. Le réseau finit par en conserver une seule version ; les autres sont "orphelines".',
      chapter: 5
    },
    'smart-contract': {
      title: 'Smart contract',
      body: 'Programme qui vit sur la blockchain. Déterministe (même entrée → même sortie), exécuté par tous les nœuds, incapable de faire tourner quoi que ce soit d\'extérieur au réseau.',
      chapter: 6
    },
    gas: {
      title: 'Gas',
      body: 'Unité de mesure du coût de calcul d\'un smart contract. Chaque opération consomme du gas ; le déclencheur paie. Empêche les boucles infinies et spam.',
      chapter: 6
    },
    merkle: {
      title: 'Arbre de Merkle',
      body: 'Arbre binaire de hashes qui résume toutes les transactions d\'un bloc en une seule "racine". Permet de prouver l\'inclusion d\'une tx sans télécharger tout le bloc.',
      chapter: 2
    }
  };

  let tip = null;

  function ensureTip(){
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'gloss-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
    document.addEventListener('click', e => {
      if (!tip.classList.contains('on')) return;
      if (tip.contains(e.target)) return;
      if (e.target.matches('.gloss')) return;
      hideTip();
    }, true);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && tip.classList.contains('on')) hideTip();
    });
    return tip;
  }

  function showTip(term, anchor){
    const entry = GLOSSARY[term];
    if (!entry) return;
    const t = ensureTip();
    const chapterHref = 'academy.html#chapitre-' + entry.chapter;
    t.innerHTML =
      '<h3 class="gloss-tip__t"></h3>' +
      '<p class="gloss-tip__b"></p>' +
      '<a class="gloss-tip__link" href="' + chapterHref + '">▸ CHAPITRE ' + entry.chapter + '</a>';
    t.querySelector('.gloss-tip__t').textContent = entry.title;
    t.querySelector('.gloss-tip__b').textContent = entry.body;
    // Position near the anchor, clamped to viewport
    const rect = anchor.getBoundingClientRect();
    t.classList.add('on');
    const tw = t.offsetWidth, th = t.offsetHeight;
    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.bottom + 10;
    const margin = 12;
    if (left < margin) left = margin;
    if (left + tw + margin > window.innerWidth) left = window.innerWidth - tw - margin;
    if (top + th + margin > window.innerHeight) top = rect.top - th - 10;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }

  function hideTip(){
    if (tip) tip.classList.remove('on');
  }

  function installGlossaryHandlers(){
    document.addEventListener('click', e => {
      const el = e.target.closest('.gloss');
      if (!el) return;
      e.preventDefault();
      const term = el.dataset.term;
      if (!term) return;
      showTip(term, el);
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!document.activeElement || !document.activeElement.matches('.gloss')) return;
      e.preventDefault();
      showTip(document.activeElement.dataset.term, document.activeElement);
    });
    // Make every .gloss keyboard-reachable if the author forgot tabindex.
    document.querySelectorAll('.gloss').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    });
  }

  // ───── Page-specific wiring (academy.html) ────────────────────
  function initAcademyPage(){
    if (document.body.dataset.page !== 'academy') return;

    const bar = document.getElementById('ayBar');
    const doneEl = document.getElementById('ayDone');
    const totalEl = document.getElementById('ayTotal');
    const resetBtn = document.getElementById('ayReset');
    const footerCrd = document.getElementById('fcrd');

    if (totalEl) totalEl.textContent = TOTAL_CHAPTERS;

    function render(s){
      const done = Object.values(s.chapters).filter(c => c.completed).length;
      if (bar) bar.style.width = Math.round((done / TOTAL_CHAPTERS) * 100) + '%';
      if (doneEl) doneEl.textContent = done;
      if (footerCrd) footerCrd.textContent = 'PROG ' + done + '/' + TOTAL_CHAPTERS;
      // Card state flags
      document.querySelectorAll('.ay-card').forEach(card => {
        const id = parseInt(card.dataset.chapter, 10);
        const c = s.chapters[id];
        card.classList.toggle('ay-card--done', !!(c && c.completed));
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!window.TSCUi) { reset(); return; }
        window.TSCUi.modal({
          title: 'Recommencer le parcours ?',
          body: '<p>Tous les chapitres terminés et les défis réussis seront effacés. <strong style="color:var(--w)">Votre wallet et vos blocs minés ne sont pas touchés.</strong></p>',
          actions: [
            { label: 'Annuler', kind: 'ghost' },
            { label: 'Tout effacer', kind: 'primary', onClick: reset }
          ]
        });
      });
    }

    onChange(render);
    render(state);
  }

  // ───── Public API ──────────────────────────────────────────────
  window.TSCAcademy = Object.freeze({
    get state(){ return deepFreeze(clone(state)); },
    onChange,
    markChapterStarted,
    markChapterDone,
    setQuizScore,
    reset,
    registerChallenge,
    runChallenge,
    glossary: Object.freeze({ show: showTip, hide: hideTip })
  });

  // ───── Boot ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installGlossaryHandlers();
      initAcademyPage();
    });
  } else {
    installGlossaryHandlers();
    initAcademyPage();
  }
})();
