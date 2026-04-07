import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import {
  users, saisons, joueurs, fichesSuivi,
  evaluationsTechniques, evaluationsMentales,
  objectifsIndividuels, observations, notesInternes, notesJoueurs,
  type User, type InsertUser,
  type Saison, type InsertSaison,
  type Joueur, type InsertJoueur,
  type FicheSuivi, type InsertFicheSuivi,
  type EvalTech, type InsertEvalTech,
  type EvalMentale, type InsertEvalMentale,
  type Objectif, type InsertObjectif,
  type Observation, type InsertObservation,
  type NoteInterne, type InsertNoteInterne,
  type NoteJoueur, type InsertNoteJoueur,
} from "@shared/schema";

const sqlite = new Database("basket.db");
export const db = drizzle(sqlite);

// ─── Init schema (idempotent CREATE IF NOT EXISTS) ────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'JOUEUR',
    password TEXT NOT NULL,
    actif INTEGER NOT NULL DEFAULT 1,
    date_creation TEXT NOT NULL DEFAULT (datetime('now')),
    derniere_connexion TEXT
  );
  CREATE TABLE IF NOT EXISTS saisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    libelle TEXT NOT NULL,
    date_debut TEXT NOT NULL,
    date_fin TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS joueurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance TEXT,
    equipe TEXT NOT NULL DEFAULT 'U11-1',
    profil TEXT NOT NULL DEFAULT 'C',
    photo TEXT,
    poste TEXT,
    numero_dossard TEXT,
    commentaire_general TEXT DEFAULT '',
    archive INTEGER NOT NULL DEFAULT 0,
    date_creation TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS fiches_suivi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    joueur_id INTEGER NOT NULL REFERENCES joueurs(id),
    saison_id INTEGER REFERENCES saisons(id),
    periode_debut TEXT NOT NULL,
    periode_fin TEXT NOT NULL,
    points_forts TEXT DEFAULT '',
    axes_prioritaires TEXT DEFAULT '',
    orientation_envisagee TEXT DEFAULT 'indéfini',
    date_creation TEXT NOT NULL DEFAULT (datetime('now')),
    date_modification TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS evaluations_techniques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_suivi_id INTEGER NOT NULL REFERENCES fiches_suivi(id),
    dribble_main_droite TEXT DEFAULT 'début',
    dribble_main_gauche TEXT DEFAULT 'début',
    changement_main TEXT DEFAULT 'début',
    tir_cercle_droite TEXT DEFAULT 'début',
    tir_cercle_gauche TEXT DEFAULT 'début',
    passe_deux_mains TEXT DEFAULT 'début',
    passe_une_main TEXT DEFAULT 'début',
    attraper_sous_pression TEXT DEFAULT 'début',
    comprehension_1c1 TEXT DEFAULT 'début',
    duels_simples TEXT DEFAULT 'début',
    placement_sans_ballon TEXT DEFAULT 'début',
    occupation_espaces TEXT DEFAULT 'début',
    competences_custom TEXT DEFAULT '[]',
    date_modification TEXT
  );
  CREATE TABLE IF NOT EXISTS evaluations_mentales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_suivi_id INTEGER NOT NULL REFERENCES fiches_suivi(id),
    concentration INTEGER DEFAULT 3,
    coachabilite INTEGER DEFAULT 3,
    gestion_frustration INTEGER DEFAULT 3,
    confiance_match INTEGER DEFAULT 3,
    esprit_collectif INTEGER DEFAULT 3,
    plaisir_visible INTEGER DEFAULT 3,
    commentaire_global TEXT DEFAULT '',
    competences_custom TEXT DEFAULT '[]',
    date_modification TEXT
  );
  CREATE TABLE IF NOT EXISTS objectifs_individuels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_suivi_id INTEGER NOT NULL REFERENCES fiches_suivi(id),
    type TEXT NOT NULL,
    libelle TEXT NOT NULL,
    formulation_enfant TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'En cours',
    date_creation TEXT NOT NULL DEFAULT (datetime('now')),
    date_modification TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_suivi_id INTEGER NOT NULL REFERENCES fiches_suivi(id),
    auteur_id INTEGER NOT NULL REFERENCES users(id),
    date_seance TEXT NOT NULL,
    contenu TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'SEANCE',
    date_creation TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notes_internes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_suivi_id INTEGER NOT NULL REFERENCES fiches_suivi(id),
    auteur_id INTEGER NOT NULL REFERENCES users(id),
    contenu TEXT NOT NULL,
    date_creation TEXT NOT NULL DEFAULT (datetime('now')),
    date_modification TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notes_joueurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fiche_suivi_id INTEGER NOT NULL REFERENCES fiches_suivi(id),
    contenu TEXT NOT NULL,
    date_creation TEXT NOT NULL DEFAULT (datetime('now')),
    lu_par_admin INTEGER NOT NULL DEFAULT 0
  );
`);

// ─── Migrations silencieuses pour la DB existante ────────────────────────────
const migrations = [
  // Nouvelles colonnes users
  "ALTER TABLE users ADD COLUMN actif INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE users ADD COLUMN date_creation TEXT NOT NULL DEFAULT (datetime('now'))",
  "ALTER TABLE users ADD COLUMN derniere_connexion TEXT",
  // Nouvelles colonnes joueurs
  "ALTER TABLE joueurs ADD COLUMN photo TEXT",
  "ALTER TABLE joueurs ADD COLUMN poste TEXT",
  "ALTER TABLE joueurs ADD COLUMN numero_dossard TEXT",
  "ALTER TABLE joueurs ADD COLUMN commentaire_general TEXT DEFAULT ''",
  "ALTER TABLE joueurs ADD COLUMN archive INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE joueurs ADD COLUMN date_creation TEXT NOT NULL DEFAULT (datetime('now'))",
  // Nouvelles colonnes fiches_suivi
  "ALTER TABLE fiches_suivi ADD COLUMN saison_id INTEGER",
  "ALTER TABLE fiches_suivi ADD COLUMN date_creation TEXT NOT NULL DEFAULT (datetime('now'))",
  "ALTER TABLE fiches_suivi ADD COLUMN date_modification TEXT NOT NULL DEFAULT (datetime('now'))",
  // Nouvelles colonnes eval_tech
  "ALTER TABLE evaluations_techniques ADD COLUMN competences_custom TEXT DEFAULT '[]'",
  "ALTER TABLE evaluations_techniques ADD COLUMN date_modification TEXT",
  // Nouvelles colonnes eval_mentale
  "ALTER TABLE evaluations_mentales ADD COLUMN competences_custom TEXT DEFAULT '[]'",
  "ALTER TABLE evaluations_mentales ADD COLUMN date_modification TEXT",
  // Nouvelles colonnes objectifs
  "ALTER TABLE objectifs_individuels ADD COLUMN date_creation TEXT NOT NULL DEFAULT (datetime('now'))",
  "ALTER TABLE objectifs_individuels ADD COLUMN date_modification TEXT NOT NULL DEFAULT (datetime('now'))",
  // Nouvelles colonnes notes_internes
  "ALTER TABLE notes_internes ADD COLUMN date_modification TEXT NOT NULL DEFAULT (datetime('now'))",
  // Note joueur
  "ALTER TABLE notes_joueurs ADD COLUMN lu_par_admin INTEGER NOT NULL DEFAULT 0",
  // Rôle SUPER_ADMIN/READONLY (pas de migration SQL, juste le type TS)
];

for (const sql of migrations) {
  try { sqlite.prepare(sql).run(); } catch { /* colonne déjà présente */ }
}

// ─── Table saisons : créer uniquement si vide ─────────────────────────────────
// (déjà géré par CREATE TABLE IF NOT EXISTS ci-dessus)

// ─── Interface Storage ────────────────────────────────────────────────────────
export interface IStorage {
  // Users
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(data: InsertUser & { dateCreation?: string }): User;
  getAllUsers(): User[];
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;
  deleteUser(id: number): void;
  updateDerniereConnexion(id: number): void;

  // Saisons
  getAllSaisons(): Saison[];
  getSaisonActive(): Saison | undefined;
  createSaison(data: InsertSaison): Saison;
  updateSaison(id: number, data: Partial<InsertSaison>): Saison | undefined;
  setSaisonActive(id: number): void;

  // Joueurs
  getAllJoueurs(includeArchived?: boolean): Joueur[];
  getJoueurById(id: number): Joueur | undefined;
  getJoueurByUserId(userId: number): Joueur | undefined;
  createJoueur(data: Partial<InsertJoueur> & { nom: string; prenom: string }): Joueur;
  updateJoueur(id: number, data: Partial<InsertJoueur>): Joueur | undefined;
  archiveJoueur(id: number): void;
  desarchiverJoueur(id: number): void;
  deleteJoueur(id: number): void;

  // Fiches suivi
  getFichesByJoueurId(joueurId: number): FicheSuivi[];
  getFicheById(id: number): FicheSuivi | undefined;
  createFiche(data: Partial<InsertFicheSuivi> & { joueurId: number; periodeDebut: string; periodeFin: string }): FicheSuivi;
  updateFiche(id: number, data: Partial<InsertFicheSuivi>): FicheSuivi | undefined;
  deleteFiche(id: number): void;

  // Evaluations techniques
  getEvalTechByFicheId(ficheId: number): EvalTech | undefined;
  upsertEvalTech(ficheId: number, data: Partial<InsertEvalTech>): EvalTech;

  // Evaluations mentales
  getEvalMentaleByFicheId(ficheId: number): EvalMentale | undefined;
  upsertEvalMentale(ficheId: number, data: Partial<InsertEvalMentale>): EvalMentale;

  // Objectifs
  getObjectifsByFicheId(ficheId: number): Objectif[];
  createObjectif(data: Partial<InsertObjectif> & { ficheSuiviId: number; type: string; libelle: string; formulationEnfant: string }): Objectif;
  updateObjectif(id: number, data: Partial<InsertObjectif>): Objectif | undefined;
  deleteObjectif(id: number): void;

  // Observations
  getObservationsByFicheId(ficheId: number): Observation[];
  createObservation(data: Partial<InsertObservation> & { ficheSuiviId: number; auteurId: number; dateSeance: string; contenu: string }): Observation;
  updateObservation(id: number, data: Partial<InsertObservation>): Observation | undefined;
  deleteObservation(id: number): void;

  // Notes internes
  getNotesByFicheId(ficheId: number): NoteInterne[];
  createNote(data: Partial<InsertNoteInterne> & { ficheSuiviId: number; auteurId: number; contenu: string }): NoteInterne;
  updateNote(id: number, contenu: string): NoteInterne | undefined;
  deleteNote(id: number): void;

  // Notes joueurs
  getNoteJoueurByFicheId(ficheId: number): NoteJoueur | undefined;
  upsertNoteJoueur(ficheId: number, contenu: string): NoteJoueur;
  marquerNoteLue(ficheId: number): void;
  getJoueursAvecNoteNonLue(): { joueurId: number }[];
}

// ─── SQLiteStorage ────────────────────────────────────────────────────────────
class SQLiteStorage implements IStorage {
  private now() { return new Date().toISOString(); }

  // ─── Users ─────────────────────────────────────────────────────────────────
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }
  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  createUser(data: InsertUser & { dateCreation?: string }): User {
    const { dateCreation, ...rest } = data;
    return db.insert(users).values({ ...rest, dateCreation: dateCreation || this.now() } as any).returning().get();
  }
  getAllUsers(): User[] {
    return db.select().from(users).all();
  }
  updateUser(id: number, data: Partial<InsertUser>): User | undefined {
    return db.update(users).set(data as any).where(eq(users.id, id)).returning().get();
  }
  deleteUser(id: number): void {
    db.delete(users).where(eq(users.id, id)).run();
  }
  updateDerniereConnexion(id: number): void {
    db.update(users).set({ derniereConnexion: this.now() } as any).where(eq(users.id, id)).run();
  }

  // ─── Saisons ───────────────────────────────────────────────────────────────
  getAllSaisons(): Saison[] {
    return db.select().from(saisons).orderBy(desc(saisons.id)).all();
  }
  getSaisonActive(): Saison | undefined {
    return db.select().from(saisons).where(eq(saisons.active, true)).get();
  }
  createSaison(data: InsertSaison): Saison {
    return db.insert(saisons).values(data).returning().get();
  }
  updateSaison(id: number, data: Partial<InsertSaison>): Saison | undefined {
    return db.update(saisons).set(data).where(eq(saisons.id, id)).returning().get();
  }
  setSaisonActive(id: number): void {
    // Désactiver toutes les saisons puis activer celle-ci
    db.update(saisons).set({ active: false }).run();
    db.update(saisons).set({ active: true }).where(eq(saisons.id, id)).run();
  }

  // ─── Joueurs ───────────────────────────────────────────────────────────────
  getAllJoueurs(includeArchived = false): Joueur[] {
    if (includeArchived) return db.select().from(joueurs).all();
    return db.select().from(joueurs).where(eq(joueurs.archive, false)).all();
  }
  getJoueurById(id: number): Joueur | undefined {
    return db.select().from(joueurs).where(eq(joueurs.id, id)).get();
  }
  getJoueurByUserId(userId: number): Joueur | undefined {
    return db.select().from(joueurs).where(eq(joueurs.userId, userId)).get();
  }
  createJoueur(data: Partial<InsertJoueur> & { nom: string; prenom: string }): Joueur {
    return db.insert(joueurs).values({ ...data, dateCreation: this.now() } as any).returning().get();
  }
  updateJoueur(id: number, data: Partial<InsertJoueur>): Joueur | undefined {
    return db.update(joueurs).set(data as any).where(eq(joueurs.id, id)).returning().get();
  }
  archiveJoueur(id: number): void {
    db.update(joueurs).set({ archive: true } as any).where(eq(joueurs.id, id)).run();
  }
  desarchiverJoueur(id: number): void {
    db.update(joueurs).set({ archive: false } as any).where(eq(joueurs.id, id)).run();
  }
  deleteJoueur(id: number): void {
    db.delete(joueurs).where(eq(joueurs.id, id)).run();
  }

  // ─── Fiches ────────────────────────────────────────────────────────────────
  getFichesByJoueurId(joueurId: number): FicheSuivi[] {
    return db.select().from(fichesSuivi)
      .where(eq(fichesSuivi.joueurId, joueurId))
      .orderBy(desc(fichesSuivi.id))
      .all();
  }
  getFicheById(id: number): FicheSuivi | undefined {
    return db.select().from(fichesSuivi).where(eq(fichesSuivi.id, id)).get();
  }
  createFiche(data: Partial<InsertFicheSuivi> & { joueurId: number; periodeDebut: string; periodeFin: string }): FicheSuivi {
    const now = this.now();
    return db.insert(fichesSuivi).values({ ...data, dateCreation: now, dateModification: now } as any).returning().get();
  }
  updateFiche(id: number, data: Partial<InsertFicheSuivi>): FicheSuivi | undefined {
    return db.update(fichesSuivi)
      .set({ ...data, dateModification: this.now() } as any)
      .where(eq(fichesSuivi.id, id))
      .returning().get();
  }
  deleteFiche(id: number): void {
    db.delete(fichesSuivi).where(eq(fichesSuivi.id, id)).run();
  }

  // ─── Eval Technique ────────────────────────────────────────────────────────
  getEvalTechByFicheId(ficheId: number): EvalTech | undefined {
    return db.select().from(evaluationsTechniques).where(eq(evaluationsTechniques.ficheSuiviId, ficheId)).get();
  }
  upsertEvalTech(ficheId: number, data: Partial<InsertEvalTech>): EvalTech {
    const existing = this.getEvalTechByFicheId(ficheId);
    const payload = { ...data, dateModification: this.now() };
    if (existing) {
      return db.update(evaluationsTechniques).set(payload as any).where(eq(evaluationsTechniques.id, existing.id)).returning().get()!;
    }
    return db.insert(evaluationsTechniques).values({ ficheSuiviId: ficheId, ...payload } as any).returning().get();
  }

  // ─── Eval Mentale ──────────────────────────────────────────────────────────
  getEvalMentaleByFicheId(ficheId: number): EvalMentale | undefined {
    return db.select().from(evaluationsMentales).where(eq(evaluationsMentales.ficheSuiviId, ficheId)).get();
  }
  upsertEvalMentale(ficheId: number, data: Partial<InsertEvalMentale>): EvalMentale {
    const existing = this.getEvalMentaleByFicheId(ficheId);
    const payload = { ...data, dateModification: this.now() };
    if (existing) {
      return db.update(evaluationsMentales).set(payload as any).where(eq(evaluationsMentales.id, existing.id)).returning().get()!;
    }
    return db.insert(evaluationsMentales).values({ ficheSuiviId: ficheId, ...payload } as any).returning().get();
  }

  // ─── Objectifs ─────────────────────────────────────────────────────────────
  getObjectifsByFicheId(ficheId: number): Objectif[] {
    return db.select().from(objectifsIndividuels).where(eq(objectifsIndividuels.ficheSuiviId, ficheId)).all();
  }
  createObjectif(data: Partial<InsertObjectif> & { ficheSuiviId: number; type: string; libelle: string; formulationEnfant: string }): Objectif {
    const now = this.now();
    return db.insert(objectifsIndividuels).values({ ...data, dateCreation: now, dateModification: now } as any).returning().get();
  }
  updateObjectif(id: number, data: Partial<InsertObjectif>): Objectif | undefined {
    return db.update(objectifsIndividuels).set({ ...data, dateModification: this.now() } as any).where(eq(objectifsIndividuels.id, id)).returning().get();
  }
  deleteObjectif(id: number): void {
    db.delete(objectifsIndividuels).where(eq(objectifsIndividuels.id, id)).run();
  }

  // ─── Observations ──────────────────────────────────────────────────────────
  getObservationsByFicheId(ficheId: number): Observation[] {
    return db.select().from(observations)
      .where(eq(observations.ficheSuiviId, ficheId))
      .orderBy(desc(observations.dateSeance))
      .all();
  }
  createObservation(data: Partial<InsertObservation> & { ficheSuiviId: number; auteurId: number; dateSeance: string; contenu: string }): Observation {
    return db.insert(observations).values({ ...data, dateCreation: this.now() } as any).returning().get();
  }
  updateObservation(id: number, data: Partial<InsertObservation>): Observation | undefined {
    return db.update(observations).set(data as any).where(eq(observations.id, id)).returning().get();
  }
  deleteObservation(id: number): void {
    db.delete(observations).where(eq(observations.id, id)).run();
  }

  // ─── Notes internes ────────────────────────────────────────────────────────
  getNotesByFicheId(ficheId: number): NoteInterne[] {
    return db.select().from(notesInternes)
      .where(eq(notesInternes.ficheSuiviId, ficheId))
      .orderBy(desc(notesInternes.dateCreation))
      .all();
  }
  createNote(data: Partial<InsertNoteInterne> & { ficheSuiviId: number; auteurId: number; contenu: string }): NoteInterne {
    const now = this.now();
    return db.insert(notesInternes).values({ ...data, dateCreation: now, dateModification: now } as any).returning().get();
  }
  updateNote(id: number, contenu: string): NoteInterne | undefined {
    return db.update(notesInternes).set({ contenu, dateModification: this.now() } as any).where(eq(notesInternes.id, id)).returning().get();
  }
  deleteNote(id: number): void {
    db.delete(notesInternes).where(eq(notesInternes.id, id)).run();
  }

  // ─── Notes joueurs ─────────────────────────────────────────────────────────
  getNoteJoueurByFicheId(ficheId: number): NoteJoueur | undefined {
    return db.select().from(notesJoueurs).where(eq(notesJoueurs.ficheSuiviId, ficheId)).get();
  }
  upsertNoteJoueur(ficheId: number, contenu: string): NoteJoueur {
    const existing = this.getNoteJoueurByFicheId(ficheId);
    const now = this.now();
    if (existing) {
      return db.update(notesJoueurs)
        .set({ contenu, dateCreation: now, luParAdmin: false })
        .where(eq(notesJoueurs.id, existing.id))
        .returning().get()!;
    }
    return db.insert(notesJoueurs).values({ ficheSuiviId: ficheId, contenu, dateCreation: now, luParAdmin: false }).returning().get();
  }
  marquerNoteLue(ficheId: number): void {
    const existing = this.getNoteJoueurByFicheId(ficheId);
    if (existing) {
      db.update(notesJoueurs).set({ luParAdmin: true }).where(eq(notesJoueurs.id, existing.id)).run();
    }
  }
  getJoueursAvecNoteNonLue(): { joueurId: number }[] {
    return db
      .select({ joueurId: fichesSuivi.joueurId })
      .from(notesJoueurs)
      .innerJoin(fichesSuivi, eq(notesJoueurs.ficheSuiviId, fichesSuivi.id))
      .where(eq(notesJoueurs.luParAdmin, false))
      .all();
  }
}

export const storage = new SQLiteStorage();
