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
  // ─── Bootstrap: créer les données de production ──────────────────────────────
  // Source: logs Railway 2026-03-31 → 2026-04-08 (CERTAIN)
  // Se déclenche si :
  //   1. DB vide (premier démarrage)
  //   2. DB contient uniquement les données de démo (Lucas Martin, etc.)
  //   3. Variable d'environnement FORCE_RESEED=true
  const existingUsers = storage.getAllUsers();
  const existingJoueurs = storage.getAllJoueurs();
  const hasDemoData = existingJoueurs.some((j: any) => j.nom === "Martin" && j.prenom === "Lucas");
  const forceReseed = process.env.FORCE_RESEED === "true";
  const needsBootstrap = existingUsers.length === 0 || hasDemoData || forceReseed;

  if (needsBootstrap) {
    // Nettoyer les données de démo si elles existent
    if (hasDemoData || forceReseed) {
      console.log("[bootstrap] Nettoyage des données de démo...");
      const db = (storage as any).db;
      if (db) {
        const tables = ["objectifs_individuels","observations","notes_internes","notes_joueurs","evaluations_techniques","evaluations_mentales","fiches_suivi","joueurs","saisons","users"];
        for (const t of tables) db.prepare("DELETE FROM " + t).run();
        console.log("[bootstrap] Données de démo supprimées");
      }
    }

    // ── Saison ──────────────────────────────────────────────────────────────
    const saison = storage.createSaison({
      libelle: "2024-2025",
      dateDebut: "2024-09-01",
      dateFin:   "2025-06-30",
      active: true,
    });

    // ── Comptes utilisateurs (staff) ─────────────────────────────────────────
    const hashSuperAdmin = await bcrypt.hash("superadmin123", 10);
    storage.createUser({ nom:"Super",      prenom:"Admin",    email:"superadmin@basket-u11.fr", role:"SUPER_ADMIN", password:hashSuperAdmin, actif:true, dateCreation:new Date().toISOString() } as any);

    const hashAdmin = await bcrypt.hash("admin123", 10);
    storage.createUser({ nom:"Rivoire",    prenom:"Max",      email:"admin@basket-u11.fr",      role:"ADMIN",       password:hashAdmin,      actif:true, dateCreation:new Date().toISOString() } as any);

    const hashNico = await bcrypt.hash("basket2025!", 10);
    storage.createUser({ nom:"Montelion",  prenom:"Nicolas",  email:"nico@basket-u11.fr",       role:"ADMIN",       password:hashNico,       actif:true, dateCreation:new Date().toISOString() } as any);

    const hashNoe = await bcrypt.hash("basket2025!", 10);
    storage.createUser({ nom:"Remark",     prenom:"Noé",      email:"noe@basket-u11.fr",        role:"ADMIN",       password:hashNoe,        actif:true, dateCreation:new Date().toISOString() } as any);

    // ── Comptes joueurs ──────────────────────────────────────────────────────
    const mkPwd = async (p: string) => bcrypt.hash(p, 10);

    const uElyhas   = storage.createUser({ nom:"Rivoire Bemba",       prenom:"Elyhas",      email:"elyhas@basket-u11.fr",    role:"JOUEUR", password:await mkPwd("elyhas123"),  actif:true, dateCreation:new Date().toISOString() } as any);
    const uNaiyl    = storage.createUser({ nom:"Mahamat",              prenom:"Naiyl",       email:"naiyl@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uAmir     = storage.createUser({ nom:"Ait Bari",             prenom:"Amir",        email:"amir@basket-u11.fr",      role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uAzzam    = storage.createUser({ nom:"Bedja Boana",          prenom:"Azzam",       email:"azzam@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uElma     = storage.createUser({ nom:"Clopon Thezenas",      prenom:"Elma",        email:"elma@basket-u11.fr",      role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uGodswill = storage.createUser({ nom:"Okorie",               prenom:"Godswill",    email:"godswill@basket-u11.fr",  role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uHenika   = storage.createUser({ nom:"Havanaby",             prenom:"Henika",      email:"henika@basket-u11.fr",    role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uIneza    = storage.createUser({ nom:"Nkiampila",            prenom:"Ineza",       email:"ineza@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uIsaac    = storage.createUser({ nom:"Chatard",              prenom:"Isaac",       email:"isaac@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uJose     = storage.createUser({ nom:"Antonio",              prenom:"José Bryant", email:"joseb@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uLaeny    = storage.createUser({ nom:"Mossier Heraud",       prenom:"Laeny",       email:"laeny@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uLiyam    = storage.createUser({ nom:"Diagne Tabach",        prenom:"Liyam",       email:"liyam@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uMack     = storage.createUser({ nom:"Etou",                 prenom:"Mack Joy",    email:"mack@basket-u11.fr",      role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uMaxT     = storage.createUser({ nom:"Trauchessec",          prenom:"Max",         email:"max@basket-u11.fr",       role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uPaul     = storage.createUser({ nom:"Lacassagne",           prenom:"Paul",        email:"paul@basket-u11.fr",      role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uTiago    = storage.createUser({ nom:"Imarre",               prenom:"Tiago",       email:"tiago@basket-u11.fr",     role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uZachary  = storage.createUser({ nom:"Smith",                prenom:"Zachary",     email:"zachary@basket-u11.fr",   role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uTeza     = storage.createUser({ nom:"Boguslawski Bernard",  prenom:"Téza",        email:"teza@basket-u11.fr",      role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);
    const uMoudjib  = storage.createUser({ nom:"Fatmi",                prenom:"Moudjib",     email:"moudjib@basket-u11.fr",   role:"JOUEUR", password:await mkPwd("basket2025!"),actif:true, dateCreation:new Date().toISOString() } as any);

    // ── Joueurs ──────────────────────────────────────────────────────────────
    const mkJ = (nom:string, prenom:string, ddn:string, eq:"U11-1"|"U11-2", pr:"A"|"B"|"C", uid:number) =>
      storage.createJoueur({ nom, prenom, dateNaissance:ddn, equipe:eq, profil:pr, poste:"", numeroDossard:"", commentaireGeneral:"", userId:uid, archive:false, dateCreation:new Date().toISOString() } as any);

    const jElyhas   = mkJ("Rivoire Bemba",       "Elyhas",      "2015-11-15", "U11-2", "A", uElyhas.id);
    const jNaiyl    = mkJ("Mahamat",              "Naiyl",       "2015-10-23", "U11-1", "A", uNaiyl.id);
    const jAmir     = mkJ("Ait Bari",             "Amir",        "",           "U11-1", "B", uAmir.id);
    const jAzzam    = mkJ("Bedja Boana",          "Azzam",       "",           "U11-1", "A", uAzzam.id);
    const jElma     = mkJ("Clopon Thezenas",      "Elma",        "",           "U11-2", "A", uElma.id);
    const jGodswill = mkJ("Okorie",               "Godswill",    "",           "U11-2", "B", uGodswill.id);
    const jHenika   = mkJ("Havanaby",             "Henika",      "",           "U11-1", "A", uHenika.id);
    const jIneza    = mkJ("Nkiampila",            "Ineza",       "",           "U11-2", "A", uIneza.id);
    const jIsaac    = mkJ("Chatard",              "Isaac",       "",           "U11-1", "B", uIsaac.id);
    const jJose     = mkJ("Antonio",              "José Bryant", "",           "U11-2", "A", uJose.id);
    const jLaeny    = mkJ("Mossier Heraud",       "Laeny",       "",           "U11-2", "A", uLaeny.id);
    const jLiyam    = mkJ("Diagne Tabach",        "Liyam",       "",           "U11-2", "A", uLiyam.id);
    const jMack     = mkJ("Etou",                 "Mack Joy",    "",           "U11-2", "A", uMack.id);
    const jMaxT     = mkJ("Trauchessec",          "Max",         "",           "U11-1", "A", uMaxT.id);
    const jPaul     = mkJ("Lacassagne",           "Paul",        "",           "U11-1", "A", uPaul.id);
    const jTiago    = mkJ("Imarre",               "Tiago",       "",           "U11-2", "C", uTiago.id);
    const jZachary  = mkJ("Smith",                "Zachary",     "",           "U11-1", "C", uZachary.id);
    const jTeza     = mkJ("Boguslawski Bernard",  "Téza",        "",           "U11-2", "A", uTeza.id);
    const jMoudjib  = mkJ("Fatmi",                "Moudjib",     "",           "U11-2", "A", uMoudjib.id);

    // ── Fiches de suivi ──────────────────────────────────────────────────────
    const mkF = (joueurId:number, orientation:string, pf="", ax="") =>
      storage.createFiche({ joueurId, saisonId:saison.id, periodeDebut:"2026-03-30", periodeFin:"2025-06-30", pointsForts:pf, axesPrioritaires:ax, orientationEnvisagee:orientation } as any);

    const fElyhas   = mkF(jElyhas.id,   "U13");
    const fNaiyl    = mkF(jNaiyl.id,    "U13");
    const fAmir     = mkF(jAmir.id,     "Non déterminé");
    const fAzzam    = mkF(jAzzam.id,    "Non déterminé");
    const fElma     = mkF(jElma.id,     "U13",
      "Très bonne vitesse, sens du collectif, cherche à faire la bonne passe",
      "finition en double pas (plus de douceur sur la finition) , shoot, positionnement");
    const fGodswill = mkF(jGodswill.id, "Non déterminé");
    const fHenika   = mkF(jHenika.id,   "Non déterminé");
    const fIneza    = mkF(jIneza.id,    "U13");
    const fIsaac    = mkF(jIsaac.id,    "Non déterminé");
    const fJose     = mkF(jJose.id,     "Non déterminé");
    const fLaeny    = mkF(jLaeny.id,    "Non déterminé");
    const fLiyam    = mkF(jLiyam.id,    "Non déterminé");
    const fMack     = mkF(jMack.id,     "Non déterminé");
    const fMaxT     = mkF(jMaxT.id,     "Non déterminé");
    const fPaul     = mkF(jPaul.id,     "Non déterminé");
    const fTiago    = mkF(jTiago.id,    "Non déterminé");
    const fZachary  = mkF(jZachary.id,  "Non déterminé");
    const fTeza     = mkF(jTeza.id,     "Non déterminé");
    const fMoudjib  = mkF(jMoudjib.id,  "U13");

    // ── Évaluations techniques ───────────────────────────────────────────────
    type Niveaux = { dribbleMainDroite:string; dribbleMainGauche:string; changementMain:string; tirCercleDroite:string; tirCercleGauche:string; passeDeuxMains:string; passeUneMain:string; attraperSousPression:string; comprehension1c1:string; duelsSimples:string; placementSansBallon:string; occupationEspaces:string };
    const mkET = (ficheId:number, v:Niveaux) => storage.upsertEvalTech(ficheId, { ...v, competencesCustom:"[]" } as any);

    mkET(fElyhas.id,   { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"en_cours",    tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"à_travailler", attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"à_travailler", placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fNaiyl.id,    { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fAmir.id,     { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fAzzam.id,    { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fElma.id,     { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"en_cours", tirCercleGauche:"en_cours",    passeDeuxMains:"à_travailler",passeUneMain:"à_travailler", attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fHenika.id,   { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fIneza.id,    { dribbleMainDroite:"acquis",   dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours", tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"en_cours",     attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"à_travailler" });
    mkET(fIsaac.id,    { dribbleMainDroite:"acquis",   dribbleMainGauche:"acquis",      changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"acquis",      passeDeuxMains:"en_cours",    passeUneMain:"acquis",       attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fJose.id,     { dribbleMainDroite:"en_cours", dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours", tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"à_travailler",duelsSimples:"à_travailler", placementSansBallon:"à_travailler",occupationEspaces:"en_cours" });
    mkET(fLaeny.id,    { dribbleMainDroite:"en_cours", dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours", tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"à_travailler",duelsSimples:"en_cours",     placementSansBallon:"à_travailler",occupationEspaces:"à_travailler" });
    mkET(fLiyam.id,    { dribbleMainDroite:"en_cours", dribbleMainGauche:"à_travailler",changementMain:"à_travailler",tirCercleDroite:"en_cours", tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"à_travailler", placementSansBallon:"à_travailler",occupationEspaces:"à_travailler" });
    mkET(fMaxT.id,     { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fPaul.id,     { dribbleMainDroite:"acquis",   dribbleMainGauche:"en_cours",    changementMain:"acquis",      tirCercleDroite:"acquis",   tirCercleGauche:"en_cours",    passeDeuxMains:"acquis",      passeUneMain:"acquis",       attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"acquis",       placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fTiago.id,    { dribbleMainDroite:"début",    dribbleMainGauche:"début",       changementMain:"début",       tirCercleDroite:"début",    tirCercleGauche:"début",       passeDeuxMains:"début",       passeUneMain:"début",        attraperSousPression:"début",       comprehension1c1:"début",       duelsSimples:"début",        placementSansBallon:"début",       occupationEspaces:"début" });
    mkET(fZachary.id,  { dribbleMainDroite:"en_cours", dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours", tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"à_travailler",duelsSimples:"à_travailler", placementSansBallon:"à_travailler",occupationEspaces:"à_travailler" });
    mkET(fTeza.id,     { dribbleMainDroite:"en_cours", dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours", tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"en_cours",     attraperSousPression:"en_cours",    comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"en_cours",    occupationEspaces:"en_cours" });
    mkET(fMoudjib.id,  { dribbleMainDroite:"en_cours", dribbleMainGauche:"à_travailler",changementMain:"en_cours",    tirCercleDroite:"en_cours", tirCercleGauche:"à_travailler",passeDeuxMains:"en_cours",    passeUneMain:"à_travailler", attraperSousPression:"à_travailler",comprehension1c1:"en_cours",    duelsSimples:"en_cours",     placementSansBallon:"à_travailler",occupationEspaces:"en_cours" });

    // ── Évaluations mentales ─────────────────────────────────────────────────
    const mkEM = (ficheId:number, c:number, co:number, f:number, cm:number, ec:number, pv:number, comment:string) =>
      storage.upsertEvalMentale(ficheId, { concentration:c, coachabilite:co, gestionFrustration:f, confianceMatch:cm, espritCollectif:ec, plaisirVisible:pv, commentaireGlobal:comment, competencesCustom:"[]" } as any);

    mkEM(fElyhas.id,  3,2,2,3,3,2, "Joueur très motivé, excellent esprit d'équipe. Doit travailler sa gestion des moments difficiles.");
    mkEM(fAzzam.id,   3,4,3,3,3,3, "");
    mkEM(fElma.id,    4,5,3,3,4,4, "Très bonne energie qui rayonne sur l'equipe, continue de t'appliquer toujours autant. Les progrès se voient, pour faire encore mieux, mets autant d'energie à l'entrainement qu'en match . ");
    mkEM(fIneza.id,   3,4,4,4,3,3, "très bonne energie en match, beaucoup de sérieux. Pour des progrès encore plus rapide, essaie de mettre autant d'energie à l'entrainement qu'en match ! ");
    mkEM(fJose.id,    3,4,3,4,3,4, "ton energie est très précieuse et rayonne sur l'equipe, continue comme ça, tu progresses. Bravo");
    mkEM(fLaeny.id,   2,4,3,4,3,3, "Continue d'avoir confiance en toi, ça se voit et c'est une très bonne chose. Essaie d'être un peu plus concentré aux entrainements pour progresser encore plus. ");
    mkEM(fTiago.id,   4,4,4,2,4,4, "Super energie, Continue d'être aussi appliqué, de ne rien lâcher,  aie confiance en toi , les progrès se voient. ");
    mkEM(fZachary.id, 3,4,3,4,2,2, "Tu es un jeune garçon discret. En match n'hésites pas à encourager tes coéquipiers, tu progresses bien, continue à être concentré et confiant aux matchs comme aux entrainements. ");
    mkEM(fTeza.id,    5,4,3,4,3,3, "Ta concentration et ton sérieux sont des exemples,  continue comme ça. Les progrès sont visibles, bravo ");

    // ── Objectifs individuels ────────────────────────────────────────────────
    const mkO = (ficheSuiviId:number, type:string, libelle:string, formulation:string) =>
      storage.createObjectif({ ficheSuiviId, type, libelle, formulationEnfant:formulation, statut:"En cours" } as any);

    // Elyhas
    mkO(fElyhas.id, "TECHNIQUE", "Améliorer le changement de rythme", "Je veux améliorer mon changement de rythme (cross) pour  être plus efficace pour passer mon défenseur");
    mkO(fElyhas.id, "TECHNIQUE", "Améliorer ma vision de jeu", "Je veux améliorer ma vision de jeu pour mieux me placer et me déplacer (coupe, drive, passes) pour mieux aider l'équipe");
    mkO(fElyhas.id, "MENTAL",    "Gestions des émotions", "J'aimerais arriver à mieux gérer mes émotions quand ça ne va pas sur le terrain pour rester concentré");
    // Naiyl
    mkO(fNaiyl.id,  "TECHNIQUE", "Améliorer la vision de jeu", "Je veux améliorer ma vision de jeu pour etre plus efficace sur me déplacement et mes passes");
    mkO(fNaiyl.id,  "TECHNIQUE", "Améliorer le shoot", "Je veux améliorer mon shoot dans sa forme pour être plus efficace et mon double pas");
    mkO(fNaiyl.id,  "MENTAL",    "Rester calme", "J'aimerais rester calme face aux décisions de l'arbitre que je juge injuste ");
    // Amir
    mkO(fAmir.id,   "TECHNIQUE", "Améliorer le shoot", "Je veux améliorer la forme de mon shoot et ma réussite");
    mkO(fAmir.id,   "TECHNIQUE", "Améliorer défense porteur / non porteur", "Je veux m'améliorer sur la défense sur le porteur de balle et le  non porteur");
    // Azzam
    mkO(fAzzam.id,  "TECHNIQUE", "Améliorer la finition", "« J'arrive à tirer en course avec opposition en lay-up, power, lay-back avec réussite »");
    mkO(fAzzam.id,  "TECHNIQUE", "Accepter le contact", "Arriver à mieux contacter mon joueur quand je suis en défense. Accepter le contact offensif sur mes attaques");
    mkO(fAzzam.id,  "MENTAL",    "être moins frustrer par les coéquipiers", "J'aimerais prendre plus confiance pour parler sur le terrain à mes coéquipiers  pour qu'on joue plus collectif");
    // Elma
    mkO(fElma.id,   "TECHNIQUE", "Améliorer la finition", "Je veux améliorer ma finition en double pas, lay up ou power");
    mkO(fElma.id,   "TECHNIQUE", "Améliorer la vision de jeu", "Je veux améliorer ma vision du jeu pour faire de meilleurs passes et aider l'équipe");
    mkO(fElma.id,   "MENTAL",    "Mieux gérer la frustration", "J'aimerais moins m'énerver quand je rate un panier ou une action facile");
    // Henika
    mkO(fHenika.id, "TECHNIQUE", "Améliorer la défense sur le porteur", "J'aimerais améliorer ma défense sur le porteur du ballon  pour l'empêcher de passer");
    mkO(fHenika.id, "TECHNIQUE", "Améliorer le shoot", "J'aimerais améliorer mon shoot et sa forme pour avoir plus de réussite");
    // Ineza
    mkO(fIneza.id,  "TECHNIQUE", "Améliorer le shoot", "Je veux améliorer la forme de mon shoot et ma réussite");
    mkO(fIneza.id,  "TECHNIQUE", "Améliorer le dribble", "Je veux améliorer mon dribble main droite et main gauche pour être plus à l'aise");
    mkO(fIneza.id,  "MENTAL",    "Gestion de la frustration", "J'aimerais arriver à être moins frustré quand quelque chose sur le terrain se passe mal");
    // Isaac
    mkO(fIsaac.id,  "TECHNIQUE", "Améliorer la réussite au lancer franc", "Je veux m'améliorer au lancer franc pour assurer les points de l'équipe");
    mkO(fIsaac.id,  "TECHNIQUE", "Améliorer le tir en course", "Je veux améliorer mon tir en course, lay-up, lay-back, pour avoir une meilleur réussite");
    // José Bryant
    mkO(fJose.id,   "TECHNIQUE", "Améliorer ma défense", "Je veux m'améliorer en défense, arriver à cadrer mon joueur sans faire faute");
    mkO(fJose.id,   "TECHNIQUE", "Améliorer les passes", "Je veux améliorer ma technique de passe pour mieux aider l'équipe");
    mkO(fJose.id,   "MENTAL",    "Rester calme", "J'aimerais rester calme quand l'arbitre fait une erreur");
    // Laeny
    mkO(fLaeny.id,  "TECHNIQUE", "Améliorer la défense", "Je veux m'améliorer en défense sur le porteur du ballon et le non porteur pour limiter les paniers adverses");
    mkO(fLaeny.id,  "TECHNIQUE", "Améliorer le shoot", "Je veux améliorer ma technique de shoot pour être plus efficace");
    // Liyam
    mkO(fLiyam.id,  "TECHNIQUE", "Améliorer le dribble", "J'aimerais améliorer mon dribble main droite et gauche pour être plus a l'aise sur le terrain");
    mkO(fLiyam.id,  "TECHNIQUE", "Améliorer le shoot", "J'aimerais améliorer mon shoot pour être plus efficace");
    // Max Trauchessec
    mkO(fMaxT.id,   "TECHNIQUE", "Aller plus vite au panier", "Je veux aller plus vite et plus fort au panier en double pas ou en power, et être plus décisif");
    mkO(fMaxT.id,   "TECHNIQUE", "Améliorer  le dribble", "Je veux améliorer mon dribble main droite main gauche pour être plus efficace et à l'aise");
    // Paul
    mkO(fPaul.id,   "TECHNIQUE", "Améliorer l'adresse au shoot", "J'aimerais être plus adroit avec mon shoot");
    mkO(fPaul.id,   "TECHNIQUE", "Amélioration en défense", "J'aimerais moins chercher la balle en défense et mieux bloqué mon adversaire ");
    // Zachary
    mkO(fZachary.id,"TECHNIQUE", "Améliorer la défense", "Je veux m'améliorer sur la défense porteur et non porteur du ballon pour mieux aider l'équipe");
    mkO(fZachary.id,"TECHNIQUE", "Améliorer le double pas", "Je veux améliorer mon double pas, lay up, pour être plus efficace et mieux aider l'équipe");
    // Téza
    mkO(fTeza.id,   "TECHNIQUE", "Améliorer le double pas", "Je veux améliorer mon double pas en lay-up, pour être plus efficace et aider l'équipe");
    mkO(fTeza.id,   "TECHNIQUE", "Améliorer le dribble ", "Je veux améliorer mon dribble pour être plus à l'aise sur le terrain");
    mkO(fTeza.id,   "MENTAL",    "Rester calme", "J'aimerais rester calme lorsqu'il a des fautes qui ne sont pas sifflées par l'arbitre");
    // Moudjib
    mkO(fMoudjib.id,"TECHNIQUE", "Améliorer ma défense ", "Je veux m'améliorer en défense pour empêcher mon adversaire de marquer");
    mkO(fMoudjib.id,"TECHNIQUE", "Améliorer le shoot", "J'aimerais améliorer mon tir de loin ");

    console.log("[bootstrap] ✅ 19 joueurs + fiches + évaluations + objectifs créés (données production restaurées)");
    console.log("[bootstrap] superadmin@basket-u11.fr / superadmin123");
    console.log("[bootstrap] admin@basket-u11.fr / admin123");
    console.log("[bootstrap] Joueurs: mot de passe basket2025! (à changer via Utilisateurs)");
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
    // Sécurité : un joueur ne peut accéder qu'à ses propres observations
    if (req.authRole === "JOUEUR") {
      const fiche = storage.getFicheById(ficheId);
      if (!fiche) return res.status(404).json({ error: "Fiche non trouvée" });
      const myJoueur = storage.getJoueurByUserId(req.authUserId!);
      if (!myJoueur || myJoueur.id !== fiche.joueurId) {
        return res.status(403).json({ error: "Accès refusé" });
      }
    }
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
