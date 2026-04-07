import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "basket-u11-jwt-secret-2024";
const JWT_EXPIRES = "7d";

// ─── Extend Request ───────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      authUserId?: number;
      authRole?: string;
    }
  }
}

// ─── Middlewares auth ─────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Non authentifié" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: number; role: string };
    req.authUserId = payload.userId;
    req.authRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

// Peut lire les données (SUPER_ADMIN, ADMIN, READONLY)
function requireReadAccess(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!["SUPER_ADMIN", "ADMIN", "READONLY"].includes(req.authRole!)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    next();
  });
}

// Peut écrire des données (SUPER_ADMIN, ADMIN)
function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!["SUPER_ADMIN", "ADMIN"].includes(req.authRole!)) {
      return res.status(403).json({ error: "Accès refusé — écriture non autorisée" });
    }
    next();
  });
}

// Réservé au super admin uniquement
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.authRole !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Accès réservé au super administrateur" });
    }
    next();
  });
}

// Alias pratique pour conserver la compatibilité (ADMIN ou SUPER_ADMIN)
const requireAdmin = requireWriteAccess;

export async function registerRoutes(httpServer: Server, app: Express) {
  // ─── Bootstrap: créer les données initiales si DB vide ───────────────────
  const existingUsers = storage.getAllUsers();
  if (existingUsers.length === 0) {
    const hashedSuperAdmin = await bcrypt.hash("superadmin123", 10);
    storage.createUser({
      nom: "Super",
      prenom: "Admin",
      email: "superadmin@basket-u11.fr",
      role: "SUPER_ADMIN",
      password: hashedSuperAdmin,
      actif: true,
      dateCreation: new Date().toISOString(),
    } as any);

    const hashedAdmin = await bcrypt.hash("admin123", 10);
    storage.createUser({
      nom: "Rivoire",
      prenom: "Max",
      email: "admin@basket-u11.fr",
      role: "ADMIN",
      password: hashedAdmin,
      actif: true,
      dateCreation: new Date().toISOString(),
    } as any);

    // Seed : saison active
    const saison = storage.createSaison({
      libelle: "2024-2025",
      dateDebut: "2024-09-01",
      dateFin: "2025-06-30",
      active: true,
    });

    // Seed : 5 joueurs réalistes
    const joueursSeed = [
      { nom: "Rivoire Bemba", prenom: "Elyhas", dateNaissance: "2014-03-15", equipe: "U11-1" as const, profil: "A" as const, poste: "Meneur", numeroDossard: "5" },
      { nom: "Martin", prenom: "Lucas", dateNaissance: "2013-11-08", equipe: "U11-1" as const, profil: "B" as const, poste: "Ailier", numeroDossard: "7" },
      { nom: "Dubois", prenom: "Théo", dateNaissance: "2014-06-22", equipe: "U11-1" as const, profil: "C" as const, poste: "Pivot", numeroDossard: "11" },
      { nom: "Bernard", prenom: "Nathan", dateNaissance: "2013-09-14", equipe: "U11-2" as const, profil: "B" as const, poste: "Ailier fort", numeroDossard: "3" },
      { nom: "Petit", prenom: "Hugo", dateNaissance: "2014-01-30", equipe: "U11-2" as const, profil: "C" as const, poste: "Meneur", numeroDossard: "9" },
    ];

    // Créer un user joueur lié à Elyhas
    const hashedJoueur = await bcrypt.hash("elyhas123", 10);
    const userJoueur = storage.createUser({
      nom: "Rivoire Bemba",
      prenom: "Elyhas",
      email: "elyhas@basket-u11.fr",
      role: "JOUEUR",
      password: hashedJoueur,
      actif: true,
      dateCreation: new Date().toISOString(),
    } as any);

    // Créer un user readonly
    const hashedReadonly = await bcrypt.hash("readonly123", 10);
    storage.createUser({
      nom: "Dupont",
      prenom: "Sophie",
      email: "readonly@basket-u11.fr",
      role: "READONLY",
      password: hashedReadonly,
      actif: true,
      dateCreation: new Date().toISOString(),
    } as any);

    for (let i = 0; i < joueursSeed.length; i++) {
      const seedData = joueursSeed[i];
      const joueur = storage.createJoueur({
        ...seedData,
        userId: i === 0 ? userJoueur.id : null,
        dateCreation: new Date().toISOString(),
      } as any);

      // Créer une fiche pour chaque joueur
      const fiche = storage.createFiche({
        joueurId: joueur.id,
        saisonId: saison.id,
        periodeDebut: "2024-09-01",
        periodeFin: "2025-06-30",
        pointsForts: i === 0 ? "Excellent dribble main droite, très rapide, bonne lecture du jeu" : "",
        axesPrioritaires: i === 0 ? "Renforcer main gauche, améliorer les passes sous pression" : "",
        orientationEnvisagee: i === 0 ? "U13" : "indéfini",
      });

      // Eval technique pour le premier joueur
      if (i === 0) {
        storage.upsertEvalTech(fiche.id, {
          dribbleMainDroite: "maîtrise",
          dribbleMainGauche: "en_cours",
          changementMain: "acquis",
          tirCercleDroite: "acquis",
          tirCercleGauche: "à_travailler",
          passeDeuxMains: "acquis",
          passeUneMain: "en_cours",
          attraperSousPression: "à_travailler",
          comprehension1c1: "maîtrise",
          duelsSimples: "acquis",
          placementSansBallon: "en_cours",
          occupationEspaces: "en_cours",
        } as any);

        storage.upsertEvalMentale(fiche.id, {
          concentration: 4,
          coachabilite: 5,
          gestionFrustration: 3,
          confianceMatch: 4,
          espritCollectif: 5,
          plaisirVisible: 5,
          commentaireGlobal: "Joueur très motivé, excellent esprit d'équipe. Doit travailler sa gestion des moments difficiles.",
        } as any);

        storage.createObjectif({
          ficheSuiviId: fiche.id,
          type: "TECHNIQUE",
          libelle: "Améliorer dribble main gauche",
          formulationEnfant: "Je dribble aussi bien des deux mains",
          statut: "En cours",
        });

        storage.createObjectif({
          ficheSuiviId: fiche.id,
          type: "MENTAL",
          libelle: "Gérer la frustration en match",
          formulationEnfant: "Quand ça va pas, je reste calme et je continue",
          statut: "En cours",
        });

        // Observation de séance
        const adminUser = storage.getAllUsers().find(u => u.role === "ADMIN");
        if (adminUser) {
          storage.createObservation({
            ficheSuiviId: fiche.id,
            auteurId: adminUser.id,
            dateSeance: "2024-11-15",
            contenu: "Très bonne séance. Elyhas a montré de belles progressions sur les passes à deux mains. Quelques difficultés en situation de pression défensive.",
            type: "SEANCE",
          });
          storage.createObservation({
            ficheSuiviId: fiche.id,
            auteurId: adminUser.id,
            dateSeance: "2024-10-28",
            contenu: "Match contre Vichy. Elyhas a scoré 6 points. Excellente attitude, encourageait ses coéquipiers.",
            type: "MATCH",
          });
        }
      }
    }
    console.log("[bootstrap] Données initiales créées avec succès");
    console.log("[bootstrap] super_admin → superadmin@basket-u11.fr / superadmin123");
    console.log("[bootstrap] admin → admin@basket-u11.fr / admin123");
    console.log("[bootstrap] readonly → readonly@basket-u11.fr / readonly123");
    console.log("[bootstrap] joueur → elyhas@basket-u11.fr / elyhas123");
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
    const user = storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Identifiants incorrects" });
    if (!user.actif) return res.status(403).json({ error: "Compte désactivé. Contactez votre administrateur." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });
    storage.updateDerniereConnexion(user.id);
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({
      token,
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
    });
  });

  app.post("/api/auth/logout", (_req, res) => {
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = storage.getUserById(req.authUserId!);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    return res.json({ id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role });
  });

  // ─── Saisons (super_admin) ─────────────────────────────────────────────────
  app.get("/api/saisons", requireReadAccess, (_req, res) => {
    return res.json(storage.getAllSaisons());
  });

  app.get("/api/saisons/active", requireAuth, (_req, res) => {
    return res.json(storage.getSaisonActive() || null);
  });

  app.post("/api/saisons", requireSuperAdmin, (req, res) => {
    const { libelle, dateDebut, dateFin, active } = req.body;
    if (!libelle || !dateDebut || !dateFin) return res.status(400).json({ error: "Données manquantes" });
    const saison = storage.createSaison({ libelle, dateDebut, dateFin, active: active || false });
    return res.status(201).json(saison);
  });

  app.put("/api/saisons/:id", requireSuperAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateSaison(id, req.body);
    if (!updated) return res.status(404).json({ error: "Saison non trouvée" });
    return res.json(updated);
  });

  app.post("/api/saisons/:id/activer", requireSuperAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    storage.setSaisonActive(id);
    return res.json({ ok: true });
  });

  // ─── Users (super_admin) ───────────────────────────────────────────────────
  app.get("/api/users", requireReadAccess, (req, res) => {
    // READONLY ne peut pas voir la gestion des comptes
    if (req.authRole === "READONLY") return res.status(403).json({ error: "Accès refusé" });
    const allUsers = storage.getAllUsers().map(u => ({ ...u, password: undefined }));
    return res.json(allUsers);
  });

  app.post("/api/users", requireSuperAdmin, async (req, res) => {
    const { nom, prenom, email, role, password } = req.body;
    if (!nom || !prenom || !email || !password) return res.status(400).json({ error: "Champs manquants" });
    const existing = storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email déjà utilisé" });
    const hashed = await bcrypt.hash(password, 10);
    const user = storage.createUser({
      nom, prenom, email,
      role: role || "JOUEUR",
      password: hashed,
      actif: true,
      dateCreation: new Date().toISOString(),
    } as any);
    return res.status(201).json({ ...user, password: undefined });
  });

  app.put("/api/users/:id", requireSuperAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nom, prenom, email, role, password, actif } = req.body;
    const updates: any = {};
    if (nom !== undefined) updates.nom = nom;
    if (prenom !== undefined) updates.prenom = prenom;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (actif !== undefined) updates.actif = actif;
    if (password) updates.password = await bcrypt.hash(password, 10);
    const updated = storage.updateUser(id, updates);
    if (!updated) return res.status(404).json({ error: "Utilisateur non trouvé" });
    return res.json({ ...updated, password: undefined });
  });

  app.delete("/api/users/:id", requireSuperAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    if (id === req.authUserId) return res.status(400).json({ error: "Impossible de supprimer son propre compte" });
    storage.deleteUser(id);
    return res.json({ ok: true });
  });

  // ─── Joueurs ───────────────────────────────────────────────────────────────
  app.get("/api/joueurs", requireAuth, (req, res) => {
    if (req.authRole === "JOUEUR") {
      const joueur = storage.getJoueurByUserId(req.authUserId!);
      return res.json(joueur ? [joueur] : []);
    }
    const includeArchived = req.query.archived === "true";
    return res.json(storage.getAllJoueurs(includeArchived));
  });

  app.get("/api/joueurs/:id", requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const joueur = storage.getJoueurById(id);
    if (!joueur) return res.status(404).json({ error: "Joueur non trouvé" });
    if (req.authRole === "JOUEUR") {
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== id) return res.status(403).json({ error: "Accès refusé" });
    }
    return res.json(joueur);
  });

  app.post("/api/joueurs", requireAdmin, (req, res) => {
    const { nom, prenom, dateNaissance, equipe, profil, userId, poste, numeroDossard, commentaireGeneral } = req.body;
    if (!nom || !prenom) return res.status(400).json({ error: "Nom et prénom requis" });
    const joueur = storage.createJoueur({
      nom, prenom, dateNaissance, equipe: equipe || "U11-1",
      profil: profil || "C", userId: userId || null,
      poste, numeroDossard, commentaireGeneral,
    } as any);
    // Créer automatiquement une fiche de suivi pour la saison active
    const saisonActive = storage.getSaisonActive();
    if (saisonActive) {
      const today = new Date().toISOString().split("T")[0];
      storage.createFiche({
        joueurId: joueur.id,
        saisonId: saisonActive.id,
        periodeDebut: saisonActive.dateDebut || today,
        periodeFin: saisonActive.dateFin || today,
        pointsForts: "",
        axesPrioritaires: "",
        orientationEnvisagee: "Non déterminé",
      });
    }
    return res.status(201).json(joueur);
  });

  app.put("/api/joueurs/:id", requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateJoueur(id, req.body);
    if (!updated) return res.status(404).json({ error: "Joueur non trouvé" });
    return res.json(updated);
  });

  app.post("/api/joueurs/:id/archiver", requireAdmin, (req, res) => {
    storage.archiveJoueur(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  app.post("/api/joueurs/:id/desarchiver", requireAdmin, (req, res) => {
    storage.desarchiverJoueur(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  app.delete("/api/joueurs/:id", requireSuperAdmin, (req, res) => {
    storage.deleteJoueur(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  // ─── Fiches suivi ──────────────────────────────────────────────────────────
  app.get("/api/joueurs/:joueurId/fiches", requireAuth, (req, res) => {
    const joueurId = parseInt(req.params.joueurId);
    if (req.authRole === "JOUEUR") {
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== joueurId) return res.status(403).json({ error: "Accès refusé" });
    }
    return res.json(storage.getFichesByJoueurId(joueurId));
  });

  app.get("/api/fiches/:id", requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const fiche = storage.getFicheById(id);
    if (!fiche) return res.status(404).json({ error: "Fiche non trouvée" });
    if (req.authRole === "JOUEUR") {
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== fiche.joueurId) return res.status(403).json({ error: "Accès refusé" });
    }
    return res.json(fiche);
  });

  app.post("/api/joueurs/:joueurId/fiches", requireAdmin, (req, res) => {
    const joueurId = parseInt(req.params.joueurId);
    const { periodeDebut, periodeFin, pointsForts, axesPrioritaires, orientationEnvisagee, saisonId } = req.body;
    if (!periodeDebut || !periodeFin) return res.status(400).json({ error: "Période requise" });
    const fiche = storage.createFiche({
      joueurId, periodeDebut, periodeFin,
      pointsForts, axesPrioritaires, orientationEnvisagee, saisonId,
    });
    return res.status(201).json(fiche);
  });

  app.put("/api/fiches/:id", requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateFiche(id, req.body);
    if (!updated) return res.status(404).json({ error: "Fiche non trouvée" });
    return res.json(updated);
  });

  app.delete("/api/fiches/:id", requireAdmin, (req, res) => {
    storage.deleteFiche(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  // ─── Fiche complète (tout en un appel) ────────────────────────────────────
  app.get("/api/fiches/:id/full", requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const fiche = storage.getFicheById(id);
    if (!fiche) return res.status(404).json({ error: "Fiche non trouvée" });
    if (req.authRole === "JOUEUR") {
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== fiche.joueurId) return res.status(403).json({ error: "Accès refusé" });
    }
    const joueur = storage.getJoueurById(fiche.joueurId);
    const evalTech = storage.getEvalTechByFicheId(id);
    const evalMentale = storage.getEvalMentaleByFicheId(id);
    const objectifs = storage.getObjectifsByFicheId(id);
    const obs = storage.getObservationsByFicheId(id);
    const noteJoueur = storage.getNoteJoueurByFicheId(id);
    const notesAdmin = ["SUPER_ADMIN", "ADMIN", "READONLY"].includes(req.authRole!)
      ? storage.getNotesByFicheId(id)
      : [];
    return res.json({ fiche, joueur, evalTech, evalMentale, objectifs, observations: obs, notesAdmin, noteJoueur });
  });

  // ─── Eval technique ────────────────────────────────────────────────────────
  app.put("/api/fiches/:ficheId/eval-tech", requireAdmin, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const result = storage.upsertEvalTech(ficheId, req.body);
    return res.json(result);
  });

  // ─── Eval mentale ──────────────────────────────────────────────────────────
  app.put("/api/fiches/:ficheId/eval-mentale", requireAdmin, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const result = storage.upsertEvalMentale(ficheId, req.body);
    return res.json(result);
  });

  // ─── Objectifs ─────────────────────────────────────────────────────────────
  app.get("/api/fiches/:ficheId/objectifs", requireAuth, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    return res.json(storage.getObjectifsByFicheId(ficheId));
  });

  app.post("/api/fiches/:ficheId/objectifs", requireAdmin, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const { type, libelle, formulationEnfant, statut } = req.body;
    if (!type || !libelle || !formulationEnfant) return res.status(400).json({ error: "Données manquantes" });
    const obj = storage.createObjectif({
      ficheSuiviId: ficheId, type, libelle, formulationEnfant, statut: statut || "En cours",
    });
    return res.status(201).json(obj);
  });

  app.put("/api/objectifs/:id", requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateObjectif(id, req.body);
    if (!updated) return res.status(404).json({ error: "Objectif non trouvé" });
    return res.json(updated);
  });

  app.delete("/api/objectifs/:id", requireAdmin, (req, res) => {
    storage.deleteObjectif(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  // ─── Observations ──────────────────────────────────────────────────────────
  app.get("/api/fiches/:ficheId/observations", requireAuth, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    return res.json(storage.getObservationsByFicheId(ficheId));
  });

  app.post("/api/fiches/:ficheId/observations", requireAdmin, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const { dateSeance, contenu, type } = req.body;
    if (!dateSeance || !contenu) return res.status(400).json({ error: "Date et contenu requis" });
    const obs = storage.createObservation({
      ficheSuiviId: ficheId,
      auteurId: req.authUserId!,
      dateSeance, contenu,
      type: type || "SEANCE",
    });
    return res.status(201).json(obs);
  });

  app.put("/api/observations/:id", requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateObservation(id, req.body);
    if (!updated) return res.status(404).json({ error: "Observation non trouvée" });
    return res.json(updated);
  });

  app.delete("/api/observations/:id", requireAdmin, (req, res) => {
    storage.deleteObservation(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  // ─── Notes internes (staff) ────────────────────────────────────────────────
  app.get("/api/fiches/:ficheId/notes", requireReadAccess, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    return res.json(storage.getNotesByFicheId(ficheId));
  });

  app.post("/api/fiches/:ficheId/notes", requireAdmin, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const { contenu } = req.body;
    if (!contenu) return res.status(400).json({ error: "Contenu requis" });
    const note = storage.createNote({
      ficheSuiviId: ficheId,
      auteurId: req.authUserId!,
      contenu,
    });
    return res.status(201).json(note);
  });

  app.put("/api/notes/:id", requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const { contenu } = req.body;
    if (!contenu) return res.status(400).json({ error: "Contenu requis" });
    const updated = storage.updateNote(id, contenu);
    if (!updated) return res.status(404).json({ error: "Note non trouvée" });
    return res.json(updated);
  });

  app.delete("/api/notes/:id", requireAdmin, (req, res) => {
    storage.deleteNote(parseInt(req.params.id));
    return res.json({ ok: true });
  });

  // ─── Notes joueurs ─────────────────────────────────────────────────────────
  app.get("/api/fiches/:ficheId/note-joueur", requireAuth, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const fiche = storage.getFicheById(ficheId);
    if (!fiche) return res.status(404).json({ error: "Fiche non trouvée" });
    if (req.authRole === "JOUEUR") {
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== fiche.joueurId) return res.status(403).json({ error: "Accès refusé" });
    }
    return res.json(storage.getNoteJoueurByFicheId(ficheId) || null);
  });

  app.put("/api/fiches/:ficheId/note-joueur", requireAuth, (req, res) => {
    const ficheId = parseInt(req.params.ficheId);
    const fiche = storage.getFicheById(ficheId);
    if (!fiche) return res.status(404).json({ error: "Fiche non trouvée" });
    if (req.authRole === "JOUEUR") {
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== fiche.joueurId) return res.status(403).json({ error: "Accès refusé" });
    }
    const { contenu } = req.body;
    return res.json(storage.upsertNoteJoueur(ficheId, contenu || ""));
  });

  app.patch("/api/fiches/:ficheId/note-joueur/lue", requireAdmin, (req, res) => {
    storage.marquerNoteLue(parseInt(req.params.ficheId));
    return res.json({ ok: true });
  });

  app.get("/api/notes-joueurs/non-lues", requireAdmin, (req, res) => {
    const rows = storage.getJoueursAvecNoteNonLue();
    const joueurIds = [...new Set(rows.map(r => r.joueurId))];
    return res.json(joueurIds);
  });
}
