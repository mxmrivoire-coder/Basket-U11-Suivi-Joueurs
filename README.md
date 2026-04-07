# 🏀 Basket U11 — Suivi des Joueurs

Application web de suivi individualisé pour les équipes U11 du CBCF Basket.  
Stack : **React + Express + SQLite/Drizzle ORM + Tailwind CSS**.

---

## Fonctionnalités

### Pour le staff (Coach / Admin)
- **Tableau de bord** : stats globales (effectif, profils, équipes), accès rapide aux fiches
- **Gestion des joueurs** : création, modification, archivage, filtres équipe/profil
- **Fiches de suivi** par saison avec 5 onglets :
  - Identité (période, synthèse coach, orientation envisagée)
  - Objectifs (à_faire / en_cours / atteint)
  - Compétences techniques (5 niveaux : Début / À travailler / En cours / Acquis / Maîtrise)
  - Comportement mental (5 pastilles : Difficultés → Excellent)
  - Observations datées (Séance / Match / Tournoi / Autre)
  - Notes internes (staff) + messages joueur
- **Export PDF** : fiche A4 complète générée côté client (jsPDF pur)

### Pour les joueurs (enfants)
- Vue "Ma Fiche" : design coloré et lisible avec labels emoji (👀💪📈✅🌟)
- Mes objectifs par statut
- Messagerie avec le coach

### Gestion des accès
| Rôle | Accès |
|------|-------|
| `SUPER_ADMIN` | Tout + gestion comptes + gestion saisons |
| `ADMIN` (Coach) | Toutes les fiches joueurs, export PDF |
| `READONLY` | Lecture seule de toutes les fiches |
| `JOUEUR` | Sa propre fiche uniquement |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Wouter (hash routing), TanStack Query v5, Tailwind CSS v3, shadcn/ui |
| Backend | Express.js, JWT Bearer (mémoire React), bcryptjs |
| Base de données | SQLite via better-sqlite3 (synchrone), Drizzle ORM |
| Build | Vite (frontend) + esbuild (backend) → `dist/` |
| Export PDF | jsPDF pur (pas html2canvas) |
| Dark mode | ThemeProvider React (pas localStorage) |

**Choix techniques justifiés :**
- **Hash routing** (`useHashLocation`) : obligatoire pour les iframes sandboxées (déploiement Perplexity Computer)
- **JWT en mémoire React** : pas de localStorage/sessionStorage/cookies (bloqués en iframe)
- **SQLite synchrone** : parfait pour un serveur mono-utilisateur ou faible charge — zéro config, backup simple
- **jsPDF pur** : génère le PDF 100% côté client, pas de dépendance serveur

---

## Architecture

```
basket-u11/
├── client/              # Frontend React
│   └── src/
│       ├── App.tsx             # Router + routes staff/joueur
│       ├── hooks/use-auth.ts   # Contexte JWT + rôles
│       ├── lib/pdf-export.ts   # Export jsPDF
│       ├── pages/
│       │   ├── staff/          # Dashboard, joueurs, fiche-joueur, utilisateurs, saisons
│       │   └── joueur/         # Ma-fiche, mes-objectifs
│       └── components/
│           ├── app-sidebar.tsx
│           └── theme-toggle.tsx
├── server/              # Backend Express
│   ├── routes.ts        # Toutes les routes API + middlewares auth
│   └── storage.ts       # SQLiteStorage (Drizzle ORM)
├── shared/
│   └── schema.ts        # 10 tables SQLite + types Zod
├── dist/                # Build de production (gitignored)
│   ├── public/          # Frontend buildé (servi statiquement)
│   └── index.cjs        # Backend bundlé
├── basket.db            # Base SQLite (gitignored, créée au 1er démarrage)
├── .env.example
└── README.md
```

### Schéma DB (10 tables)

```
users           → comptes (4 rôles : SUPER_ADMIN, ADMIN, READONLY, JOUEUR)
saisons         → ex: "2024-2025" (active: boolean)
joueurs         → identité + poste + dossard + équipe + profil + archive
fiches_suivi    → une fiche par joueur par saison (saisonId, dates, synthèse, orientation)
eval_tech       → compétences techniques (5 niveaux) + JSON custom
eval_mentale    → pastilles mentales (1-5) + JSON custom + commentaire global
objectifs       → objectifs par fiche (titre, statut, priorité)
observations    → entrées datées par fiche (type, contenu)
notes_internes  → notes staff par fiche (confidentielles)
notes_joueurs   → messages joueur → coach par fiche
```

---

## Installation

### Prérequis
- Node.js ≥ 18
- npm ≥ 9

### 1. Cloner et installer
```bash
git clone <url-du-repo>
cd basket-u11
npm install
```

### 2. Configurer l'environnement
```bash
cp .env.example .env
# Éditer .env : changer JWT_SECRET obligatoirement
```

**Générer un secret sécurisé :**
```bash
openssl rand -hex 32
```

### 3. Lancer en développement
```bash
npm run dev
# → http://localhost:5000
```
La base de données `basket.db` est créée automatiquement au premier démarrage avec un seed de 4 comptes et 5 joueurs.

### 4. Build de production
```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

---

## Comptes de test (seed bootstrap)

> Ces comptes sont créés automatiquement si la base est vide.

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `superadmin@basket-u11.fr` | `superadmin123` | Super Admin |
| `admin@basket-u11.fr` | `admin123` | Coach (ADMIN) |
| `readonly@basket-u11.fr` | `readonly123` | Lecture seule |
| `elyhas@basket-u11.fr` | `elyhas123` | Joueur |

**⚠️ Changer ces mots de passe en production via la page Utilisateurs (Super Admin).**

---

## Utilisation

### Accès admin (Coach)
1. Connexion avec `admin@basket-u11.fr`
2. Dashboard → clic sur un joueur → fiche complète
3. Onglet Technique : modifier les niveaux de chaque compétence
4. Onglet Mental : attribuer les pastilles (1-5)
5. Onglet Observations : ajouter une entrée datée (Séance / Match / Tournoi)
6. **Export PDF** : bouton en haut à droite de la fiche

### Export PDF
- Accessible aux rôles ADMIN et SUPER_ADMIN
- Format A4, généré côté client (jsPDF)
- Contenu : identité, compétences techniques (barres colorées), mental, objectifs, observations
- Nom du fichier : `fiche_prenom_nom.pdf`

### Gestion des saisons (Super Admin)
- Menu Saisons → créer une nouvelle saison
- Activer une saison = toutes les nouvelles fiches utilisent cette saison par défaut
- Les anciennes fiches restent accessibles via la liste des fiches du joueur

### Ajouter un joueur
1. Menu Joueurs → bouton "+ Ajouter"
2. Renseigner : prénom, nom, date de naissance, équipe (U11-1 / U11-2), poste, dossard, profil
3. La fiche de suivi pour la saison active est créée automatiquement

---

## Recommandations RGPD

> L'application traite des données personnelles de mineurs — obligations renforcées.

### Données traitées
- Identité (prénom, nom, date de naissance)
- Évaluations sportives et comportementales
- Notes internes (confidentielles)

### Mesures minimales à mettre en place
1. **Informer les parents/tuteurs** : note d'information RGPD à remettre en début de saison
2. **Limiter la durée de conservation** : archiver ou supprimer les fiches après la saison suivante
3. **Droit d'accès** : les parents peuvent demander à consulter les données de leur enfant
4. **Droit de suppression** : utiliser l'archivage joueur + suppression manuelle DB si demande formelle
5. **Sécurité** : héberger sur un serveur en Union Européenne, HTTPS obligatoire
6. **Mots de passe forts** : imposer des mots de passe robustes aux comptes staff

### Ce que l'app ne fait PAS
- Pas de partage tiers, pas d'analytics, pas de cookies de tracking
- Les données ne quittent jamais le serveur (export PDF = génération côté client)

---

## Roadmap

### V1 (actuelle)
- ✅ 4 rôles (Super Admin, Coach, Readonly, Joueur)
- ✅ Fiches complètes (technique 5 niveaux, mental 5 pastilles, observations, objectifs)
- ✅ Export PDF jsPDF
- ✅ Dark mode
- ✅ Responsive mobile/tablette

### V2 (envisagée)
- [ ] Graphiques d'évolution par compétence (Recharts)
- [ ] Envoi de PDF par email (Nodemailer)
- [ ] Import CSV des joueurs
- [ ] Mode hors-ligne (PWA / Service Worker)
- [ ] Comparaison inter-joueurs sur les compétences techniques

### V3 (perspectives)
- [ ] Application mobile native (React Native / Expo)
- [ ] Multi-club (architecture SaaS)
- [ ] Intégration agenda club (matchs, séances automatiques dans observations)
- [ ] Signature numérique parents (RGPD)

---

## Développement

### Structure des routes API

```
POST   /api/auth/login          → JWT
GET    /api/auth/me             → profil courant

GET    /api/joueurs             → liste joueurs (staff)
POST   /api/joueurs             → créer joueur (admin)
PATCH  /api/joueurs/:id         → modifier joueur (admin)
POST   /api/joueurs/:id/archive → archiver joueur (admin)

GET    /api/joueurs/:id/fiches  → liste fiches par saison
GET    /api/fiches/:id          → fiche complète
PATCH  /api/fiches/:id          → modifier fiche

GET    /api/fiches/:id/eval-tech       → évaluations techniques
PUT    /api/fiches/:id/eval-tech       → sauvegarder évaluations tech
GET    /api/fiches/:id/eval-mentale    → évaluation mentale
PUT    /api/fiches/:id/eval-mentale    → sauvegarder évaluation mentale

GET    /api/fiches/:id/objectifs       → objectifs
POST   /api/fiches/:id/objectifs       → ajouter objectif
PATCH  /api/objectifs/:id             → modifier objectif
DELETE /api/objectifs/:id             → supprimer objectif

GET    /api/fiches/:id/observations    → observations
POST   /api/fiches/:id/observations   → ajouter observation
DELETE /api/observations/:id          → supprimer observation

GET    /api/fiches/:id/notes           → notes staff
POST   /api/fiches/:id/notes           → ajouter note staff
POST   /api/fiches/:id/note-joueur     → message joueur

GET    /api/saisons              → liste saisons (super_admin)
POST   /api/saisons              → créer saison (super_admin)
PATCH  /api/saisons/:id          → modifier saison (super_admin)

GET    /api/users                → liste utilisateurs (super_admin)
POST   /api/users                → créer compte (super_admin)
PATCH  /api/users/:id            → modifier compte (super_admin)
DELETE /api/users/:id            → supprimer compte (super_admin)

GET    /api/dashboard/stats      → stats générales (staff)
```

### Middlewares d'auth
```typescript
requireAuth          // JWT valide (tous rôles connectés)
requireReadAccess    // SUPER_ADMIN | ADMIN | READONLY
requireWriteAccess   // SUPER_ADMIN | ADMIN
requireSuperAdmin    // SUPER_ADMIN uniquement
```

---

## Licence

Usage privé — CBCF Basket Clermont-Ferrand.  
Développé par Max Rivoire avec Perplexity Computer.
