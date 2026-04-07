import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Rôles disponibles ────────────────────────────────────────────────────────
// SUPER_ADMIN : gère comptes, saisons, paramètres globaux
// ADMIN       : consulte/modifie fiches joueurs de son périmètre
// READONLY    : consultation uniquement (lecture seule)
// JOUEUR      : accès uniquement à sa propre fiche

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["SUPER_ADMIN", "ADMIN", "READONLY", "JOUEUR"] })
    .notNull()
    .default("JOUEUR"),
  password: text("password").notNull(),
  actif: integer("actif", { mode: "boolean" }).notNull().default(true),
  dateCreation: text("date_creation").notNull(),
  derniereConnexion: text("derniere_connexion"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  dateCreation: true,
  derniereConnexion: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Saisons (préparation V2) ────────────────────────────────────────────────
export const saisons = sqliteTable("saisons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  libelle: text("libelle").notNull(), // ex: "2024-2025"
  dateDebut: text("date_debut").notNull(),
  dateFin: text("date_fin").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
});

export const insertSaisonSchema = createInsertSchema(saisons).omit({ id: true });
export type InsertSaison = z.infer<typeof insertSaisonSchema>;
export type Saison = typeof saisons.$inferSelect;

// ─── Joueurs ─────────────────────────────────────────────────────────────────
export const joueurs = sqliteTable("joueurs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  dateNaissance: text("date_naissance"),
  equipe: text("equipe", { enum: ["U11-1", "U11-2"] }).notNull().default("U11-1"),
  profil: text("profil", { enum: ["A", "B", "C"] }).notNull().default("C"),
  // A = candidat U13, B = dernière année U11 ambitieux, C = U11 en construction
  photo: text("photo"), // URL ou base64 si nécessaire
  poste: text("poste"), // ex: "Meneur", "Ailier", "Pivot"
  numeroDossard: text("numero_dossard"),
  commentaireGeneral: text("commentaire_general").default(""),
  archive: integer("archive", { mode: "boolean" }).notNull().default(false),
  dateCreation: text("date_creation").notNull(),
});

export const insertJoueurSchema = createInsertSchema(joueurs).omit({
  id: true,
  dateCreation: true,
});
export type InsertJoueur = z.infer<typeof insertJoueurSchema>;
export type Joueur = typeof joueurs.$inferSelect;

// ─── Fiches de suivi ─────────────────────────────────────────────────────────
export const fichesSuivi = sqliteTable("fiches_suivi", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  joueurId: integer("joueur_id").notNull().references(() => joueurs.id),
  saisonId: integer("saison_id").references(() => saisons.id),
  periodeDebut: text("periode_debut").notNull(),
  periodeFin: text("periode_fin").notNull(),
  pointsForts: text("points_forts").default(""),
  axesPrioritaires: text("axes_prioritaires").default(""),
  orientationEnvisagee: text("orientation_envisagee", {
    enum: ["U13", "U11", "indéfini"],
  }).default("indéfini"),
  dateCreation: text("date_creation").notNull(),
  dateModification: text("date_modification").notNull(),
});

export const insertFicheSuiviSchema = createInsertSchema(fichesSuivi).omit({
  id: true,
  dateCreation: true,
  dateModification: true,
});
export type InsertFicheSuivi = z.infer<typeof insertFicheSuiviSchema>;
export type FicheSuivi = typeof fichesSuivi.$inferSelect;

// ─── Évaluations techniques ───────────────────────────────────────────────────
// 5 niveaux : début / à_travailler / en_cours / acquis / maîtrise
export const TECH_NIVEAUX = ["début", "à_travailler", "en_cours", "acquis", "maîtrise"] as const;
export type TechNiveau = typeof TECH_NIVEAUX[number];

export const evaluationsTechniques = sqliteTable("evaluations_techniques", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheSuiviId: integer("fiche_suivi_id").notNull().references(() => fichesSuivi.id),
  // Compétences fixes standard
  dribbleMainDroite: text("dribble_main_droite").default("début"),
  dribbleMainGauche: text("dribble_main_gauche").default("début"),
  changementMain: text("changement_main").default("début"),
  tirCercleDroite: text("tir_cercle_droite").default("début"),
  tirCercleGauche: text("tir_cercle_gauche").default("début"),
  passeDeuxMains: text("passe_deux_mains").default("début"),
  passeUneMain: text("passe_une_main").default("début"),
  attraperSousPression: text("attraper_sous_pression").default("début"),
  comprehension1c1: text("comprehension_1c1").default("début"),
  duelsSimples: text("duels_simples").default("début"),
  placementSansBallon: text("placement_sans_ballon").default("début"),
  occupationEspaces: text("occupation_espaces").default("début"),
  // Compétences custom (JSON array of {id, libelle, niveau})
  competencesCustom: text("competences_custom").default("[]"),
  dateModification: text("date_modification"),
});

export const insertEvalTechSchema = createInsertSchema(evaluationsTechniques).omit({ id: true });
export type InsertEvalTech = z.infer<typeof insertEvalTechSchema>;
export type EvalTech = typeof evaluationsTechniques.$inferSelect;

// ─── Évaluations mentales ─────────────────────────────────────────────────────
// 5 pastilles : 1=difficultés / 2=fragile / 3=correct / 4=bien / 5=excellent
export const evaluationsMentales = sqliteTable("evaluations_mentales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheSuiviId: integer("fiche_suivi_id").notNull().references(() => fichesSuivi.id),
  concentration: integer("concentration").default(3),
  coachabilite: integer("coachabilite").default(3),
  gestionFrustration: integer("gestion_frustration").default(3),
  confianceMatch: integer("confiance_match").default(3),
  espritCollectif: integer("esprit_collectif").default(3),
  plaisirVisible: integer("plaisir_visible").default(3),
  commentaireGlobal: text("commentaire_global").default(""),
  // Compétences mentales custom (JSON array of {id, libelle, valeur})
  competencesCustom: text("competences_custom").default("[]"),
  dateModification: text("date_modification"),
});

export const insertEvalMentaleSchema = createInsertSchema(evaluationsMentales).omit({ id: true });
export type InsertEvalMentale = z.infer<typeof insertEvalMentaleSchema>;
export type EvalMentale = typeof evaluationsMentales.$inferSelect;

// ─── Objectifs individuels ────────────────────────────────────────────────────
export const objectifsIndividuels = sqliteTable("objectifs_individuels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheSuiviId: integer("fiche_suivi_id").notNull().references(() => fichesSuivi.id),
  type: text("type", { enum: ["TECHNIQUE", "MENTAL"] }).notNull(),
  libelle: text("libelle").notNull(),
  formulationEnfant: text("formulation_enfant").notNull(),
  statut: text("statut", { enum: ["En cours", "Atteint", "Abandonné"] })
    .notNull()
    .default("En cours"),
  dateCreation: text("date_creation").notNull(),
  dateModification: text("date_modification").notNull(),
});

export const insertObjectifSchema = createInsertSchema(objectifsIndividuels).omit({
  id: true,
  dateCreation: true,
  dateModification: true,
});
export type InsertObjectif = z.infer<typeof insertObjectifSchema>;
export type Objectif = typeof objectifsIndividuels.$inferSelect;

// ─── Observations datées (log d'observations par séance) ─────────────────────
export const observations = sqliteTable("observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheSuiviId: integer("fiche_suivi_id").notNull().references(() => fichesSuivi.id),
  auteurId: integer("auteur_id").notNull().references(() => users.id),
  dateSeance: text("date_seance").notNull(),
  contenu: text("contenu").notNull(),
  type: text("type", { enum: ["SEANCE", "MATCH", "GENERAL"] }).notNull().default("SEANCE"),
  dateCreation: text("date_creation").notNull(),
});

export const insertObservationSchema = createInsertSchema(observations).omit({
  id: true,
  dateCreation: true,
});
export type InsertObservation = z.infer<typeof insertObservationSchema>;
export type Observation = typeof observations.$inferSelect;

// ─── Notes internes (staff only) ─────────────────────────────────────────────
export const notesInternes = sqliteTable("notes_internes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheSuiviId: integer("fiche_suivi_id").notNull().references(() => fichesSuivi.id),
  auteurId: integer("auteur_id").notNull().references(() => users.id),
  contenu: text("contenu").notNull(),
  dateCreation: text("date_creation").notNull(),
  dateModification: text("date_modification").notNull(),
});

export const insertNoteInterneSchema = createInsertSchema(notesInternes).omit({
  id: true,
  dateCreation: true,
  dateModification: true,
});
export type InsertNoteInterne = z.infer<typeof insertNoteInterneSchema>;
export type NoteInterne = typeof notesInternes.$inferSelect;

// ─── Notes joueurs (joueur → visible par admins) ───────────────────────────────
export const notesJoueurs = sqliteTable("notes_joueurs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheSuiviId: integer("fiche_suivi_id").notNull().references(() => fichesSuivi.id),
  contenu: text("contenu").notNull(),
  dateCreation: text("date_creation").notNull(),
  luParAdmin: integer("lu_par_admin", { mode: "boolean" }).notNull().default(false),
});

export const insertNoteJoueurSchema = createInsertSchema(notesJoueurs).omit({ id: true });
export type InsertNoteJoueur = z.infer<typeof insertNoteJoueurSchema>;
export type NoteJoueur = typeof notesJoueurs.$inferSelect;

// ─── Types helper pour la fiche complète ─────────────────────────────────────
export type FicheComplete = {
  fiche: FicheSuivi;
  joueur: Joueur;
  evalTech: EvalTech | null;
  evalMentale: EvalMentale | null;
  objectifs: Objectif[];
  observations: Observation[];
  notesAdmin: NoteInterne[];
  noteJoueur: NoteJoueur | null;
};

// ─── Types helper compétences custom ─────────────────────────────────────────
export type CompetenceCustom = {
  id: string;
  libelle: string;
  niveau: TechNiveau | number; // string pour tech (niveau), number pour mental (1-5)
};
