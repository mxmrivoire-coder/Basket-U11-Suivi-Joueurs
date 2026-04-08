/**
 * SCRIPT DE RESTAURATION DES DONNÉES — Basket U11
 * Source : logs Railway du 31/03/2026 au 08/04/2026
 * 
 * Restaure :
 *   - 19 joueurs (avec userId liés)
 *   - 18 fiches de suivi (saison 1)
 *   - 17 évaluations techniques
 *   - 9 évaluations mentales (avec commentaires complets)
 *   - 39 objectifs individuels (sur 16 fiches)
 *   - 23 comptes utilisateurs (dont 3 admins + 20 joueurs)
 * 
 * USAGE : NODE_ENV=production npx tsx server/restore-data.ts
 * SÉCURITÉ : idempotent — vérifie l'existence avant chaque insertion
 */

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../basket.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function log(msg: string) { console.log(`[restore] ${msg}`); }
function warn(msg: string) { console.warn(`[WARN] ${msg}`); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userExists(id: number): boolean {
  return !!(db.prepare("SELECT id FROM users WHERE id = ?").get(id));
}

function joueurExists(id: number): boolean {
  return !!(db.prepare("SELECT id FROM joueurs WHERE id = ?").get(id));
}

function ficheExists(id: number): boolean {
  return !!(db.prepare("SELECT id FROM fiches_suivi WHERE id = ?").get(id));
}

function evalTechExists(ficheSuiviId: number): boolean {
  return !!(db.prepare("SELECT id FROM evaluations_techniques WHERE ficheSuiviId = ?").get(ficheSuiviId));
}

function evalMentaleExists(ficheSuiviId: number): boolean {
  return !!(db.prepare("SELECT id FROM evaluations_mentales WHERE ficheSuiviId = ?").get(ficheSuiviId));
}

function objectifExists(id: number): boolean {
  return !!(db.prepare("SELECT id FROM objectifs_individuels WHERE id = ?").get(id));
}

function getSaisonId(): number {
  const saison = db.prepare("SELECT id FROM saisons WHERE active = 1 LIMIT 1").get() as any;
  if (!saison) {
    // Créer saison 2024-2025 si absente
    const result = db.prepare(
      "INSERT INTO saisons (libelle, dateDebut, dateFin, active) VALUES (?, ?, ?, 1)"
    ).run("2024-2025", "2024-09-01", "2025-06-30");
    log("Saison 2024-2025 créée");
    return result.lastInsertRowid as number;
  }
  return saison.id;
}

// ─── 1. COMPTES UTILISATEURS ──────────────────────────────────────────────────

async function restoreUsers() {
  log("=== Restauration des comptes utilisateurs ===");

  const defaultHash = await bcrypt.hash("basket2025!", 10);

  const users = [
    // Staff
    { id: 1, nom: "Super", prenom: "Admin", email: "superadmin@basket-u11.fr", role: "SUPER_ADMIN" },
    { id: 2, nom: "Rivoire", prenom: "Max", email: "admin@basket-u11.fr", role: "ADMIN" },
    { id: 5, nom: "Montelion", prenom: "Nicolas", email: "nico@basket-u11.fr", role: "ADMIN" },
    { id: 6, nom: "Remark", prenom: "Noé", email: "noe@basket-u11.fr", role: "ADMIN" },
    // Joueurs
    { id: 3,  nom: "Rivoire Bemba",    prenom: "Elyhas",      email: "elyhas@basket-u11.fr",   role: "JOUEUR" },
    { id: 7,  nom: "Mahamat",          prenom: "Naiyl",       email: "naiyl@basket-u11.fr",    role: "JOUEUR" },
    { id: 8,  nom: "Ait Bari",         prenom: "Amir",        email: "amir@basket-u11.fr",     role: "JOUEUR" },
    { id: 9,  nom: "Bedja Boana",      prenom: "Azzam",       email: "azzam@basket-u11.fr",    role: "JOUEUR" },
    { id: 10, nom: "Clopon Thezenas",  prenom: "Elma",        email: "elma@basket-u11.fr",     role: "JOUEUR" },
    { id: 11, nom: "Okorie",           prenom: "Godswill",    email: "godswill@basket-u11.fr", role: "JOUEUR" },
    { id: 12, nom: "Havanaby",         prenom: "Henika",      email: "henika@basket-u11.fr",   role: "JOUEUR" },
    { id: 13, nom: "Nkiampila",        prenom: "Ineza",       email: "ineza@basket-u11.fr",    role: "JOUEUR" },
    { id: 14, nom: "Chatard",          prenom: "Isaac",       email: "isaac@basket-u11.fr",    role: "JOUEUR" },
    { id: 15, nom: "Antonio",          prenom: "José Bryant", email: "joseb@basket-u11.fr",    role: "JOUEUR" },
    { id: 16, nom: "Mossier Heraud",   prenom: "Laeny",       email: "laeny@basket-u11.fr",    role: "JOUEUR" },
    { id: 17, nom: "Diagne Tabach",    prenom: "Liyam",       email: "liyam@basket-u11.fr",    role: "JOUEUR" },
    { id: 18, nom: "Etou",             prenom: "Mack Joy",    email: "mack@basket-u11.fr",     role: "JOUEUR" },
    { id: 19, nom: "Trauchessec",      prenom: "Max",         email: "max@basket-u11.fr",      role: "JOUEUR" },
    { id: 20, nom: "Lacassagne",       prenom: "Paul",        email: "paul@basket-u11.fr",     role: "JOUEUR" },
    { id: 21, nom: "Imarre",           prenom: "Tiago",       email: "tiago@basket-u11.fr",    role: "JOUEUR" },
    { id: 22, nom: "Smith",            prenom: "Zachary",     email: "zachary@basket-u11.fr",  role: "JOUEUR" },
    { id: 23, nom: "Boguslawski Bernard", prenom: "Téza",     email: "teza@basket-u11.fr",     role: "JOUEUR" },
    { id: 24, nom: "Fatmi",            prenom: "Moudjib",     email: "moudjib@basket-u11.fr",  role: "JOUEUR" },
  ];

  let created = 0, skipped = 0;
  for (const u of users) {
    if (userExists(u.id)) {
      skipped++;
      continue;
    }
    db.prepare(
      `INSERT INTO users (id, nom, prenom, email, motDePasse, role, actif)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(u.id, u.nom, u.prenom, u.email, defaultHash, u.role);
    created++;
    log(`  Compte créé: ${u.prenom} ${u.nom} (${u.role})`);
  }
  log(`  ${created} comptes créés, ${skipped} déjà présents`);
  if (created > 0) {
    warn("Mot de passe par défaut 'basket2025!' — à changer via l'interface admin !");
  }
}

// ─── 2. JOUEURS ───────────────────────────────────────────────────────────────

function restoreJoueurs() {
  log("=== Restauration des joueurs ===");

  const joueurs = [
    { id: 1,  userId: 3,  nom: "Rivoire Bemba",         prenom: "Elyhas",      equipe: "U11-2", profil: "A", dateNaissance: "2015-11-15" },
    { id: 6,  userId: 7,  nom: "Mahamat",                prenom: "Naiyl",       equipe: "U11-1", profil: "A", dateNaissance: "2015-10-23" },
    { id: 7,  userId: 8,  nom: "Ait Bari",               prenom: "Amir",        equipe: "U11-1", profil: "B", dateNaissance: "" },
    { id: 8,  userId: 9,  nom: "Bedja Boana",            prenom: "Azzam",       equipe: "U11-1", profil: "A", dateNaissance: "" },
    { id: 9,  userId: 10, nom: "Clopon Thezenas",        prenom: "Elma",        equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 10, userId: 11, nom: "Okorie",                 prenom: "Godswill",    equipe: "U11-2", profil: "B", dateNaissance: "" },
    { id: 11, userId: 12, nom: "Havanaby",               prenom: "Henika",      equipe: "U11-1", profil: "A", dateNaissance: "" },
    { id: 12, userId: 13, nom: "Nkiampila",              prenom: "Ineza",       equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 13, userId: 14, nom: "Chatard",                prenom: "Isaac",       equipe: "U11-1", profil: "B", dateNaissance: "" },
    { id: 14, userId: 15, nom: "Antonio",                prenom: "José Bryant", equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 15, userId: 16, nom: "Mossier Heraud",         prenom: "Laeny",       equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 16, userId: 17, nom: "Diagne Tabach",          prenom: "Liyam",       equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 17, userId: 18, nom: "Etou",                   prenom: "Mack Joy",    equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 18, userId: 19, nom: "Trauchessec",            prenom: "Max",         equipe: "U11-1", profil: "A", dateNaissance: "" },
    { id: 19, userId: 20, nom: "Lacassagne",             prenom: "Paul",        equipe: "U11-1", profil: "A", dateNaissance: "" },
    { id: 20, userId: 21, nom: "Imarre",                 prenom: "Tiago",       equipe: "U11-2", profil: "C", dateNaissance: "" },
    { id: 21, userId: 22, nom: "Smith",                  prenom: "Zachary",     equipe: "U11-1", profil: "C", dateNaissance: "" },
    { id: 22, userId: 23, nom: "Boguslawski Bernard",    prenom: "Téza",        equipe: "U11-2", profil: "A", dateNaissance: "" },
    { id: 23, userId: 24, nom: "Fatmi",                  prenom: "Moudjib",     equipe: "U11-2", profil: "A", dateNaissance: "" },
  ];

  let created = 0, skipped = 0;
  for (const j of joueurs) {
    if (joueurExists(j.id)) {
      skipped++;
      continue;
    }
    db.prepare(
      `INSERT INTO joueurs (id, userId, nom, prenom, dateNaissance, equipe, profil, poste, numeroDossard, commentaireGeneral, archive)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '', 0)`
    ).run(j.id, j.userId, j.nom, j.prenom, j.dateNaissance, j.equipe, j.profil);
    created++;
    log(`  Joueur créé: ${j.prenom} ${j.nom} (${j.equipe}, profil ${j.profil})`);
  }
  log(`  ${created} joueurs créés, ${skipped} déjà présents`);
}

// ─── 3. FICHES DE SUIVI ────────────────────────────────────────────────────────

function restoreFiches(saisonId: number) {
  log("=== Restauration des fiches de suivi ===");

  const fiches = [
    { id: 1,  joueurId: 1,  orientation: "U13",           pointsForts: "",  axesPrio: "" },
    { id: 6,  joueurId: 6,  orientation: "U13",           pointsForts: "",  axesPrio: "" },
    { id: 7,  joueurId: 7,  orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 8,  joueurId: 8,  orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 9,  joueurId: 9,  orientation: "U13",
      pointsForts: "Très bonne vitesse, sens du collectif, cherche à faire la bonne passe",
      axesPrio: "finition en double pas (plus de douceur sur la finition) , shoot, positionnement" },
    { id: 10, joueurId: 10, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 11, joueurId: 11, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 12, joueurId: 12, orientation: "U13",           pointsForts: "",  axesPrio: "" },
    { id: 13, joueurId: 13, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 14, joueurId: 14, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 15, joueurId: 15, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 16, joueurId: 16, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 18, joueurId: 18, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 19, joueurId: 19, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 20, joueurId: 20, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 21, joueurId: 21, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 22, joueurId: 22, orientation: "Non déterminé", pointsForts: "",  axesPrio: "" },
    { id: 23, joueurId: 23, orientation: "U13",           pointsForts: "",  axesPrio: "" },
  ];

  let created = 0, skipped = 0;
  for (const f of fiches) {
    if (ficheExists(f.id)) { skipped++; continue; }
    db.prepare(
      `INSERT INTO fiches_suivi (id, joueurId, saisonId, periodeDebut, periodeFin, pointsForts, axesPrioritaires, orientationEnvisagee)
       VALUES (?, ?, ?, '2026-03-30', '2025-06-30', ?, ?, ?)`
    ).run(f.id, f.joueurId, saisonId, f.pointsForts, f.axesPrio, f.orientation);
    created++;
    log(`  Fiche créée: id=${f.id} joueurId=${f.joueurId}`);
  }
  log(`  ${created} fiches créées, ${skipped} déjà présentes`);
}

// ─── 4. ÉVALUATIONS TECHNIQUES ────────────────────────────────────────────────

function restoreEvalsTech() {
  log("=== Restauration des évaluations techniques ===");

  const evals = [
    { fiche: 1,  vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"en_cours",    tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"à_travailler", attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"à_travailler", placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 6,  vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 7,  vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 8,  vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 9,  vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"en_cours",  tirCercleGauche:"en_cours",    passeDeuxMains:"à_travailler",passeUneMain:"à_travailler", attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 11, vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 12, vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours",  tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"en_cours",     attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"à_travailler" }},
    { fiche: 13, vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"acquis",      changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"acquis",      passeDeuxMains:"en_cours",    passeUneMain:"acquis",       attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 14, vals: { dribbleMainDroite:"en_cours",  dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours",  tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"à_travailler",duelsSimples:"à_travailler", placementSansBallon:"à_travailler",occupationEspaces:"en_cours" }},
    { fiche: 15, vals: { dribbleMainDroite:"en_cours",  dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours",  tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"à_travailler",duelsSimples:"en_cours",     placementSansBallon:"à_travailler",occupationEspaces:"à_travailler" }},
    { fiche: 16, vals: { dribbleMainDroite:"en_cours",  dribbleMainGauche:"à_travailler",changementMain:"à_travailler",tirCercleDroite:"en_cours",  tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"à_travailler", placementSansBallon:"à_travailler",occupationEspaces:"à_travailler" }},
    { fiche: 18, vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 19, vals: { dribbleMainDroite:"acquis",    dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",    tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"acquis",       attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"acquis",       placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 20, vals: { dribbleMainDroite:"début",     dribbleMainGauche:"début",       changementMain:"début",       tirCercleDroite:"début",     tirCercleGauche:"début",       passeDeuxMains:"début",       passeUneMain:"début",        attraperSousPression:"début",       comprehension1c1:"début",       duelsSimples:"début",        placementSansBallon:"début",       occupationEspaces:"début" }},
    { fiche: 21, vals: { dribbleMainDroite:"en_cours",  dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours",  tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"à_travailler",duelsSimples:"à_travailler", placementSansBallon:"à_travailler",occupationEspaces:"à_travailler" }},
    { fiche: 22, vals: { dribbleMainDroite:"en_cours",  dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours",  tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" }},
    { fiche: 23, vals: { dribbleMainDroite:"en_cours",  dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours",  tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"à_travailler", attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"à_travailler",occupationEspaces:"en_cours" }},
  ];

  let created = 0, skipped = 0;
  const stmt = db.prepare(
    `INSERT INTO evaluations_techniques
     (ficheSuiviId, dribbleMainDroite, dribbleMainGauche, changementMain,
      tirCercleDroite, tirCercleGauche, passeDeuxMains, passeUneMain,
      attraperSousPression, comprehension1c1, duelsSimples,
      placementSansBallon, occupationEspaces, competencesCustom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`
  );
  for (const e of evals) {
    if (evalTechExists(e.fiche)) { skipped++; continue; }
    const v = e.vals;
    stmt.run(e.fiche, v.dribbleMainDroite, v.dribbleMainGauche, v.changementMain,
             v.tirCercleDroite, v.tirCercleGauche, v.passeDeuxMains, v.passeUneMain,
             v.attraperSousPression, v.comprehension1c1, v.duelsSimples,
             v.placementSansBallon, v.occupationEspaces);
    created++;
    log(`  Eval tech créée: ficheSuiviId=${e.fiche}`);
  }
  log(`  ${created} eval-tech créées, ${skipped} déjà présentes`);
}

// ─── 5. ÉVALUATIONS MENTALES ──────────────────────────────────────────────────

function restoreEvalsMentale() {
  log("=== Restauration des évaluations mentales ===");

  const evals = [
    { fiche: 1,  conc:3, coach:2, frust:2, conf:3, esp:3, plaisir:2,
      comment: "Joueur très motivé, excellent esprit d'équipe. Doit travailler sa gestion des moments difficiles." },
    { fiche: 8,  conc:3, coach:4, frust:3, conf:3, esp:3, plaisir:3, comment: "" },
    { fiche: 9,  conc:4, coach:5, frust:3, conf:3, esp:4, plaisir:4,
      comment: "Très bonne energie qui rayonne sur l'equipe, continue de t'appliquer toujours autant. Les progrès se voient, pour faire encore mieux, mets autant d'energie à l'entrainement qu'en match . " },
    { fiche: 12, conc:3, coach:4, frust:4, conf:4, esp:3, plaisir:3,
      comment: "très bonne energie en match, beaucoup de sérieux. Pour des progrès encore plus rapide, essaie de mettre autant d'energie à l'entrainement qu'en match ! " },
    { fiche: 14, conc:3, coach:4, frust:3, conf:4, esp:3, plaisir:4,
      comment: "ton energie est très précieuse et rayonne sur l'equipe, continue comme ça, tu progresses. Bravo" },
    { fiche: 15, conc:2, coach:4, frust:3, conf:4, esp:3, plaisir:3,
      comment: "Continue d'avoir confiance en toi, ça se voit et c'est une très bonne chose. Essaie d'être un peu plus concentré aux entrainements pour progresser encore plus. " },
    { fiche: 20, conc:4, coach:4, frust:4, conf:2, esp:4, plaisir:4,
      comment: "Super energie, Continue d'être aussi appliqué, de ne rien lâcher,  aie confiance en toi , les progrès se voient. " },
    { fiche: 21, conc:3, coach:4, frust:3, conf:4, esp:2, plaisir:2,
      comment: "Tu es un jeune garçon discret. En match n'hésites pas à encourager tes coéquipiers, tu progresses bien, continue à être concentré et confiant aux matchs comme aux entrainements. " },
    { fiche: 22, conc:5, coach:4, frust:3, conf:4, esp:3, plaisir:3,
      comment: "Ta concentration et ton sérieux sont des exemples,  continue comme ça. Les progrès sont visibles, bravo " },
  ];

  let created = 0, skipped = 0;
  const stmt = db.prepare(
    `INSERT INTO evaluations_mentales
     (ficheSuiviId, concentration, coachabilite, gestionFrustration,
      confianceMatch, espritCollectif, plaisirVisible, commentaireGlobal, competencesCustom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]')`
  );
  for (const e of evals) {
    if (evalMentaleExists(e.fiche)) { skipped++; continue; }
    stmt.run(e.fiche, e.conc, e.coach, e.frust, e.conf, e.esp, e.plaisir, e.comment);
    created++;
    log(`  Eval mentale créée: ficheSuiviId=${e.fiche}`);
  }
  log(`  ${created} eval-mentale créées, ${skipped} déjà présentes`);
}

// ─── 6. OBJECTIFS INDIVIDUELS ──────────────────────────────────────────────────

function restoreObjectifs() {
  log("=== Restauration des objectifs individuels ===");

  const objectifs = [
    // Fiche 1 (Elyhas Rivoire Bemba)
    { id:29,  fiche:1,  type:"TECHNIQUE", libelle:"Améliorer le changement de rythme",
      formulation:"Je veux améliorer mon changement de rythme (cross) pour  être plus efficace pour passer mon défenseur", statut:"En cours" },
    { id:30,  fiche:1,  type:"TECHNIQUE", libelle:"Améliorer ma vision de jeu",
      formulation:"Je veux améliorer ma vision de jeu pour mieux me placer et me déplacer (coupe, drive, passes) pour mieux aider l'équipe", statut:"En cours" },
    { id:44,  fiche:1,  type:"MENTAL",    libelle:"Gestions des émotions",
      formulation:"J'aimerais arriver à mieux gérer mes émotions quand ça ne va pas sur le terrain pour rester concentré", statut:"En cours" },
    // Fiche 6 (Naiyl Mahamat)
    { id:27,  fiche:6,  type:"TECHNIQUE", libelle:"Améliorer la vision de jeu",
      formulation:"Je veux améliorer ma vision de jeu pour etre plus efficace sur me déplacement et mes passes", statut:"En cours" },
    { id:28,  fiche:6,  type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"Je veux améliorer mon shoot dans sa forme pour être plus efficace et mon double pas", statut:"En cours" },
    { id:45,  fiche:6,  type:"MENTAL",    libelle:"Rester calme",
      formulation:"J'aimerais rester calme face aux décisions de l'arbitre que je juge injuste ", statut:"En cours" },
    // Fiche 7 (Amir Ait Bari)
    { id:8,   fiche:7,  type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"Je veux améliorer la forme de mon shoot et ma réussite", statut:"En cours" },
    { id:9,   fiche:7,  type:"TECHNIQUE", libelle:"Améliorer défense porteur / non porteur",
      formulation:"Je veux m'améliorer sur la défense sur le porteur de balle et le  non porteur", statut:"En cours" },
    // Fiche 8 (Azzam Bedja Boana)
    { id:6,   fiche:8,  type:"TECHNIQUE", libelle:"Améliorer la finition",
      formulation:"« J'arrive à tirer en course avec opposition en lay-up, power, lay-back avec réussite »", statut:"En cours" },
    { id:7,   fiche:8,  type:"TECHNIQUE", libelle:"Accepter le contact",
      formulation:"Arriver à mieux contacter mon joueur quand je suis en défense. Accepter le contact offensif sur mes attaques", statut:"En cours" },
    { id:33,  fiche:8,  type:"MENTAL",    libelle:"être moins frustrer par les coéquipiers",
      formulation:"J'aimerais prendre plus confiance pour parler sur le terrain à mes coéquipiers  pour qu'on joue plus collectif", statut:"En cours" },
    // Fiche 9 (Elma Clopon Thezenas)
    { id:10,  fiche:9,  type:"TECHNIQUE", libelle:"Améliorer la finition",
      formulation:"Je veux améliorer ma finition en double pas, lay up ou power", statut:"En cours" },
    { id:11,  fiche:9,  type:"TECHNIQUE", libelle:"Améliorer la vision de jeu",
      formulation:"Je veux améliorer ma vision du jeu pour faire de meilleurs passes et aider l'équipe", statut:"En cours" },
    { id:34,  fiche:9,  type:"MENTAL",    libelle:"Mieux gérer la frustration",
      formulation:"J'aimerais moins m'énerver quand je rate un panier ou une action \"facile\"", statut:"En cours" },
    // Fiche 11 (Henika Havanaby)
    { id:35,  fiche:11, type:"TECHNIQUE", libelle:"Améliorer la défense sur le porteur",
      formulation:"J'aimerais améliorer ma défense sur le porteur du ballon  pour l'empêcher de passer", statut:"En cours" },
    { id:36,  fiche:11, type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"J'aimerais améliorer mon shoot et sa forme pour avoir plus de réussite", statut:"En cours" },
    // Fiche 12 (Ineza Nkiampila)
    { id:12,  fiche:12, type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"Je veux améliorer la forme de mon shoot et ma réussite", statut:"En cours" },
    { id:13,  fiche:12, type:"TECHNIQUE", libelle:"Améliorer le dribble",
      formulation:"Je veux améliorer mon dribble main droite et main gauche pour être plus à l'aise", statut:"En cours" },
    { id:37,  fiche:12, type:"MENTAL",    libelle:"Gestion de la frustration",
      formulation:"J'aimerais arriver à être moins frustré quand quelque chose sur le terrain se passe mal", statut:"En cours" },
    // Fiche 13 (Isaac Chatard)
    { id:14,  fiche:13, type:"TECHNIQUE", libelle:"Améliorer la réussite au lancer franc",
      formulation:"Je veux m'améliorer au lancer franc pour assurer les points de l'équipe", statut:"En cours" },
    { id:15,  fiche:13, type:"TECHNIQUE", libelle:"Améliorer le tir en course",
      formulation:"Je veux améliorer mon tir en course, lay-up, lay-back, pour avoir une meilleur réussite", statut:"En cours" },
    // Fiche 14 (José Bryant Antonio)
    { id:16,  fiche:14, type:"TECHNIQUE", libelle:"Améliorer ma défense",
      formulation:"Je veux m'améliorer en défense, arriver à cadrer mon joueur sans faire faute", statut:"En cours" },
    { id:17,  fiche:14, type:"TECHNIQUE", libelle:"Améliorer les passes",
      formulation:"Je veux améliorer ma technique de passe pour mieux aider l'équipe", statut:"En cours" },
    { id:38,  fiche:14, type:"MENTAL",    libelle:"Rester calme",
      formulation:"J'aimerais rester calme quand l'arbitre fait une erreur", statut:"En cours" },
    // Fiche 15 (Laeny Mossier Heraud)
    { id:18,  fiche:15, type:"TECHNIQUE", libelle:"Améliorer la défense",
      formulation:"Je veux m'améliorer en défense sur le porteur du ballon et le non porteur pour limiter les paniers adverses", statut:"En cours" },
    { id:19,  fiche:15, type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"Je veux améliorer ma technique de shoot pour être plus efficace", statut:"En cours" },
    // Fiche 16 (Liyam Diagne Tabach)
    { id:39,  fiche:16, type:"TECHNIQUE", libelle:"Améliorer le dribble",
      formulation:"J'aimerais améliorer mon dribble main droite et gauche pour être plus a l'aise sur le terrain", statut:"En cours" },
    { id:40,  fiche:16, type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"J'aimerais améliorer mon shoot pour être plus efficace", statut:"En cours" },
    // Fiche 18 (Max Trauchessec)
    { id:20,  fiche:18, type:"TECHNIQUE", libelle:"Aller plus vite au panier",
      formulation:"Je veux aller plus vite et plus fort au panier en double pas ou en power, et être plus décisif", statut:"En cours" },
    { id:22,  fiche:18, type:"TECHNIQUE", libelle:"Améliorer  le dribble",
      formulation:"Je veux améliorer mon dribble main droite main gauche pour être plus efficace et à l'aise", statut:"En cours" },
    // Fiche 19 (Paul Lacassagne)
    { id:41,  fiche:19, type:"TECHNIQUE", libelle:"Améliorer l'adresse au shoot",
      formulation:"J'aimerais être plus adroit avec mon shoot", statut:"En cours" },
    { id:42,  fiche:19, type:"TECHNIQUE", libelle:"Amélioration en défense",
      formulation:"J'aimerais moins chercher la balle en défense et mieux bloqué mon adversaire ", statut:"En cours" },
    // Fiche 21 (Zachary Smith)
    { id:23,  fiche:21, type:"TECHNIQUE", libelle:"Améliorer la défense",
      formulation:"Je veux m'améliorer sur la défense porteur et non porteur du ballon pour mieux aider l'équipe", statut:"En cours" },
    { id:24,  fiche:21, type:"TECHNIQUE", libelle:"Améliorer le double pas",
      formulation:"Je veux améliorer mon double pas, lay up, pour être plus efficace et mieux aider l'équipe", statut:"En cours" },
    // Fiche 22 (Téza Boguslawski Bernard)
    { id:25,  fiche:22, type:"TECHNIQUE", libelle:"Améliorer le double pas",
      formulation:"Je veux améliorer mon double pas en lay-up, pour être plus efficace et aider l'équipe", statut:"En cours" },
    { id:26,  fiche:22, type:"TECHNIQUE", libelle:"Améliorer le dribble ",
      formulation:"Je veux améliorer mon dribble pour être plus à l'aise sur le terrain", statut:"En cours" },
    { id:43,  fiche:22, type:"MENTAL",    libelle:"Rester calme",
      formulation:"J'aimerais rester calme lorsqu'il a des fautes qui ne sont pas sifflées par l'arbitre", statut:"En cours" },
    // Fiche 23 (Moudjib Fatmi)
    { id:31,  fiche:23, type:"TECHNIQUE", libelle:"Améliorer ma défense ",
      formulation:"Je veux m'améliorer en défense pour empêcher mon adversaire de marquer", statut:"En cours" },
    { id:32,  fiche:23, type:"TECHNIQUE", libelle:"Améliorer le shoot",
      formulation:"J'aimerais améliorer mon tir de loin ", statut:"En cours" },
  ];

  let created = 0, skipped = 0;
  const stmt = db.prepare(
    `INSERT INTO objectifs_individuels (id, ficheSuiviId, type, libelle, formulationEnfant, statut)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const o of objectifs) {
    if (objectifExists(o.id)) { skipped++; continue; }
    stmt.run(o.id, o.fiche, o.type, o.libelle, o.formulation, o.statut);
    created++;
    log(`  Objectif créé: id=${o.id} fiche=${o.fiche} "${o.libelle.slice(0,40)}"`);
  }
  log(`  ${created} objectifs créés, ${skipped} déjà présents`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  log("=== DÉBUT DE LA RESTAURATION ===");
  log(`Base de données: ${DB_PATH}`);
  
  const saisonId = getSaisonId();
  log(`Saison active ID: ${saisonId}`);

  await restoreUsers();
  restoreJoueurs();
  restoreFiches(saisonId);
  restoreEvalsTech();
  restoreEvalsMentale();
  restoreObjectifs();

  // Vérification finale
  const counts = {
    users:    (db.prepare("SELECT COUNT(*) as n FROM users").get() as any).n,
    joueurs:  (db.prepare("SELECT COUNT(*) as n FROM joueurs").get() as any).n,
    fiches:   (db.prepare("SELECT COUNT(*) as n FROM fiches_suivi").get() as any).n,
    evalTech: (db.prepare("SELECT COUNT(*) as n FROM evaluations_techniques").get() as any).n,
    evalMent: (db.prepare("SELECT COUNT(*) as n FROM evaluations_mentales").get() as any).n,
    objectifs:(db.prepare("SELECT COUNT(*) as n FROM objectifs_individuels").get() as any).n,
  };
  log("=== ÉTAT FINAL DE LA BASE ===");
  log(`  users: ${counts.users}`);
  log(`  joueurs: ${counts.joueurs}`);
  log(`  fiches_suivi: ${counts.fiches}`);
  log(`  evaluations_techniques: ${counts.evalTech}`);
  log(`  evaluations_mentales: ${counts.evalMent}`);
  log(`  objectifs_individuels: ${counts.objectifs}`);
  log("=== RESTAURATION TERMINÉE ===");
}

main().catch(console.error);
