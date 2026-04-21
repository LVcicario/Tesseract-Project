# Contribuer à TESSERACT.CHAIN

Merci pour l'intérêt porté au projet. Ce guide explique comment participer sans friction.

## Esprit du projet

TESSERACT.CHAIN est un **objet pédagogique** à l'identité visuelle travaillée. Toute contribution doit respecter deux règles invariantes :

1. **Aucune régression pédagogique.** Un ajout doit rendre la blockchain plus compréhensible, pas plus confuse.
2. **Aucune régression visuelle.** La direction artistique (palette cyan/magenta/violet/or, typo Impact + SF Mono, tesseract en arrière-plan) est non-négociable. Les nouveaux composants doivent s'inscrire dans cette langue.

## Stack et philosophie

- HTML / CSS / JS **vanille**. Pas de framework, pas de build, pas de transpileur.
- Dépendances CDN : **Three.js r128** et **Tone.js 14.8.49** uniquement, avec SRI.
- Chaque couche est additive : `core.js` (moteur), `extensions.js` (v2.1), `academy.js` (parcours), `chapter-N.js` (leçons). On n'édite `core.js` qu'en cas de bug avéré.

## Démarrer en local

```bash
git clone https://github.com/LVcicario/Tesseract-Project.git
cd Tesseract-Project
open index.html            # macOS
# ou
python3 -m http.server 8000 --bind 127.0.0.1
```

Aucune installation n'est requise.

## Conventions de commit

On suit [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` nouvelle fonctionnalité visible
- `fix:` correction de bug
- `refactor:` nettoyage sans changement de comportement
- `docs:` documentation
- `chore:` tâches techniques (build, infra, dépendances)
- `perf:` amélioration de performance
- `style:` mise en forme pure (pas de changement de logique)

Le message court en première ligne ; un corps détaillé explique **pourquoi** (pas seulement quoi).

## Structure d'une contribution

1. **Fork** + branche dédiée : `feat/add-chapter-7-zk-proofs`
2. **Un commit = un objectif.** Atomique, testable isolément.
3. **Test manuel** : ouvre `index.html` et la page concernée dans un navigateur moderne. Vérifie que le curseur custom fonctionne, que le tesseract tourne, que l'audio ne persiste pas après fermeture.
4. **Pull Request** : remplis le template, mentionne les issues liées.

## Ajouter un chapitre à l'Académie

Chaque chapitre suit le même gabarit. Voir `academy/1-le-hash.html` + `src/chapter-1.js` comme référence.

- HTML : 5 sections correspondant au modèle `Raconter / Montrer / Faire / Défier / Retenir`
- JS : inscription via `window.TSCAcademy.registerChallenge({ id, chapter, validate })`
- Ajouter la carte sur `academy.html` avec la couleur d'accent du chapitre
- Débloquer la navigation "suivant" du chapitre précédent
- Étendre le glossaire (`GLOSSARY` dans `src/academy.js`) avec les termes introduits

## Accessibilité — non négociable

- Contraste corps de texte ≥ 7:1 (on est à ~9:1 avec `--d: #a6aecc`)
- Tout composant interactif doit être atteignable et déclenchable au **clavier**
- Pas de `alert()` / `confirm()` — utiliser `TSCUi.modal()` / `TSCUi.toast()`
- `aria-label` sur les contrôles sans texte visible
- Respect de `prefers-reduced-motion` et `hover: none`

## Sécurité

- Jamais de `innerHTML` avec des données utilisateur non échappées
- Les dépendances CDN portent un `integrity="sha384-…"` — mettre à jour si changement de version
- `localStorage.setItem` via `TSCUi.safeSetItem()` pour gérer les quotas

## Questions

Ouvre une issue avec le template `Question / Discussion`. Aucune question n'est bête — c'est l'esprit pédagogique du projet.
