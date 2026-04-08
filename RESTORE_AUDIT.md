# RESTORE_AUDIT — Basket U11

**Date de restauration :** 08 avril 2026  
**Source des données :** Logs Railway `logs.1775541119701.json`  
**Période couverte :** 31 mars 2026 → 08 avril 2026  
**Auteur :** Restauration automatisée via analyse de logs

---

## Problème de build Railway résolu

**Erreur :**  
```
[vite:load-fallback] Could not load /app/client/src/pages/staff/utilisateurs
ENOENT: no such file or directory
```

**Cause :** `client/src/pages/staff/utilisateurs.tsx` n'avait jamais été commité dans le repo GitHub. Il existait uniquement dans l'environnement de développement local.

**Correction :** Ajout du fichier `utilisateurs.tsx` (302 lignes) dans le commit de restauration.

---

## Inventaire des données restaurées

### USERS — 23 comptes (CERTAIN)

| ID | Prénom | Nom | Email | Rôle | Source |
|----|--------|-----|-------|------|--------|
| 1 | Admin | Super | superadmin@basket-u11.fr | SUPER_ADMIN | GET /api/users 200 |
| 2 | Max | Rivoire | admin@basket-u11.fr | ADMIN | GET /api/users 200 |
| 3 | Elyhas | Rivoire Bemba | elyhas@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 5 | Nicolas | Montelion | nico@basket-u11.fr | ADMIN | GET /api/users 200 |
| 6 | Noé | Remark | noe@basket-u11.fr | ADMIN | GET /api/users 200 |
| 7 | Naiyl | Mahamat | naiyl@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 8 | Amir | Ait Bari | amir@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 9 | Azzam | Bedja Boana | azzam@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 10 | Elma | Clopon Thezenas | elma@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 11 | Godswill | Okorie | godswill@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 12 | Henika | Havanaby | henika@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 13 | Ineza | Nkiampila | ineza@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 14 | Isaac | Chatard | isaac@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 15 | José Bryant | Antonio | joseb@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 16 | Laeny | Mossier Heraud | laeny@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 17 | Liyam | Diagne Tabach | liyam@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 18 | Mack Joy | Etou | mack@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 19 | Max | Trauchessec | max@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 20 | Paul | Lacassagne | paul@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 21 | Tiago | Imarre | tiago@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 22 | Zachary | Smith | zachary@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 23 | Téza | Boguslawski Bernard | teza@basket-u11.fr | JOUEUR | GET /api/users 200 |
| 24 | Moudjib | Fatmi | moudjib@basket-u11.fr | JOUEUR | GET /api/users 200 |

> ⚠️ Les mots de passe originaux ne sont JAMAIS visibles dans les logs (hachés bcrypt).  
> Le script assigne le mot de passe temporaire `basket2025!` à recréer uniquement si le compte est absent.  
> **À changer impérativement via l'interface admin (Utilisateurs).**

> ℹ️ L'ID 4 est absent des logs — aucune donnée disponible, non restauré.

---

### JOUEURS — 19 joueurs (CERTAIN)

Source principale : `GET /api/joueurs 200` (31/03/2026 05:56 UTC)

| ID | Joueur | Équipe | Profil | ddn | userId lié |
|----|--------|--------|--------|-----|-----------|
| 1 | Elyhas Rivoire Bemba | U11-2 | A | 2015-11-15 | 3 |
| 6 | Naiyl Mahamat | U11-1 | A | 2015-10-23 | 7 |
| 7 | Amir Ait Bari | U11-1 | B | — | 8 |
| 8 | Azzam Bedja Boana | U11-1 | A | — | 9 |
| 9 | Elma Clopon Thezenas | U11-2 | A | — | 10 |
| 10 | Godswill Okorie | U11-2 | B | — | 11 |
| 11 | Henika Havanaby | U11-1 | A | — | 12 |
| 12 | Ineza Nkiampila | U11-2 | A | — | 13 |
| 13 | Isaac Chatard | U11-1 | B | — | 14 |
| 14 | José Bryant Antonio | U11-2 | A | — | 15 |
| 15 | Laeny Mossier Heraud | U11-2 | A | — | 16 |
| 16 | Liyam Diagne Tabach | U11-2 | A | — | 17 |
| 17 | Mack Joy Etou | U11-2 | A | — | 18 |
| 18 | Max Trauchessec | U11-1 | A | — | 19 |
| 19 | Paul Lacassagne | U11-1 | A | — | 20 |
| 20 | Tiago Imarre | U11-2 | C | — | 21 |
| 21 | Zachary Smith | U11-1 | C | — | 22 |
| 22 | Téza Boguslawski Bernard | U11-2 | A | — | 23 |
| 23 | Moudjib Fatmi | U11-2 | A | — | 24 |

> IDs 2–5 absents (anciens joueurs supprimés/non présents dans les logs de prod).

---

### FICHES DE SUIVI — 18 fiches (CERTAIN)

Source : `GET /api/joueurs/:id/fiches 200` et `GET /api/fiches/:id/full 200`

Toutes liées à `saisonId=1`.

| Fiche | Joueur | Orientation | Points forts renseignés |
|-------|--------|-------------|------------------------|
| 1 | Elyhas Rivoire Bemba | U13 | Non |
| 6 | Naiyl Mahamat | U13 | Non |
| 7 | Amir Ait Bari | Non déterminé | Non |
| 8 | Azzam Bedja Boana | Non déterminé | Non |
| 9 | Elma Clopon Thezenas | U13 | **Oui** |
| 10 | Godswill Okorie | Non déterminé | Non |
| 11 | Henika Havanaby | Non déterminé | Non |
| 12 | Ineza Nkiampila | U13 | Non |
| 13 | Isaac Chatard | Non déterminé | Non |
| 14 | José Bryant Antonio | Non déterminé | Non |
| 15 | Laeny Mossier Heraud | Non déterminé | Non |
| 16 | Liyam Diagne Tabach | Non déterminé | Non |
| 18 | Max Trauchessec | Non déterminé | Non |
| 19 | Paul Lacassagne | Non déterminé | Non |
| 20 | Tiago Imarre | Non déterminé | Non |
| 21 | Zachary Smith | Non déterminé | Non |
| 22 | Téza Boguslawski Bernard | Non déterminé | Non |
| 23 | Moudjib Fatmi | U13 | Non |

> Fiches 17 et 24 non vues dans les logs — INDETERMINABLE.

---

### ÉVALUATIONS TECHNIQUES — 17 fiches (CERTAIN)

Source : `PUT /api/fiches/:id/eval-tech 200` — dernières valeurs sauvegardées.  
Les 5 niveaux : `début` / `à_travailler` / `en_cours` / `acquis` / `maîtrise`

Toutes les évaluations sont en statut **CERTAIN** — issues directement des réponses PUT 200.

Fiches avec des niveaux supérieurs à "début" : 1, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23  
Fiche 20 (Tiago) : tous à "début" (non évalué).

---

### ÉVALUATIONS MENTALES — 9 fiches (CERTAIN)

Source : `PUT /api/fiches/:id/eval-mentale 200` et `GET /api/fiches/:id/full 200`

| Fiche | Joueur | Commentaire |
|-------|--------|-------------|
| 1 | Elyhas | "Joueur très motivé, excellent esprit d'équipe. Doit travailler sa gestion des moments difficiles." |
| 8 | Azzam | (vide) |
| 9 | Elma | "Très bonne energie qui rayonne sur l'equipe..." |
| 12 | Ineza | "très bonne energie en match, beaucoup de sérieux..." |
| 14 | José Bryant | "ton energie est très précieuse et rayonne sur l'equipe..." |
| 15 | Laeny | "Continue d'avoir confiance en toi..." |
| 20 | Tiago | "Super energie, Continue d'être aussi appliqué..." |
| 21 | Zachary | "Tu es un jeune garçon discret..." |
| 22 | Téza | "Ta concentration et ton sérieux sont des exemples..." |

> Fiches 6, 7, 10, 11, 13, 16, 17, 18, 19, 23 : évaluations mentales non vues dans les logs — INDETERMINABLE.

---

### OBJECTIFS INDIVIDUELS — 39 objectifs sur 16 fiches (CERTAIN)

Source : `POST /api/fiches/:id/objectifs 201` et `GET /api/fiches/:id/full 200`

| IDs | Fiche | Joueur | Nb objectifs |
|-----|-------|--------|-------------|
| 29,30,44 | 1 | Elyhas | 3 |
| 27,28,45 | 6 | Naiyl | 3 |
| 8,9 | 7 | Amir | 2 |
| 6,7,33 | 8 | Azzam | 3 |
| 10,11,34 | 9 | Elma | 3 |
| 35,36 | 11 | Henika | 2 |
| 12,13,37 | 12 | Ineza | 3 |
| 14,15 | 13 | Isaac | 2 |
| 16,17,38 | 14 | José Bryant | 3 |
| 18,19 | 15 | Laeny | 2 |
| 39,40 | 16 | Liyam | 2 |
| 20,22 | 18 | Max T. | 2 |
| 41,42 | 19 | Paul | 2 |
| 23,24 | 21 | Zachary | 2 |
| 25,26,43 | 22 | Téza | 3 |
| 31,32 | 23 | Moudjib | 2 |

> IDs 1-5, 21, 38-40 non vus pour fiches 10, 17, 20 — INDETERMINABLE.

---

### OBSERVATIONS — 0 (INDETERMINABLE)

Aucune observation n'apparaît dans les réponses `/api/fiches/:id/full 200` des logs.  
Le champ `observations: []` est systématiquement vide dans toutes les réponses loguées.  
**Aucune observation ne peut être reconstituée avec certitude.**

---

## Données INDETERMINABLES (non restaurées)

| Entité | Raison |
|--------|--------|
| Mots de passe originaux | Jamais visibles dans les logs (hachés bcrypt) |
| User id=4 | Absent de tous les logs |
| Fiches 17, 24 | Jamais vues dans les logs |
| Evals mentales fiches 6,7,10,11,13,16,17,18,19,23 | Non présentes dans les logs |
| Observations | Toutes vides dans les réponses loguées |
| Notes internes | Non apparues dans les logs |
| Dates de naissance (sauf Elyhas et Naiyl) | Non renseignées dans les logs |
| Postes, numéros de dossard | Non renseignés dans les logs |

---

## Instructions de déploiement

### Sur Railway — exécuter une fois après déploiement :

```bash
# Se connecter au container Railway
railway run npx tsx server/restore-data.ts
```

### Localement :
```bash
NODE_ENV=production npx tsx server/restore-data.ts
```

### Vérification post-restauration :
- Se connecter avec `superadmin@basket-u11.fr` / `basket2025!`
- Vérifier la présence des 19 joueurs
- Ouvrir quelques fiches et vérifier les évaluations et objectifs
- **Changer les mots de passe des comptes admin via Utilisateurs**

