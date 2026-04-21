/**
 * Chapter 4 — Les identités
 * ─────────────────────────
 * Real ECDSA P-256 keypair generation + sign/verify via SubtleCrypto.
 * Challenge validates that the learner has performed the full cycle:
 * sign → verify-ok → tamper → verify-rejected.
 */
(function installChapter4(){
  'use strict';
  if (document.body.dataset.page !== 'chapter') return;
  if (!document.getElementById('ch4Gen')) return;

  const $ = id => document.getElementById(id);
  const toHex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');

  // ───── State ─────────────────────────────────────────────────
  let keyPair = null;
  let publicJwk = null;
  let currentSig = null;
  let currentMsg = null;
  const progress = {
    signed: false,
    verifiedOk: false,
    tamperedRejected: false
  };

  // ───── Key generation ────────────────────────────────────────
  async function generateKeys(){
    const genBtn = $('ch4Gen');
    genBtn.disabled = true;
    genBtn.textContent = '⟳ GÉNÉRATION EN COURS…';
    try {
      keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, // extractable = false for the private key (more realistic)
        ['sign', 'verify']
      );
      publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

      $('ch4Priv').textContent = '•••••••• (non-extractable — le navigateur garde la clé scellée)';
      $('ch4Priv').classList.remove('ch4-id__val--redact');
      $('ch4Pub').innerHTML =
        '<div><strong style="color:var(--gr)">x:</strong> ' + publicJwk.x + '</div>' +
        '<div style="margin-top:6px"><strong style="color:var(--gr)">y:</strong> ' + publicJwk.y + '</div>';
      $('ch4Meta').textContent = 'Format JWK · courbe ' + publicJwk.crv + ' · ' + (publicJwk.x.length * 4) + ' bits × 2 coordonnées';

      // Enable sign button, reset the rest
      $('ch4DoSign').disabled = false;
      $('ch4DoVerify').disabled = true;
      $('ch4DoTamper').disabled = true;
      currentSig = null;
      currentMsg = null;
      $('ch4Sig').textContent = '—';
      $('ch4Guide').textContent = 'Clé prête — signe le message';

      if (window.TSCUi) window.TSCUi.toast('Paire de clés générée', { level: 'success', duration: 2400 });
    } catch (err) {
      if (window.TSCUi) window.TSCUi.toast('Échec génération : ' + (err.message || err), { level: 'error' });
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = '⟲ GÉNÉRER UNE NOUVELLE PAIRE';
    }
  }

  // ───── Sign ──────────────────────────────────────────────────
  async function signMessage(){
    if (!keyPair) return;
    const msg = $('ch4Msg').value;
    if (!msg.trim()) {
      if (window.TSCUi) window.TSCUi.toast('Tape un message à signer', { level: 'warn' });
      return;
    }
    const data = new TextEncoder().encode(msg);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey, data);
    currentSig = sig;
    currentMsg = msg;
    $('ch4Sig').textContent = '0x' + toHex(sig);
    $('ch4DoVerify').disabled = false;
    $('ch4DoTamper').disabled = false;
    progress.signed = true;
    progress.verifiedOk = false;
    progress.tamperedRejected = false;
    updateStep();
    showFeedback('ok', '<strong>Signature produite.</strong> C\'est un objet mathématique unique, lié à ce message précis ET à ta clé privée. Personne ne peut la fabriquer sans la clé.');
  }

  // ───── Verify ────────────────────────────────────────────────
  async function verifyMessage(){
    if (!keyPair || !currentSig) return;
    const msg = $('ch4Msg').value;
    const data = new TextEncoder().encode(msg);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.publicKey, currentSig, data);

    if (ok) {
      progress.verifiedOk = true;
      showFeedback('ok', '<strong>✓ Signature valide.</strong> La clé publique confirme que cette signature a bien été produite par la clé privée associée, pour ce message exact. Étape suivante : modifie le message et re-vérifie.');
    } else {
      progress.tamperedRejected = progress.tamperedRejected || (msg !== currentMsg);
      showFeedback('ko', '<strong>✗ Signature rejetée.</strong> Le message a changé depuis la signature — aucun moyen mathématique de re-produire une signature valide sans la clé privée. C\'est exactement ce qui empêche la falsification des transactions blockchain.');
    }
    updateStep();
    tryFinishChallenge();
  }

  function tamperMessage(){
    const input = $('ch4Msg');
    const val = input.value;
    if (!val) return;
    // Flip one random character to its next in the alphabet (simple & visible)
    const i = Math.floor(Math.random() * val.length);
    const c = val[i];
    const swapped = c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
    const newMsg = val.slice(0, i) + (swapped !== c ? swapped : (c === 'a' ? 'A' : 'a')) + val.slice(i + 1);
    input.value = newMsg;
    showFeedback('ok', '<strong>Modification appliquée.</strong> Un caractère a changé silencieusement. Re-vérifie la signature et observe.');
  }

  // ───── Challenge progression ────────────────────────────────
  function updateStep(){
    const done = (progress.signed ? 1 : 0) + (progress.verifiedOk ? 1 : 0) + (progress.tamperedRejected ? 1 : 0);
    $('ch4Step').textContent = done;
    const guide = $('ch4Guide');
    if (!progress.signed) guide.textContent = 'Clé prête — signe le message';
    else if (!progress.verifiedOk) guide.textContent = 'Vérifie la signature (elle doit être OK)';
    else if (!progress.tamperedRejected) guide.textContent = 'Modifie une lettre puis re-vérifie';
    else guide.textContent = 'Défi validé ✓';

    const status = $('ch4ChallStatus');
    if (done === 3) { status.textContent = 'RÉUSSI'; status.classList.add('ok'); status.classList.remove('ko'); }
    else if (done > 0) { status.textContent = 'EN COURS'; status.classList.add('ko'); }
  }

  function showFeedback(kind, html){
    const fb = $('ch4Feedback');
    fb.classList.remove('ch-chall__feedback--ok', 'ch-chall__feedback--ko');
    fb.classList.add('on', kind === 'ok' ? 'ch-chall__feedback--ok' : 'ch-chall__feedback--ko');
    fb.innerHTML = html;
  }

  let challengeFired = false;
  async function tryFinishChallenge(){
    if (challengeFired) return;
    if (!progress.signed || !progress.verifiedOk || !progress.tamperedRejected) return;
    challengeFired = true;
    if (window.TSCAcademy) {
      const res = await window.TSCAcademy.runChallenge('4.sign-verify-tamper', progress);
      if (res && res.ok && window.TSCUi) {
        window.TSCUi.toast('Défi signature ✓', { level: 'success' });
      }
    }
    tryCompleteChapter();
  }

  // Register challenge
  if (window.TSCAcademy) {
    window.TSCAcademy.registerChallenge({
      id: '4.sign-verify-tamper',
      chapter: 4,
      validate: async ({ signed, verifiedOk, tamperedRejected }) => {
        if (!(signed && verifiedOk && tamperedRejected)) {
          return { ok: false, hint: 'Il faut signer, vérifier OK, puis vérifier après falsification.' };
        }
        return { ok: true };
      }
    });
  }

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
    $('ch4QuizN').textContent = n;
    $('ch4QuizMsg').textContent = n === 3 ? 'Parfait — tu as tout compris.'
                                : n === 2 ? 'Bon score — chapitre validé.'
                                : n === 1 ? 'Relis la section « Raconter » et refais le quiz.'
                                          : 'Prends le temps de relire tranquillement, puis recommence.';
    $('ch4QuizScore').classList.add('on');
    if (window.TSCAcademy) window.TSCAcademy.setQuizScore(4, n);
    tryCompleteChapter();
  }

  function tryCompleteChapter(){
    if (!challengeFired) return;
    if (quizState.answered < quizState.total || quizState.score < 2) return;
    if (window.TSCAcademy) window.TSCAcademy.markChapterDone(4);
  }

  // ───── Boot ──────────────────────────────────────────────────
  function boot(){
    if (window.TSCAcademy) window.TSCAcademy.markChapterStarted(4);
    $('ch4Gen').addEventListener('click', generateKeys);
    $('ch4DoSign').addEventListener('click', signMessage);
    $('ch4DoVerify').addEventListener('click', verifyMessage);
    $('ch4DoTamper').addEventListener('click', tamperMessage);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
