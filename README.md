# TESSERACT.CHAIN

> Une exploration interactive de la Blockchain 3.0, projetée depuis la 4ᵉ dimension.

Un site en fichier unique à l'origine, devenu un mini-univers : **tesseract 4D rendu en WebGL**, **minage SHA-256 réel**, **smart contracts exécutables**, **cascade d'invalidation visible en direct**, **simulation multi-nœuds**, **terminal CLI interactif**. Zéro framework, zéro build step — juste du HTML, du CSS et du JavaScript vanille.

```
┌─ TESSERACT.CHAIN // v2.1 ────────────────────────────────────┐
│                                                              │
│   ▸ Blockchain 3.0 expliquée visuellement                    │
│   ▸ Minage SHA-256 réel (Web Crypto API)                     │
│   ▸ Wallet simulé & smart contracts dans un CLI              │
│   ▸ Cinématique : le tesseract réagit à chaque section       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Démo

Ouvrir `index.html` dans un navigateur moderne. Pas de build, pas d'installation.

```bash
# ou en serveur local :
python3 -m http.server 8000 --bind 127.0.0.1
# → http://localhost:8000
```

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Commandes CLI](#commandes-cli)
- [Easter eggs](#easter-eggs)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Développement](#développement)
- [Accessibilité](#accessibilité)
- [Historique](#historique)
- [Licence](#licence)

## Fonctionnalités

### Pédagogie interactive

8 sections narratives qui racontent la Blockchain 3.0 — du concept du tesseract à la projection vers une Blockchain 4.0 — avec pour chaque chapitre une démonstration concrète au lieu d'un simple texte.

### Minage réel

La section **Proof of Work** n'est pas simulée : votre CPU calcule réellement des hashes SHA-256 via la [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) jusqu'à en trouver un commençant par `0000`. Chaque bloc miné :

- crédite **+6,25 TSC** dans votre wallet local
- illumine un sommet du tesseract en permanence (jusqu'à 16)
- est inscrit dans le **leaderboard local** persisté via `localStorage`
- est explorable en détail (hash, parent, nonce, merkle root, arbre merkle)

### Cascade d'invalidation

Dans la section **test d'intégrité**, modifiez le montant du bloc #001. Tous les blocs suivants deviennent instantanément invalides — démonstration visuelle et sonore de la propriété fondamentale d'une blockchain : l'immuabilité par chaînage cryptographique.

### Terminal CLI (touche `²` ou `~`)

Un vrai shell interactif qui expose les primitives du réseau :

```
tesseract@chain:~$ deploy counter
▸ contrat déployé
  type     : counter
  addr     : 0x4e9a...
  gas used : ~21000

tesseract@chain:~$ call 0x4e9a... increment
▸ increment() → 1
```

Voir la [liste complète des commandes](#commandes-cli).

### Cinématique section-aware

Un `IntersectionObserver` détecte la section visible et **re-teinte le tesseract en arrière-plan** (hue-rotate 1,4 s cubic-bezier). À l'approche de la section `tamper`, il se met à **trembler** de façon quasi subliminale. Quand un bloc est miné, le site **flash** brièvement et un sommet s'allume.

### Wallet persistant

Identité générée au premier chargement via `crypto.getRandomValues` + SHA-256, stockée localement. Votre adresse et votre solde apparaissent dans le HUD en haut à droite et survivent aux rechargements.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│                    (shell sémantique)                       │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
      ┌────────────▼──────────┐  ┌────────▼─────────┐
      │   styles/main.css     │  │   src/core.js    │
      │   · base + variables  │  │   · boot sequence│
      │   · HUD, sections     │  │   · tesseract 4D │
      │   · cursor, CLI       │  │   · mining PoW   │
      │   · responsive        │  │   · tamper logic │
      │   · v2 a11y layer     │  │   · CLI shell    │
      │   · v2.1 components   │  │   · audio Tone.js│
      └───────────────────────┘  └────────┬─────────┘
                                          │
                               ┌──────────▼──────────┐
                               │ src/extensions.js   │
                               │ · STATE + event bus │
                               │ · WALLET (persisté) │
                               │ · CHAIN + mempool   │
                               │ · VM smart contracts│
                               │ · CINEMATIC effects │
                               │ · block EXPLORER    │
                               │ · konami x-ray      │
                               └─────────────────────┘
```

**Découplage par observation** : les extensions v2.1 (wallet, leaderboard, effets) ne modifient jamais le code `core`. Elles s'y branchent via `MutationObserver` sur le DOM du terminal de minage et de la cascade de tamper. Un refactor futur pourra passer par un event bus explicite — ce serait la priorité #1 pour une v3.

## Commandes CLI

| Commande | Description |
|---|---|
| `help` | Liste complète des commandes |
| `mine` | Lance le minage d'un bloc |
| `tamper` | Altère le bloc #001 (cascade d'invalidation) |
| `reset` | Réinitialise la chaîne de test |
| `fly <section>` | Navigue vers `hero`, `concept`, `dim`, `time`, `sim`, `tamper`, `mine`, `outro` |
| `audio` | Bascule l'audio génératif |
| `nodes` | Affiche l'état du réseau |
| `hash <texte>` | Calcule le SHA-256 d'une chaîne |
| `pulse` | Fait pulser le tesseract |
| `red` | Mode alerte |
| `clear` / `exit` | Nettoie / ferme le CLI |
| **v2.1** | |
| `wallet` | Infos détaillées du wallet |
| `balance` | Solde TSC courant |
| `stake <n>` | Mise n TSC (simulation PoS, restitué après 4 s) |
| `deploy counter` | Déploie un contrat compteur |
| `deploy vote` | Déploie un contrat de vote binaire |
| `call <addr> <method> [args...]` | Appelle une méthode de contrat |
| `contracts` | Liste les contrats déployés |
| `mempool` | Dump des transactions en attente |
| `explore <n>` | Ouvre l'explorateur sur le bloc n |
| `byzantine on\|off` | Simule 46 nœuds malveillants |
| `xray` | Bascule le mode rayons-X |

## Easter eggs

- **Code Konami** : `↑ ↑ ↓ ↓ ← → ← → B A` → bascule le **mode rayons-X**, overlay plein écran qui dump l'état interne (wallet, chain, contrats, mempool, section active) et se rafraîchit en direct.
- **Terminal** : tapez `help` pour découvrir les commandes cachées.
- **Shift + drag** sur le fond : fait tourner le tesseract sur son axe W (la 4ᵉ dimension).

## Stack technique

| Domaine | Techno |
|---|---|
| Rendu 3D/4D | [Three.js r128](https://threejs.org) |
| Audio génératif | [Tone.js](https://tonejs.github.io) |
| Cryptographie | [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) (SHA-256 natif) |
| Persistence | `localStorage` (wallet + leaderboard) |
| Style | CSS pur + variables CSS + backdrop-filter |
| Typographie | `Impact` + `SF Mono` (system fonts uniquement, zéro @font-face) |

**Zéro dépendance** installée localement. Aucun build. Le projet tourne en ouvrant `index.html`.

## Structure du dépôt

```
.
├── index.html                      # Point d'entrée
├── styles/
│   └── main.css                    # Tout le style, organisé par section
├── src/
│   ├── core.js                     # Moteur : tesseract, mining, CLI, tamper
│   └── extensions.js               # Couche v2.1 : wallet, VM, cinematic, explorer
├── assets/
│   └── favicon.svg                 # Favicon tesseract inline
├── archive/
│   ├── v1-tesseract-chain.html              # Version monolithique d'origine
│   └── v2-tesseract-chain-monolith.html     # v2.1 avant découpage
├── docs/
├── README.md
├── LICENSE                         # MIT
└── .gitignore
```

## Développement

### Lancer en local

```bash
# Option 1 : ouvrir directement (tout est self-contained)
open index.html

# Option 2 : serveur HTTP minimal
python3 -m http.server 8000 --bind 127.0.0.1
```

### Conventions

- Pas de framework, pas de transpileur, pas de bundler — la simplicité d'abord.
- CSS organisé par *couches* : base → composants → sections → features → responsive → v2.x overrides. Chaque couche est indiquée par un commentaire bannière.
- Variables CSS centralisées dans `:root` — changer `--cy` change la DA globale.
- Code JS en IIFE strictes, `'use strict'`, pas de pollution globale hors `window.TSC` (exposé volontairement pour debug).

### Prochaines étapes envisagées

- [ ] Event bus explicite pour remplacer les MutationObservers de couplage
- [ ] Signature ECDSA réelle des transactions (SubtleCrypto)
- [ ] Bridge cross-chain visuel (2 chaînes parallèles)
- [ ] Mode sombre/clair (paradoxalement, le clair n'existe pas encore)
- [ ] Tests E2E avec Playwright
- [ ] Déploiement GitHub Pages + CI

## Accessibilité

- `@media (prefers-reduced-motion: reduce)` coupe les animations.
- `@media (hover: none)` restaure le curseur système sur tactile.
- Contraste texte corpus ≈ 9:1 (bien au-dessus de WCAG AA).
- `<noscript>` DA-cohérent.
- `Escape` ferme l'explorateur et le mode x-ray.
- `role="dialog"` sur les overlays.

Des progrès restent à faire : focus trap dans l'explorer, navigation clavier complète des sections, ARIA live regions plus fines pour le mining.

## Historique

- **v1** — Monolithe de 1268 lignes généré en un shot avec [Claude Artifacts](https://claude.ai). Toutes les fonctionnalités visuelles et le minage étaient déjà là.
- **v2.0** — Meta SEO, favicon SVG, accessibilité, enrichissements pédagogiques par section (bandeau live, diagramme 1D→4D, sources, 4ᵉ nœud chronologique, leaderboard, CTAs).
- **v2.1** — Ajout d'une couche blockchain vivante : wallet généré et persisté, mempool en temps réel, VM de smart contracts, explorateur de blocs, cinématique section-aware, mode rayons-X Konami.
- **v2.2** *(cette version)* — Refactor vers une structure modulaire. Zéro nouvelle fonctionnalité, uniquement de l'hygiène de code.

## Crédits

Conception et développement : [Luca Vicario](https://github.com/LVcicario).
Génération initiale assistée par Claude (Anthropic) via Artifacts.

## Licence

[MIT](./LICENSE) — faites-en ce que vous voulez.

---

```
◆ FIN DE LA SIMULATION ◆
```
