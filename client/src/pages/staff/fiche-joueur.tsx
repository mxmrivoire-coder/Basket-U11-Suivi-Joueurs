import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, FileDown, Plus, Trash2, Save,
  Target, Brain, Dumbbell, MessageSquare, StickyNote,
  PlusCircle, CheckCircle2, XCircle, Clock, Eye,
  FileText, Calendar, ChevronDown, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Joueur, FicheSuivi, EvalTech, EvalMentale, Objectif, NoteInterne, Observation, NoteJoueur } from "@shared/schema";
import { exportFicheJoueurPDF } from "@/lib/pdf-export";

// ─── Types locaux ──────────────────────────────────────────────────────────────
type CompetenceCustom = { id: string; libelle: string; niveau: string | number };

type FicheCompleteData = {
  fiche: FicheSuivi;
  joueur: Joueur;
  evalTech: EvalTech | null;
  evalMentale: EvalMentale | null;
  objectifs: Objectif[];
  observations: Observation[];
  notesAdmin: NoteInterne[];
  noteJoueur: NoteJoueur | null;
};

// ─── Constantes compétences techniques ────────────────────────────────────────
const TECH_NIVEAUX = [
  { value: "début", label: "Début", color: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300" },
  { value: "à_travailler", label: "À travailler", color: "bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  { value: "en_cours", label: "En cours", color: "bg-orange-200 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  { value: "acquis", label: "Acquis", color: "bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  { value: "maîtrise", label: "Maîtrise", color: "bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
] as const;

const TECH_COMPETENCES_STD = [
  { key: "dribbleMainDroite", label: "Dribble main droite" },
  { key: "dribbleMainGauche", label: "Dribble main gauche" },
  { key: "changementMain", label: "Changement de main" },
  { key: "tirCercleDroite", label: "Tir au cercle (droite)" },
  { key: "tirCercleGauche", label: "Tir au cercle (gauche)" },
  { key: "passeDeuxMains", label: "Passe à deux mains" },
  { key: "passeUneMain", label: "Passe à une main" },
  { key: "attraperSousPression", label: "Attraper sous pression" },
  { key: "comprehension1c1", label: "Compréhension 1c1" },
  { key: "duelsSimples", label: "Duels simples" },
  { key: "placementSansBallon", label: "Placement sans ballon" },
  { key: "occupationEspaces", label: "Occupation des espaces" },
] as const;

// ─── Constantes compétences mentales ─────────────────────────────────────────
const MENTAL_COMPETENCES_STD = [
  { key: "concentration", label: "Concentration" },
  { key: "coachabilite", label: "Coachabilité" },
  { key: "gestionFrustration", label: "Gestion de la frustration" },
  { key: "confianceMatch", label: "Confiance en match" },
  { key: "espritCollectif", label: "Esprit collectif" },
  { key: "plaisirVisible", label: "Plaisir visible" },
] as const;

const MENTAL_LABELS = ["Difficultés", "Fragile", "Correct", "Bien", "Excellent"];
const MENTAL_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"
];

// ─── Composant niveau technique ───────────────────────────────────────────────
function TechNiveauBadge({ value, onChange, readonly }: { value: string; onChange?: (v: string) => void; readonly?: boolean }) {
  const idx = TECH_NIVEAUX.findIndex(n => n.value === value);
  const current = TECH_NIVEAUX[Math.max(0, idx)] || TECH_NIVEAUX[0];

  function cycle() {
    if (readonly) return;
    const next = TECH_NIVEAUX[(idx + 1) % TECH_NIVEAUX.length];
    onChange?.(next.value);
  }

  return (
    <button
      onClick={cycle}
      disabled={readonly}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${current.color} ${readonly ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
    >
      {current.label}
    </button>
  );
}

// ─── Composant pastilles mentales ─────────────────────────────────────────────
function MentalPastilles({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => !readonly && onChange?.(n)}
          disabled={readonly}
          title={MENTAL_LABELS[n - 1]}
          className={`h-5 w-5 rounded-full transition-all border-2 ${
            n <= value
              ? `${MENTAL_COLORS[n - 1]} border-transparent`
              : "bg-transparent border-muted-foreground/20"
          } ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{MENTAL_LABELS[value - 1] || ""}</span>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function FicheJoueurPage() {
  const { id, ficheId: ficheIdParam } = useParams<{ id: string; ficheId?: string }>();
  const joueurId = parseInt(id);
  const { canWrite, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("identite");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newObsContent, setNewObsContent] = useState("");
  const [newObsDate, setNewObsDate] = useState(new Date().toISOString().slice(0, 10));
  const [newObsType, setNewObsType] = useState<"SEANCE" | "MATCH" | "GENERAL">("SEANCE");
  const [objetDialog, setObjetDialog] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [deleteObsId, setDeleteObsId] = useState<number | null>(null);
  const [deleteObjId, setDeleteObjId] = useState<number | null>(null);

  // Formulaire objectif
  const [objForm, setObjForm] = useState({ type: "TECHNIQUE", libelle: "", formulationEnfant: "", statut: "En cours" });

  // Fiches du joueur
  const { data: fiches = [] } = useQuery<FicheSuivi[]>({
    queryKey: ["/api/joueurs", joueurId, "fiches"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/joueurs/${joueurId}/fiches`);
      return res.json();
    },
  });

  const selectedFicheId = ficheIdParam ? parseInt(ficheIdParam) : (fiches[0]?.id || 0);
  const currentFicheId = fiches.length > 0 ? (ficheIdParam ? parseInt(ficheIdParam) : fiches[0].id) : 0;

  // Fiche complète
  const { data, isLoading } = useQuery<FicheCompleteData>({
    queryKey: ["/api/fiches", currentFicheId, "full"],
    queryFn: async () => {
      if (!currentFicheId) return null;
      const res = await apiRequest("GET", `/api/fiches/${currentFicheId}/full`);
      return res.json();
    },
    enabled: currentFicheId > 0,
  });

  // Eval technique locale
  const [localEvalTech, setLocalEvalTech] = useState<Record<string, string>>({});
  const evalTech = { ...(data?.evalTech || {}), ...localEvalTech };

  // Eval mentale locale
  const [localEvalMentale, setLocalEvalMentale] = useState<Record<string, number>>({});
  const [localEvalComment, setLocalEvalComment] = useState<string | null>(null);
  const evalMentale = { ...(data?.evalMentale || {}), ...localEvalMentale };
  const evalComment = localEvalComment !== null ? localEvalComment : (data?.evalMentale?.commentaireGlobal || "");

  // Compétences custom tech
  const customTech: CompetenceCustom[] = (() => {
    try { return JSON.parse((evalTech as any).competencesCustom || "[]"); } catch { return []; }
  })();
  const [localCustomTech, setLocalCustomTech] = useState<CompetenceCustom[] | null>(null);
  const displayCustomTech = localCustomTech !== null ? localCustomTech : customTech;

  // Compétences custom mental
  const customMental: CompetenceCustom[] = (() => {
    try { return JSON.parse((evalMentale as any).competencesCustom || "[]"); } catch { return []; }
  })();
  const [localCustomMental, setLocalCustomMental] = useState<CompetenceCustom[] | null>(null);
  const displayCustomMental = localCustomMental !== null ? localCustomMental : customMental;

  // Fiche (infos) locale
  const [localFiche, setLocalFiche] = useState<Partial<FicheSuivi> | null>(null);
  const currentFiche = localFiche ? { ...data?.fiche, ...localFiche } : data?.fiche;

  // Note interne locale
  const [noteAdminEditId, setNoteAdminEditId] = useState<number | null>(null);
  const [noteAdminEditContent, setNoteAdminEditContent] = useState("");

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const saveFicheMutation = useMutation({
    mutationFn: async (d: Partial<FicheSuivi>) => {
      const res = await apiRequest("PUT", `/api/fiches/${currentFicheId}`, d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setLocalFiche(null);
      toast({ description: "Fiche enregistrée" });
    },
  });

  const saveEvalTechMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("PUT", `/api/fiches/${currentFicheId}/eval-tech`, d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setLocalEvalTech({});
      setLocalCustomTech(null);
      toast({ description: "Évaluation technique enregistrée" });
    },
  });

  const saveEvalMentaleMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("PUT", `/api/fiches/${currentFicheId}/eval-mentale`, d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setLocalEvalMentale({});
      setLocalEvalComment(null);
      setLocalCustomMental(null);
      toast({ description: "Évaluation mentale enregistrée" });
    },
  });

  const createObjectifMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `/api/fiches/${currentFicheId}/objectifs`, d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setObjetDialog(false);
      setObjForm({ type: "TECHNIQUE", libelle: "", formulationEnfant: "", statut: "En cours" });
    },
  });

  const updateObjectifMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/objectifs/${id}`, data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] }),
  });

  const deleteObjectifMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/objectifs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setDeleteObjId(null);
    },
  });

  const createObsMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `/api/fiches/${currentFicheId}/observations`, d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setNewObsContent("");
      toast({ description: "Observation ajoutée" });
    },
  });

  const deleteObsMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/observations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setDeleteObsId(null);
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", `/api/fiches/${currentFicheId}/notes`, d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setNewNoteContent("");
      toast({ description: "Note ajoutée" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, contenu }: { id: number; contenu: string }) => {
      const res = await apiRequest("PUT", `/api/notes/${id}`, { contenu });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setNoteAdminEditId(null);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFicheId, "full"] });
      setDeleteNoteId(null);
    },
  });

  const markNoteReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/fiches/${currentFicheId}/note-joueur/lue`, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes-joueurs/non-lues"] }),
  });

  // ─── PDF Export ─────────────────────────────────────────────────────────────
  async function handleExportPDF() {
    if (!data) return;
    setIsPdfLoading(true);
    try {
      await exportFicheJoueurPDF(data);
      toast({ description: "PDF généré avec succès" });
    } catch (e) {
      toast({ variant: "destructive", description: "Erreur lors de la génération du PDF" });
    } finally {
      setIsPdfLoading(false);
    }
  }

  // ─── Handlers compétences custom tech ────────────────────────────────────────
  function addCustomTech() {
    const newComp: CompetenceCustom = { id: Date.now().toString(), libelle: "Nouvelle compétence", niveau: "début" };
    setLocalCustomTech([...displayCustomTech, newComp]);
  }
  function updateCustomTech(id: string, field: "libelle" | "niveau", value: string | number) {
    setLocalCustomTech(displayCustomTech.map(c => c.id === id ? { ...c, [field]: value } : c));
  }
  function removeCustomTech(id: string) {
    setLocalCustomTech(displayCustomTech.filter(c => c.id !== id));
  }

  // ─── Handlers compétences custom mental ──────────────────────────────────────
  function addCustomMental() {
    const newComp: CompetenceCustom = { id: Date.now().toString(), libelle: "Nouvelle compétence", niveau: 3 };
    setLocalCustomMental([...displayCustomMental, newComp]);
  }
  function updateCustomMental(id: string, field: "libelle" | "niveau", value: string | number) {
    setLocalCustomMental(displayCustomMental.map(c => c.id === id ? { ...c, [field]: value } : c));
  }
  function removeCustomMental(id: string) {
    setLocalCustomMental(displayCustomMental.filter(c => c.id !== id));
  }

  // ─── Save éval technique ─────────────────────────────────────────────────────
  function saveEvalTech() {
    const payload: any = { ...localEvalTech };
    if (localCustomTech !== null) {
      payload.competencesCustom = JSON.stringify(localCustomTech);
    }
    saveEvalTechMutation.mutate(payload);
  }

  function saveEvalMentale() {
    const payload: any = { ...localEvalMentale };
    if (localEvalComment !== null) payload.commentaireGlobal = localEvalComment;
    if (localCustomMental !== null) payload.competencesCustom = JSON.stringify(localCustomMental);
    saveEvalMentaleMutation.mutate(payload);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (isLoading || (!data && currentFicheId > 0)) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Cas : joueur existe mais pas encore de fiche (création manuelle possible)
  if (!data || !data.joueur) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link href="/joueurs"><ArrowLeft className="h-4 w-4" /> Retour aux joueurs</Link>
        </Button>
        <div className="text-center space-y-3 py-10">
          <div className="text-4xl">📋</div>
          <h2 className="text-lg font-semibold text-foreground">Aucune fiche de suivi</h2>
          <p className="text-sm text-muted-foreground">
            Ce joueur n\'a pas encore de fiche pour la saison en cours.
          </p>
          {canWrite && (
            <Button
              className="mt-4 gap-2"
              onClick={async () => {
                try {
                  // Récupérer la saison active
                  const sRes = await apiRequest("GET", "/api/saisons");
                  const saisons: any[] = await sRes.json();
                  const saison = saisons.find((s: any) => s.active) || saisons[0];
                  if (!saison) {
                    toast({ title: "Aucune saison active", description: "Créez d\'abord une saison dans le menu Saisons.", variant: "destructive" });
                    return;
                  }
                  const today = new Date().toISOString().slice(0, 10);
                  await apiRequest("POST", `/api/joueurs/${joueurId}/fiches`, {
                    saisonId: saison.id,
                    periodeDebut: saison.dateDebut || today,
                    periodeFin: saison.dateFin || today,
                    pointsForts: "",
                    axesPrioritaires: "",
                    orientationEnvisagee: "Non déterminé",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/joueurs", joueurId, "fiches"] });
                  toast({ title: "Fiche créée", description: "La fiche de suivi a été créée pour la saison active." });
                } catch (e) {
                  toast({ title: "Erreur", description: "Impossible de créer la fiche.", variant: "destructive" });
                }
              }}
            >
              <PlusCircle className="h-4 w-4" />
              Créer la fiche pour la saison active
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { joueur, fiche, objectifs, observations: obs, notesAdmin, noteJoueur } = data;
  const hasUnreadNote = noteJoueur && !noteJoueur.luParAdmin;

  const PROFIL_LABELS: Record<string, string> = {
    A: "Candidat U13",
    B: "Dernière année ambitieux",
    C: "U11 en construction",
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header — ligne 1 : nav + PDF */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2 shrink-0">
          <Link href="/joueurs">
            <ArrowLeft className="h-4 w-4" /> Joueurs
          </Link>
        </Button>
        {canWrite && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isPdfLoading}
            className="gap-2 shrink-0"
            data-testid="button-export-pdf"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">{isPdfLoading ? "Génération..." : "Export PDF"}</span>
            <span className="sm:hidden">{isPdfLoading ? "..." : "PDF"}</span>
          </Button>
        )}
      </div>
      {/* Header — ligne 2 : identité joueur */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {joueur.prenom[0]}{joueur.nom[0]}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
            {joueur.prenom} {joueur.nom}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{joueur.equipe}</span>
            {joueur.poste && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{joueur.poste}</span>
              </>
            )}
            {joueur.numeroDossard && (
              <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                #{joueur.numeroDossard}
              </span>
            )}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Profil {joueur.profil} — {PROFIL_LABELS[joueur.profil]}
            </span>
          </div>
        </div>
      </div>

      {/* Sélecteur de fiche */}
      {fiches.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Fiche :</span>
          <Select
            value={String(currentFicheId)}
            onValueChange={v => window.location.hash = `#/joueurs/${joueurId}/fiche/${v}`}
          >
            <SelectTrigger className="w-56 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fiches.map(f => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.periodeDebut} → {f.periodeFin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={tab => {
        setActiveTab(tab);
        if (tab === "notes" && hasUnreadNote) {
          markNoteReadMutation.mutate();
        }
      }}>
        <TabsList className="h-9 gap-0.5 bg-muted/50 flex overflow-x-auto w-full">
          <TabsTrigger value="identite" className="text-xs gap-1.5" data-testid="tab-identite">
            <FileText className="h-3.5 w-3.5" /> Identité
          </TabsTrigger>
          <TabsTrigger value="objectifs" className="text-xs gap-1.5" data-testid="tab-objectifs">
            <Target className="h-3.5 w-3.5" /> Objectifs
            {objectifs.filter(o => o.statut === "En cours").length > 0 && (
              <span className="ml-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1">
                {objectifs.filter(o => o.statut === "En cours").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="technique" className="text-xs gap-1.5" data-testid="tab-technique">
            <Dumbbell className="h-3.5 w-3.5" /> Technique
          </TabsTrigger>
          <TabsTrigger value="mental" className="text-xs gap-1.5" data-testid="tab-mental">
            <Brain className="h-3.5 w-3.5" /> Mental
          </TabsTrigger>
          <TabsTrigger value="observations" className="text-xs gap-1.5" data-testid="tab-observations">
            <Calendar className="h-3.5 w-3.5" /> Observations
            {obs.length > 0 && (
              <span className="ml-1 text-[9px] font-bold bg-muted text-muted-foreground rounded-full px-1">
                {obs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1.5 relative" data-testid="tab-notes">
            <StickyNote className="h-3.5 w-3.5" /> Notes
            {hasUnreadNote && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab Identité ─────────────────────────────────────────────────── */}
        <TabsContent value="identite" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Période de suivi</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Début</Label>
                <Input
                  type="date"
                  value={currentFiche?.periodeDebut || ""}
                  onChange={e => setLocalFiche(f => ({ ...f, periodeDebut: e.target.value }))}
                  disabled={!canWrite}
                  className="h-8 text-sm"
                  data-testid="input-periode-debut"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fin</Label>
                <Input
                  type="date"
                  value={currentFiche?.periodeFin || ""}
                  onChange={e => setLocalFiche(f => ({ ...f, periodeFin: e.target.value }))}
                  disabled={!canWrite}
                  className="h-8 text-sm"
                  data-testid="input-periode-fin"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Orientation envisagée</Label>
                <Select
                  value={currentFiche?.orientationEnvisagee || "indéfini"}
                  onValueChange={v => setLocalFiche(f => ({ ...f, orientationEnvisagee: v as any }))}
                  disabled={!canWrite}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indéfini">Indéfini</SelectItem>
                    <SelectItem value="U13">Passage U13</SelectItem>
                    <SelectItem value="U11">Maintien U11</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Synthèse coach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-green-600 dark:text-green-400">Points forts</Label>
                <Textarea
                  value={currentFiche?.pointsForts || ""}
                  onChange={e => setLocalFiche(f => ({ ...f, pointsForts: e.target.value }))}
                  disabled={!canWrite}
                  placeholder="Ce joueur se distingue par..."
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-points-forts"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">Axes prioritaires à travailler</Label>
                <Textarea
                  value={currentFiche?.axesPrioritaires || ""}
                  onChange={e => setLocalFiche(f => ({ ...f, axesPrioritaires: e.target.value }))}
                  disabled={!canWrite}
                  placeholder="Les axes de travail prioritaires sont..."
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-axes"
                />
              </div>
            </CardContent>
          </Card>

          {canWrite && localFiche && (
            <div className="flex justify-end">
              <Button
                onClick={() => saveFicheMutation.mutate(localFiche)}
                disabled={saveFicheMutation.isPending}
                className="gap-2"
                data-testid="button-save-fiche"
              >
                <Save className="h-4 w-4" />
                {saveFicheMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ─── Tab Objectifs ────────────────────────────────────────────────── */}
        <TabsContent value="objectifs" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Objectifs individuels
            </h3>
            {canWrite && (
              <Button size="sm" onClick={() => setObjetDialog(true)} className="gap-2" data-testid="button-add-objectif">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            )}
          </div>

          {objectifs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                Aucun objectif défini pour cette fiche.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {objectifs.map(obj => (
                <Card key={obj.id} data-testid={`card-objectif-${obj.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                        obj.statut === "Atteint" ? "bg-green-500/15" :
                        obj.statut === "Abandonné" ? "bg-red-500/15" : "bg-orange-500/15"
                      }`}>
                        {obj.statut === "Atteint" ? <CheckCircle2 className="h-3 w-3 text-green-500" /> :
                         obj.statut === "Abandonné" ? <XCircle className="h-3 w-3 text-red-500" /> :
                         <Clock className="h-3 w-3 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{obj.libelle}</span>
                          <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                            {obj.type === "TECHNIQUE" ? "Technique" : "Mental"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          « {obj.formulationEnfant} »
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canWrite && (
                          <Select
                            value={obj.statut}
                            onValueChange={v => updateObjectifMutation.mutate({ id: obj.id, data: { statut: v } })}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="En cours">En cours</SelectItem>
                              <SelectItem value="Atteint">Atteint</SelectItem>
                              <SelectItem value="Abandonné">Abandonné</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {canWrite && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteObjId(obj.id)}
                            data-testid={`button-delete-objectif-${obj.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab Technique ────────────────────────────────────────────────── */}
        <TabsContent value="technique" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Compétences techniques</CardTitle>
              <div className="flex items-center gap-2">
                {canWrite && (
                  <Button size="sm" variant="outline" onClick={addCustomTech} className="h-7 gap-1.5 text-xs" data-testid="button-add-tech">
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                )}
                {canWrite && (Object.keys(localEvalTech).length > 0 || localCustomTech !== null) && (
                  <Button size="sm" onClick={saveEvalTech} disabled={saveEvalTechMutation.isPending} className="h-7 gap-1.5 text-xs" data-testid="button-save-tech">
                    <Save className="h-3.5 w-3.5" />
                    {saveEvalTechMutation.isPending ? "..." : "Sauvegarder"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Légende */}
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
                {TECH_NIVEAUX.map(n => (
                  <span key={n.value} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${n.color}`}>
                    {n.label}
                  </span>
                ))}
              </div>
              {/* Compétences standards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TECH_COMPETENCES_STD.map(comp => (
                  <div key={comp.key} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-sm text-foreground">{comp.label}</span>
                    <TechNiveauBadge
                      value={(evalTech as any)[comp.key] || "début"}
                      onChange={v => setLocalEvalTech(prev => ({ ...prev, [comp.key]: v }))}
                      readonly={!canWrite}
                    />
                  </div>
                ))}
              </div>
              {/* Compétences custom */}
              {displayCustomTech.length > 0 && (
                <div className="pt-2 border-t border-dashed border-border space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compétences personnalisées</p>
                  {displayCustomTech.map(comp => (
                    <div key={comp.id} className="flex items-center gap-2">
                      {canWrite ? (
                        <Input
                          value={comp.libelle}
                          onChange={e => updateCustomTech(comp.id, "libelle", e.target.value)}
                          className="h-7 text-sm flex-1"
                        />
                      ) : (
                        <span className="text-sm text-foreground flex-1">{comp.libelle}</span>
                      )}
                      <TechNiveauBadge
                        value={String(comp.niveau)}
                        onChange={v => updateCustomTech(comp.id, "niveau", v)}
                        readonly={!canWrite}
                      />
                      {canWrite && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeCustomTech(comp.id)}
                          data-testid={`button-remove-custom-tech-${comp.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab Mental ───────────────────────────────────────────────────── */}
        <TabsContent value="mental" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Comportement mental</CardTitle>
              <div className="flex items-center gap-2">
                {canWrite && (
                  <Button size="sm" variant="outline" onClick={addCustomMental} className="h-7 gap-1.5 text-xs" data-testid="button-add-mental">
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                )}
                {canWrite && (Object.keys(localEvalMentale).length > 0 || localEvalComment !== null || localCustomMental !== null) && (
                  <Button size="sm" onClick={saveEvalMentale} disabled={saveEvalMentaleMutation.isPending} className="h-7 gap-1.5 text-xs" data-testid="button-save-mental">
                    <Save className="h-3.5 w-3.5" />
                    {saveEvalMentaleMutation.isPending ? "..." : "Sauvegarder"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Légende */}
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
                {MENTAL_LABELS.map((l, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${MENTAL_COLORS[i]}`} />
                    {l}
                  </span>
                ))}
              </div>
              {/* Standards */}
              <div className="space-y-3">
                {MENTAL_COMPETENCES_STD.map(comp => (
                  <div key={comp.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{comp.label}</span>
                    <MentalPastilles
                      value={(evalMentale as any)[comp.key] || 3}
                      onChange={v => setLocalEvalMentale(prev => ({ ...prev, [comp.key]: v }))}
                      readonly={!canWrite}
                    />
                  </div>
                ))}
              </div>
              {/* Custom mental */}
              {displayCustomMental.length > 0 && (
                <div className="pt-2 border-t border-dashed border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compétences personnalisées</p>
                  {displayCustomMental.map(comp => (
                    <div key={comp.id} className="flex items-center gap-2">
                      {canWrite ? (
                        <Input
                          value={comp.libelle}
                          onChange={e => updateCustomMental(comp.id, "libelle", e.target.value)}
                          className="h-7 text-sm flex-1"
                        />
                      ) : (
                        <span className="text-sm text-foreground flex-1">{comp.libelle}</span>
                      )}
                      <MentalPastilles
                        value={Number(comp.niveau) || 3}
                        onChange={v => updateCustomMental(comp.id, "niveau", v)}
                        readonly={!canWrite}
                      />
                      {canWrite && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeCustomMental(comp.id)}
                          data-testid={`button-remove-custom-mental-${comp.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Commentaire global */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <Label className="text-xs">Commentaire global</Label>
                <Textarea
                  value={evalComment}
                  onChange={e => setLocalEvalComment(e.target.value)}
                  disabled={!canWrite}
                  placeholder="Observations générales sur le comportement mental..."
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-commentaire-mental"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab Observations ─────────────────────────────────────────────── */}
        <TabsContent value="observations" className="space-y-3 mt-4">
          {canWrite && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ajouter une observation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-32">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date" value={newObsDate}
                      onChange={e => setNewObsDate(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-obs-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={newObsType} onValueChange={v => setNewObsType(v as any)}>
                      <SelectTrigger className="h-8 w-28 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEANCE">Séance</SelectItem>
                        <SelectItem value="MATCH">Match</SelectItem>
                        <SelectItem value="GENERAL">Général</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  value={newObsContent}
                  onChange={e => setNewObsContent(e.target.value)}
                  placeholder="Décrivez ce que vous avez observé..."
                  rows={3}
                  className="resize-none text-sm"
                  data-testid="textarea-obs-content"
                />
                <Button
                  size="sm"
                  onClick={() => createObsMutation.mutate({ dateSeance: newObsDate, contenu: newObsContent, type: newObsType })}
                  disabled={!newObsContent || createObsMutation.isPending}
                  className="gap-2"
                  data-testid="button-add-obs"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </CardContent>
            </Card>
          )}

          {obs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucune observation pour cette fiche.
            </div>
          ) : (
            <div className="space-y-2">
              {obs.map(o => (
                <Card key={o.id} data-testid={`card-obs-${o.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {new Date(o.dateSeance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          <Badge variant="outline" className={`text-[10px] h-4 ${
                            o.type === "MATCH" ? "border-green-500/30 text-green-600 dark:text-green-400" :
                            o.type === "SEANCE" ? "border-blue-500/30 text-blue-600 dark:text-blue-400" : ""
                          }`}>
                            {o.type === "SEANCE" ? "Séance" : o.type === "MATCH" ? "Match" : "Général"}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{o.contenu}</p>
                      </div>
                      {canWrite && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteObsId(o.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab Notes ────────────────────────────────────────────────────── */}
        <TabsContent value="notes" className="space-y-4 mt-4">
          {/* Note du joueur (visible par staff) */}
          <Card className={hasUnreadNote ? "border-orange-500/30 bg-orange-500/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-500" />
                Message du joueur
                {hasUnreadNote && (
                  <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                    Nouveau
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {noteJoueur?.contenu ? (
                <div>
                  <p className="text-sm text-foreground whitespace-pre-line">{noteJoueur.contenu}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(noteJoueur.dateCreation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucun message du joueur</p>
              )}
            </CardContent>
          </Card>

          {/* Notes internes staff */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Notes staff (confidentielles)</h3>
            </div>

            {canWrite && (
              <Card className="mb-3">
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <Textarea
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="Note interne (visible uniquement par le staff)..."
                    rows={3}
                    className="resize-none text-sm"
                    data-testid="textarea-note-interne"
                  />
                  <Button
                    size="sm"
                    onClick={() => createNoteMutation.mutate({ contenu: newNoteContent })}
                    disabled={!newNoteContent || createNoteMutation.isPending}
                    className="gap-2"
                    data-testid="button-add-note"
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </Button>
                </CardContent>
              </Card>
            )}

            {notesAdmin.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune note staff pour cette fiche.
              </div>
            ) : (
              <div className="space-y-2">
                {notesAdmin.map(note => (
                  <Card key={note.id} data-testid={`card-note-${note.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        {noteAdminEditId === note.id ? (
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={noteAdminEditContent}
                              onChange={e => setNoteAdminEditContent(e.target.value)}
                              rows={3}
                              className="resize-none text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateNoteMutation.mutate({ id: note.id, contenu: noteAdminEditContent })}
                                disabled={updateNoteMutation.isPending}
                              >
                                Enregistrer
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setNoteAdminEditId(null)}>
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <p className="text-sm text-foreground whitespace-pre-line">{note.contenu}</p>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {new Date(note.dateCreation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                        )}
                        {canWrite && noteAdminEditId !== note.id && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => { setNoteAdminEditId(note.id); setNoteAdminEditContent(note.contenu); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteNoteId(note.id)}
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog créer objectif */}
      <Dialog open={objetDialog} onOpenChange={setObjetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvel objectif</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={objForm.type} onValueChange={v => setObjForm(f => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNIQUE">Technique</SelectItem>
                  <SelectItem value="MENTAL">Mental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Objectif (formulation coach)</Label>
              <Input
                value={objForm.libelle}
                onChange={e => setObjForm(f => ({ ...f, libelle: e.target.value }))}
                placeholder="ex: Améliorer dribble main gauche"
                data-testid="input-objectif-libelle"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Formulation pour le joueur</Label>
              <Input
                value={objForm.formulationEnfant}
                onChange={e => setObjForm(f => ({ ...f, formulationEnfant: e.target.value }))}
                placeholder="ex: Je dribble des deux mains"
                data-testid="input-objectif-enfant"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setObjetDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createObjectifMutation.mutate(objForm)}
              disabled={!objForm.libelle || !objForm.formulationEnfant || createObjectifMutation.isPending}
              data-testid="button-submit-objectif"
            >
              Créer l'objectif
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs de suppression */}
      <AlertDialog open={!!deleteObjId} onOpenChange={() => setDeleteObjId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteObjId && deleteObjectifMutation.mutate(deleteObjId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteNoteId && deleteNoteMutation.mutate(deleteNoteId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteObsId} onOpenChange={() => setDeleteObsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette observation ?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteObsId && deleteObsMutation.mutate(deleteObsId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
