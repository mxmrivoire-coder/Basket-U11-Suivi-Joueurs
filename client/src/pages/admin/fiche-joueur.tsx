import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileDown,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Target,
  Brain,
  Dumbbell,
  MessageSquare,
  StickyNote,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Joueur, FicheSuivi, EvalTech, EvalMentale, Objectif, NoteInterne } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type FullFiche = {
  fiche: FicheSuivi;
  evalTech: EvalTech | null;
  evalMentale: EvalMentale | null;
  objectifs: Objectif[];
  notesAdmin: NoteInterne[];
  noteJoueur: { contenu: string } | null;
};

// ─── Tech skill labels ────────────────────────────────────────────────────────

const TECH_SKILLS: { key: keyof EvalTech; label: string }[] = [
  { key: "dribbleMainDroite", label: "Dribble main droite" },
  { key: "dribbleMainGauche", label: "Dribble main gauche" },
  { key: "changementMain", label: "Changement de main" },
  { key: "tirCercleDroite", label: "Tir cercle côté droit" },
  { key: "tirCercleGauche", label: "Tir cercle côté gauche" },
  { key: "passeDeuxMains", label: "Passe deux mains" },
  { key: "passeUneMain", label: "Passe une main" },
  { key: "attraperSousPression", label: "Attraper sous pression" },
  { key: "comprehension1c1", label: "Compréhension 1c1" },
  { key: "duelsSimples", label: "Duels simples" },
  { key: "placementSansBallon", label: "Placement sans ballon" },
  { key: "occupationEspaces", label: "Occupation des espaces" },
];

const MENTAL_SKILLS: { key: keyof EvalMentale; label: string }[] = [
  { key: "concentration", label: "Concentration" },
  { key: "coachabilite", label: "Coachabilité" },
  { key: "gestionFrustration", label: "Gestion de la frustration" },
  { key: "confianceMatch", label: "Confiance en match" },
  { key: "espritCollectif", label: "Esprit collectif" },
  { key: "plaisirVisible", label: "Plaisir visible" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  "Début": {
    label: "Début",
    className: "badge-debut",
    icon: XCircle,
    iconClass: "text-slate-500",
  },
  "À travailler": {
    label: "À travailler",
    className: "badge-a-travailler",
    icon: XCircle,
    iconClass: "text-red-600",
  },
  "En cours": {
    label: "En cours",
    className: "badge-en-cours",
    icon: Clock,
    iconClass: "text-amber-600",
  },
  "Acquis": {
    label: "Acquis",
    className: "badge-acquis",
    icon: CheckCircle2,
    iconClass: "text-blue-600",
  },
  "Maîtrise": {
    label: "Maîtrise",
    className: "badge-maitrise",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
};

const TECH_STATUSES = ["Début", "À travailler", "En cours", "Acquis", "Maîtrise"] as const;

function TechStatusButton({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}) {
  const cfg = statusConfig[value as keyof typeof statusConfig] ?? statusConfig["En cours"];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${cfg.className}`}
      data-testid={`button-tech-status-${value}`}
    >
      {cfg.label}
    </button>
  );
}

const MENTAL_DOT_COLORS: Record<number, string> = {
  1: "score-1",
  2: "score-2",
  3: "score-3",
  4: "score-4",
  5: "score-5",
};

function MentalDots({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`score-dot transition-opacity ${
            v <= value ? MENTAL_DOT_COLORS[v] : "bg-muted-foreground/20"
          } hover:opacity-80`}
          data-testid={`button-mental-score-${v}`}
          aria-label={`Score ${v}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value}/5</span>
    </div>
  );
}

// ─── Create Fiche Dialog ──────────────────────────────────────────────────────

function CreateFicheDialog({
  open,
  onOpenChange,
  joueurId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  joueurId: number;
}) {
  const [form, setForm] = useState({
    periodeDebut: "",
    periodeFin: "",
    pointsForts: "",
    axesPrioritaires: "",
    orientationEnvisagee: "indéfini" as string,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/joueurs/${joueurId}/fiches`, form);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs", joueurId, "fiches"] });
      onOpenChange(false);
      toast({ title: "Fiche créée" });
    },
    onError: () => toast({ title: "Erreur", description: "Création impossible", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle fiche de suivi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Début de période</Label>
              <Input
                type="date"
                value={form.periodeDebut}
                onChange={(e) => setForm({ ...form, periodeDebut: e.target.value })}
                required
                data-testid="input-periode-debut"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fin de période</Label>
              <Input
                type="date"
                value={form.periodeFin}
                onChange={(e) => setForm({ ...form, periodeFin: e.target.value })}
                required
                data-testid="input-periode-fin"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Points forts</Label>
            <Textarea
              value={form.pointsForts}
              onChange={(e) => setForm({ ...form, pointsForts: e.target.value })}
              placeholder="Observations positives..."
              rows={2}
              data-testid="input-points-forts"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Axes prioritaires</Label>
            <Textarea
              value={form.axesPrioritaires}
              onChange={(e) => setForm({ ...form, axesPrioritaires: e.target.value })}
              placeholder="Axes à travailler en priorité..."
              rows={2}
              data-testid="input-axes"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Orientation envisagée</Label>
            <Select
              value={form.orientationEnvisagee}
              onValueChange={(v) => setForm({ ...form, orientationEnvisagee: v })}
            >
              <SelectTrigger data-testid="select-orientation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="U13">Passage en U13</SelectItem>
                <SelectItem value="U11">Maintien en U11</SelectItem>
                <SelectItem value="indéfini">Indéfini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.periodeDebut || !form.periodeFin} data-testid="button-save-fiche">
            {mutation.isPending ? "Création..." : "Créer la fiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Objectif dialog ──────────────────────────────────────────────────────────

function ObjectifDialog({
  open,
  onOpenChange,
  ficheId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ficheId: number;
}) {
  const [form, setForm] = useState({
    type: "TECHNIQUE",
    libelle: "",
    formulationEnfant: "",
    statut: "En cours",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fiches/${ficheId}/objectifs`, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", ficheId, "full"] });
      onOpenChange(false);
      setForm({ type: "TECHNIQUE", libelle: "", formulationEnfant: "", statut: "En cours" });
      toast({ title: "Objectif ajouté" });
    },
    onError: () => toast({ title: "Erreur", description: "Ajout impossible", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel objectif</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
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
            <Label>Libellé (pour les coachs)</Label>
            <Input
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="Ex: Améliorer le dribble main gauche"
              required
              data-testid="input-objectif-libelle"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Formulation pour l'enfant</Label>
            <Textarea
              value={form.formulationEnfant}
              onChange={(e) => setForm({ ...form, formulationEnfant: e.target.value })}
              placeholder="Ex: Je veux pouvoir dribbler avec ma main gauche sans regarder le ballon"
              rows={2}
              data-testid="input-objectif-formulation"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Atteint">Atteint</SelectItem>
                <SelectItem value="Abandonné">Abandonné</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.libelle || !form.formulationEnfant} data-testid="button-save-objectif">
            {mutation.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FicheJoueurPage() {
  const { id } = useParams<{ id: string }>();
  const joueurId = parseInt(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedFicheId, setSelectedFicheId] = useState<number | null>(null);
  const [createFicheOpen, setCreateFicheOpen] = useState(false);
  const [addObjectifOpen, setAddObjectifOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [deleteFicheId, setDeleteFicheId] = useState<number | null>(null);

  // Joueur
  const { data: joueur, isLoading: joueurLoading } = useQuery<Joueur>({
    queryKey: ["/api/joueurs", joueurId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/joueurs/${joueurId}`);
      return res.json();
    },
  });

  // All users (for linking)
  const { data: allUsers } = useQuery<{ id: number; nom: string; prenom: string; email: string; role: string }[]>({
    queryKey: ["/api/users"],
  });
  const joueurUsers = allUsers?.filter(u => u.role === "JOUEUR") ?? [];

  // Link user to joueur
  const linkUserMutation = useMutation({
    mutationFn: async (userId: number | null) => {
      const res = await apiRequest("PUT", `/api/joueurs/${joueurId}`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs", joueurId] });
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      toast({ title: "Compte lié mis à jour" });
    },
    onError: () => toast({ title: "Erreur", description: "Liaison impossible", variant: "destructive" }),
  });

  // Fiches list
  const { data: fiches } = useQuery<FicheSuivi[]>({
    queryKey: ["/api/joueurs", joueurId, "fiches"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/joueurs/${joueurId}/fiches`);
      return res.json();
    },
    enabled: !!joueurId,
  });

  // Auto-select the latest fiche
  const activeFicheId = selectedFicheId ?? fiches?.[fiches.length - 1]?.id ?? null;

  // Full fiche data
  const { data: fullFiche, isLoading: ficheLoading } = useQuery<FullFiche>({
    queryKey: ["/api/fiches", activeFicheId, "full"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/fiches/${activeFicheId}/full`);
      return res.json();
    },
    enabled: !!activeFicheId,
  });

  // Local eval state (to save on button click)
  const [localTech, setLocalTech] = useState<Record<string, string>>({});
  const [localMental, setLocalMental] = useState<Record<string, number>>({});
  const [customTechSkills, setCustomTechSkills] = useState<{ key: string; label: string }[]>([]);
  const [customMentalSkills, setCustomMentalSkills] = useState<{ key: string; label: string }[]>([]);
  const [newTechSkillLabel, setNewTechSkillLabel] = useState("");
  const [newMentalSkillLabel, setNewMentalSkillLabel] = useState("");
  const [addTechOpen, setAddTechOpen] = useState(false);
  const [addMentalOpen, setAddMentalOpen] = useState(false);
  const [ficeEditMode, setFicheEditMode] = useState(false);
  const [editFicheData, setEditFicheData] = useState<Partial<FicheSuivi>>({});

  // When fiche changes, reset local states
  const evalTech = fullFiche?.evalTech;
  const evalMentale = fullFiche?.evalMentale;

  // Save eval tech
  const saveEvalTechMutation = useMutation({
    mutationFn: async () => {
      const current = evalTech ? { ...evalTech } : {};
      const merged = { ...current, ...localTech };
      const res = await apiRequest("PUT", `/api/fiches/${activeFicheId}/eval-tech`, merged);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
      setLocalTech({});
      toast({ title: "Évaluation technique sauvegardée" });
    },
  });

  // Save eval mentale
  const saveEvalMentaleMutation = useMutation({
    mutationFn: async (commentaire: string) => {
      const current = evalMentale ? { ...evalMentale } : {};
      const merged = { ...current, ...localMental, commentaireGlobal: commentaire };
      const res = await apiRequest("PUT", `/api/fiches/${activeFicheId}/eval-mentale`, merged);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
      setLocalMental({});
      toast({ title: "Évaluation mentale sauvegardée" });
    },
  });

  const [mentaleComment, setMentaleComment] = useState("");

  // Delete objectif
  const deleteObjectifMutation = useMutation({
    mutationFn: async (objId: number) => {
      await apiRequest("DELETE", `/api/objectifs/${objId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
    },
  });

  // Update objectif status
  const updateObjectifMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) => {
      const res = await apiRequest("PUT", `/api/objectifs/${id}`, { statut });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
    },
  });

  // Add note interne
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/fiches/${activeFicheId}/notes`, { contenu: newNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
      setNewNote("");
    },
  });

  // Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest("DELETE", `/api/notes/${noteId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
    },
  });

  // Delete fiche
  const deleteFicheMutation = useMutation({
    mutationFn: async (ficheId: number) => {
      await apiRequest("DELETE", `/api/fiches/${ficheId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs", joueurId, "fiches"] });
      setSelectedFicheId(null);
      setDeleteFicheId(null);
      toast({ title: "Fiche supprimée" });
    },
  });

  // Save fiche metadata
  const saveFicheMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/fiches/${activeFicheId}`, editFicheData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", activeFicheId, "full"] });
      setFicheEditMode(false);
      toast({ title: "Fiche mise à jour" });
    },
  });

  // PDF Export — pure jsPDF (no html2canvas, works cross-origin)
  async function handlePdfExport() {
    if (!joueur || !fullFiche) return;
    try {
      toast({ title: "Génération du PDF...", description: "Veuillez patienter" });
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 15;
      const colW = (W - margin * 2 - 5) / 2;
      let y = 20;

      const checkPage = (needed = 10) => {
        if (y + needed > 280) { pdf.addPage(); y = 20; }
      };

      // ── En-tête ──
      pdf.setFillColor(30, 64, 120);
      pdf.rect(0, 0, W, 16, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("BASKET U11 — Fiche de suivi joueur", margin, 10.5);
      y = 24;

      // ── Identité ──
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(16);
      pdf.text(`${joueur.prenom} ${joueur.nom}`, margin, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      const profilLabel: Record<string,string> = { A: "Candidat U13", B: "Ambitieux U11", C: "En construction" };
      pdf.text(`${joueur.equipe}  ·  Profil ${joueur.profil} (${profilLabel[joueur.profil] ?? ""})  ·  Période : ${fullFiche.fiche.periodeDebut} → ${fullFiche.fiche.periodeFin}`, margin, y);
      y += 8;

      // ── Synthèse ──
      pdf.setDrawColor(220, 220, 220);
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(margin, y, W - margin * 2, 24, 2, 2, "FD");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Points forts", margin + 3, y + 5);
      pdf.text("Axes à travailler", margin + colW + 8, y + 5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(40, 40, 40);
      const pf = pdf.splitTextToSize(fullFiche.fiche.pointsForts || "—", colW - 4);
      const ap = pdf.splitTextToSize(fullFiche.fiche.axesPrioritaires || "—", colW - 4);
      pdf.text(pf.slice(0, 2), margin + 3, y + 11);
      pdf.text(ap.slice(0, 2), margin + colW + 8, y + 11);
      y += 30;

      // ── Évaluation technique ──
      checkPage(12);
      pdf.setFillColor(234, 88, 12); // orange primary
      pdf.rect(margin, y, W - margin * 2, 7, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("ÉVALUATION TECHNIQUE", margin + 3, y + 4.8);
      y += 9;

      const allTech = [
        ...TECH_SKILLS,
        ...customTechSkills,
      ];
      const techStatusColor: Record<string, [number,number,number]> = {
        "Début":        [100, 116, 139],
        "À travailler": [220, 38, 38],
        "En cours":     [217, 119, 6],
        "Acquis":       [37, 99, 235],
        "Maîtrise":     [5, 150, 105],
      };
      const half = Math.ceil(allTech.length / 2);
      const leftCol = allTech.slice(0, half);
      const rightCol = allTech.slice(half);
      const rows = Math.max(leftCol.length, rightCol.length);
      for (let i = 0; i < rows; i++) {
        checkPage(7);
        if (i % 2 === 0) {
          pdf.setFillColor(248, 249, 251);
          pdf.rect(margin, y, W - margin * 2, 6.5, "F");
        }
        [[leftCol[i], margin], [rightCol[i], margin + colW + 5]].forEach(([skill, x]) => {
          if (!skill) return;
          const s = skill as typeof TECH_SKILLS[0];
          const val = getTechValue(s.key as string);
          const [r, g, b] = techStatusColor[val] ?? [150, 150, 150];
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(40, 40, 40);
          pdf.text(s.label, (x as number) + 2, y + 4.3);
          pdf.setFillColor(r, g, b);
          const badgeX = (x as number) + colW - 22;
          pdf.roundedRect(badgeX, y + 1, 22, 4.5, 1, 1, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(6.5);
          pdf.text(val, badgeX + 11, y + 4, { align: "center" });
        });
        y += 6.5;
      }
      y += 4;

      // ── Évaluation mentale ──
      checkPage(12);
      pdf.setFillColor(30, 64, 120);
      pdf.rect(margin, y, W - margin * 2, 7, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("ÉVALUATION MENTALE", margin + 3, y + 4.8);
      y += 9;

      const allMental = [...MENTAL_SKILLS, ...customMentalSkills];
      const mentalColors: Record<number, [number,number,number]> = {
        1: [220, 38, 38],
        2: [249, 115, 22],
        3: [245, 158, 11],
        4: [132, 204, 22],
        5: [22, 163, 74],
      };
      const mentalLabels: Record<number, string> = {
        1: "Difficultés", 2: "Fragile", 3: "Correct", 4: "Bien", 5: "Excellent"
      };
      allMental.forEach((s, i) => {
        checkPage(7);
        if (i % 2 === 0) {
          pdf.setFillColor(248, 249, 251);
          pdf.rect(margin, y, W - margin * 2, 6.5, "F");
        }
        const val = getMentalValue(s.key as string);
        const [r, g, b] = mentalColors[val] ?? [150, 150, 150];
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(40, 40, 40);
        pdf.text(s.label, margin + 2, y + 4.3);
        // 5 dots
        [1,2,3,4,5].forEach((v, di) => {
          const cx = W - margin - 42 + di * 7;
          const dotColor = mentalColors[v] ?? [200, 200, 200];
          pdf.setFillColor(...(v <= val ? dotColor : [200, 200, 200]) as [number,number,number]);
          pdf.circle(cx, y + 3.5, 2, "F");
        });
        pdf.setFontSize(7);
        pdf.setTextColor(r, g, b);
        pdf.text(mentalLabels[val] ?? "", W - margin - 10, y + 4.3, { align: "right" });
        y += 6.5;
      });
      if (fullFiche.evalMentale?.commentaireGlobal) {
        checkPage(14);
        y += 3;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(80, 80, 80);
        const lines = pdf.splitTextToSize(`Commentaire : ${fullFiche.evalMentale.commentaireGlobal}`, W - margin * 2 - 6);
        lines.slice(0, 3).forEach((line: string) => { pdf.text(line, margin + 3, y); y += 4.5; });
      }
      y += 4;

      // ── Objectifs ──
      if (fullFiche.objectifs.length > 0) {
        checkPage(12);
        pdf.setFillColor(124, 58, 237);
        pdf.rect(margin, y, W - margin * 2, 7, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("OBJECTIFS INDIVIDUELS", margin + 3, y + 4.8);
        y += 9;
        fullFiche.objectifs.forEach((obj, i) => {
          checkPage(14);
          if (i % 2 === 0) {
            pdf.setFillColor(248, 249, 251);
            pdf.rect(margin, y, W - margin * 2, 12, "F");
          }
          const typeColor: [number,number,number] = obj.type === "TECHNIQUE" ? [37, 99, 235] : [124, 58, 237];
          pdf.setFillColor(...typeColor);
          pdf.roundedRect(margin + 2, y + 1.5, 18, 4, 1, 1, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(6);
          pdf.text(obj.type === "TECHNIQUE" ? "Technique" : "Mental", margin + 11, y + 4.3, { align: "center" });
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(40, 40, 40);
          pdf.text(obj.libelle, margin + 23, y + 4.3);
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(7.5);
          pdf.setTextColor(100, 100, 100);
          const enfant = pdf.splitTextToSize(`« ${obj.formulationEnfant} »`, W - margin * 2 - 26);
          pdf.text(enfant[0] ?? "", margin + 23, y + 9);
          const sc = obj.statut === "Atteint" ? [22,163,74] as [number,number,number] : obj.statut === "Abandonné" ? [150,150,150] as [number,number,number] : [217,119,6] as [number,number,number];
          pdf.setFillColor(...sc);
          pdf.roundedRect(W - margin - 22, y + 1.5, 22, 4, 1, 1, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(6.5);
          pdf.text(obj.statut, W - margin - 11, y + 4.3, { align: "center" });
          y += 13;
        });
      }

      // ── Pied de page ──
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}  ·  Confidentiel — Usage interne`, margin, 292);
        pdf.text(`${p} / ${totalPages}`, W - margin, 292, { align: "right" });
      }

      pdf.save(`fiche-${joueur.prenom}-${joueur.nom}.pdf`);
      toast({ title: "PDF généré", description: `fiche-${joueur.prenom}-${joueur.nom}.pdf` });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur PDF", description: String(err), variant: "destructive" });
    }
  }

  if (joueurLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!joueur) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">Joueur introuvable</div>
        <Link href="/joueurs">
          <Button variant="link" className="mt-2 pl-0">← Retour</Button>
        </Link>
      </div>
    );
  }

  const profilLabels: Record<string, string> = {
    A: "Candidat U13",
    B: "Ambitieux U11",
    C: "En construction",
  };

  const getTechValue = (key: string): string => {
    if (key in localTech) return localTech[key];
    return (evalTech as any)?.[key] ?? "Début";
  };

  const getMentalValue = (key: string): number => {
    if (key in localMental) return localMental[key];
    return (evalMentale as any)?.[key] ?? 3;
  };

  const nextTechStatus = (current: string): string => {
    const idx = TECH_STATUSES.indexOf(current as any);
    return TECH_STATUSES[(idx + 1) % TECH_STATUSES.length];
  };

  return (
    <div className="p-5 space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/joueurs">
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {joueur.prenom} {joueur.nom}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {joueur.equipe}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Profil {joueur.profil} · {profilLabels[joueur.profil]}
              </span>
            </div>
            {joueur.dateNaissance && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Né(e) le {joueur.dateNaissance}
              </div>
            )}
            {/* Compte lié */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Compte joueur :</span>
              <Select
                value={joueur.userId ? String(joueur.userId) : "none"}
                onValueChange={(v) => linkUserMutation.mutate(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger className="h-7 text-xs w-48" data-testid="select-compte-lie">
                  <SelectValue placeholder="Aucun compte lié" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun compte —</SelectItem>
                  {joueurUsers.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.prenom} {u.nom} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePdfExport}
            disabled={!fullFiche}
            data-testid="button-export-pdf"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
          <Button size="sm" onClick={() => setCreateFicheOpen(true)} data-testid="button-add-fiche">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle fiche
          </Button>
        </div>
      </div>

      {/* Fiche selector */}
      {fiches && fiches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Fiche :</span>
          {fiches.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFicheId(f.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeFicheId === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
              data-testid={`button-fiche-${f.id}`}
            >
              {f.periodeDebut} → {f.periodeFin}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!fiches || fiches.length === 0) && (
        <Card className="border-dashed border-2 border-muted-foreground/20 shadow-none">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm mb-3">Aucune fiche de suivi créée</p>
            <Button size="sm" onClick={() => setCreateFicheOpen(true)} data-testid="button-create-first-fiche">
              <Plus className="h-4 w-4 mr-2" />
              Créer la première fiche
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fiche content */}
      {activeFicheId && fullFiche && (
        <div ref={printRef} className="space-y-5">
          {/* Fiche overview */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Fiche du {fullFiche.fiche.periodeDebut} au {fullFiche.fiche.periodeFin}
              </CardTitle>
              <div className="flex gap-2">
                {ficeEditMode ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFicheEditMode(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveFicheMutation.mutate()}
                      disabled={saveFicheMutation.isPending}
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Sauvegarder
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFicheEditMode(true);
                        setEditFicheData({
                          pointsForts: fullFiche.fiche.pointsForts ?? "",
                          axesPrioritaires: fullFiche.fiche.axesPrioritaires ?? "",
                          orientationEnvisagee: fullFiche.fiche.orientationEnvisagee ?? "indéfini",
                        });
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteFicheId(activeFicheId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 grid sm:grid-cols-3 gap-4">
              {ficeEditMode ? (
                <>
                  <div className="sm:col-span-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Orientation</Label>
                    <Select
                      value={editFicheData.orientationEnvisagee ?? "indéfini"}
                      onValueChange={(v) =>
                        setEditFicheData({ ...editFicheData, orientationEnvisagee: v as any })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="U13">Passage en U13</SelectItem>
                        <SelectItem value="U11">Maintien en U11</SelectItem>
                        <SelectItem value="indéfini">Indéfini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Points forts</Label>
                    <Textarea
                      value={editFicheData.pointsForts ?? ""}
                      onChange={(e) =>
                        setEditFicheData({ ...editFicheData, pointsForts: e.target.value })
                      }
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Axes prioritaires</Label>
                    <Textarea
                      value={editFicheData.axesPrioritaires ?? ""}
                      onChange={(e) =>
                        setEditFicheData({ ...editFicheData, axesPrioritaires: e.target.value })
                      }
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-1">Orientation envisagée</div>
                    <span className="text-sm font-medium">
                      {fullFiche.fiche.orientationEnvisagee === "U13"
                        ? "🏀 Passage en U13"
                        : fullFiche.fiche.orientationEnvisagee === "U11"
                        ? "⏳ Maintien en U11"
                        : "— Indéfini"}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-1">Points forts</div>
                    <div className="text-sm whitespace-pre-wrap">
                      {fullFiche.fiche.pointsForts || <span className="text-muted-foreground italic">Non renseigné</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-1">Axes prioritaires</div>
                    <div className="text-sm whitespace-pre-wrap">
                      {fullFiche.fiche.axesPrioritaires || <span className="text-muted-foreground italic">Non renseigné</span>}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Tech | Mental | Objectifs | Notes */}
          <Tabs
            defaultValue="technique"
            onValueChange={(v) => {
              if (v === "notes" && activeFicheId) {
                // Marquer la note joueur comme lue
                apiRequest("PATCH", `/api/fiches/${activeFicheId}/note-joueur/lue`).catch(() => {});
                queryClient.invalidateQueries({ queryKey: ["/api/notes-joueurs/non-lues"] });
              }
            }}
          >
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="technique" data-testid="tab-technique">
                <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
                Technique
              </TabsTrigger>
              <TabsTrigger value="mental" data-testid="tab-mental">
                <Brain className="h-3.5 w-3.5 mr-1.5" />
                Mental
              </TabsTrigger>
              <TabsTrigger value="objectifs" data-testid="tab-objectifs">
                <Target className="h-3.5 w-3.5 mr-1.5" />
                Objectifs
              </TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">
                <StickyNote className="h-3.5 w-3.5 mr-1.5" />
                Notes
              </TabsTrigger>
            </TabsList>

            {/* ── Technique ── */}
            <TabsContent value="technique" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    Évaluation technique
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddTechOpen(true)}
                      data-testid="button-add-tech-skill"
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Compétence
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEvalTechMutation.mutate()}
                      disabled={saveEvalTechMutation.isPending || Object.keys(localTech).length === 0}
                      data-testid="button-save-eval-tech"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {saveEvalTechMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-xs text-muted-foreground mb-3">
                    Cliquez pour faire tourner : Début → À travailler → En cours → Acquis → Maîtrise
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[...TECH_SKILLS, ...customTechSkills].map(({ key, label }) => {
                      const val = getTechValue(key as string);
                      const isCustom = (key as string).startsWith("custom_tech_");
                      return (
                        <div
                          key={key as string}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors group"
                          data-testid={`skill-row-${key as string}`}
                        >
                          <span className="text-sm flex-1 min-w-0 truncate">{label}</span>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <TechStatusButton
                              value={val}
                              onClick={() =>
                                setLocalTech({ ...localTech, [key as string]: nextTechStatus(val) })
                              }
                            />
                            {isCustom && (
                              <button
                                onClick={() => {
                                  setCustomTechSkills(customTechSkills.filter((s) => s.key !== key));
                                  const updated = { ...localTech };
                                  delete updated[key as string];
                                  setLocalTech(updated);
                                }}
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground"
                                title="Supprimer cette compétence"
                                data-testid={`button-delete-tech-${key as string}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Dialog ajout compétence tech */}
                  <Dialog open={addTechOpen} onOpenChange={setAddTechOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Nouvelle compétence technique</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <Label>Nom de la compétence</Label>
                        <Input
                          value={newTechSkillLabel}
                          onChange={(e) => setNewTechSkillLabel(e.target.value)}
                          placeholder="Ex: Tir en suspension, Contre..."
                          data-testid="input-new-tech-skill"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddTechOpen(false)}>Annuler</Button>
                        <Button
                          onClick={() => {
                            if (!newTechSkillLabel.trim()) return;
                            const key = `custom_tech_${Date.now()}`;
                            setCustomTechSkills([...customTechSkills, { key, label: newTechSkillLabel.trim() }]);
                            setLocalTech({ ...localTech, [key]: "Début" });
                            setNewTechSkillLabel("");
                            setAddTechOpen(false);
                          }}
                          disabled={!newTechSkillLabel.trim()}
                        >
                          Ajouter
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Mental ── */}
            <TabsContent value="mental" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Évaluation mentale
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddMentalOpen(true)}
                      data-testid="button-add-mental-skill"
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Compétence
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEvalMentaleMutation.mutate(mentaleComment || evalMentale?.commentaireGlobal || "")}
                      disabled={saveEvalMentaleMutation.isPending}
                      data-testid="button-save-eval-mentale"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {saveEvalMentaleMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-xs text-muted-foreground mb-4">
                    1 = difficultés · 2 = fragile · 3 = correct · 4 = bien · 5 = excellent
                  </div>
                  <div className="space-y-3">
                    {[...MENTAL_SKILLS, ...customMentalSkills].map(({ key, label }) => {
                      const isCustom = (key as string).startsWith("custom_mental_");
                      return (
                        <div
                          key={key as string}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors group"
                          data-testid={`mental-row-${key as string}`}
                        >
                          <span className="text-sm flex-1 min-w-0 truncate">{label}</span>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <MentalDots
                              value={getMentalValue(key as string)}
                              onChange={(v) =>
                                setLocalMental({ ...localMental, [key as string]: v })
                              }
                            />
                            {isCustom && (
                              <button
                                onClick={() => {
                                  setCustomMentalSkills(customMentalSkills.filter((s) => s.key !== key));
                                  const updated = { ...localMental };
                                  delete updated[key as string];
                                  setLocalMental(updated);
                                }}
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground"
                                title="Supprimer cette compétence"
                                data-testid={`button-delete-mental-${key as string}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Dialog ajout compétence mentale */}
                  <Dialog open={addMentalOpen} onOpenChange={setAddMentalOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Nouvelle compétence mentale</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <Label>Nom de la compétence</Label>
                        <Input
                          value={newMentalSkillLabel}
                          onChange={(e) => setNewMentalSkillLabel(e.target.value)}
                          placeholder="Ex: Leadership, Persévérance..."
                          data-testid="input-new-mental-skill"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddMentalOpen(false)}>Annuler</Button>
                        <Button
                          onClick={() => {
                            if (!newMentalSkillLabel.trim()) return;
                            const key = `custom_mental_${Date.now()}`;
                            setCustomMentalSkills([...customMentalSkills, { key, label: newMentalSkillLabel.trim() }]);
                            setLocalMental({ ...localMental, [key]: 3 });
                            setNewMentalSkillLabel("");
                            setAddMentalOpen(false);
                          }}
                          disabled={!newMentalSkillLabel.trim()}
                        >
                          Ajouter
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <div className="mt-4 space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Commentaire global
                    </Label>
                    <Textarea
                      value={mentaleComment || evalMentale?.commentaireGlobal || ""}
                      onChange={(e) => setMentaleComment(e.target.value)}
                      placeholder="Observations générales sur le comportement en entraînement et en match..."
                      rows={3}
                      className="text-sm"
                      data-testid="input-commentaire-global"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Objectifs ── */}
            <TabsContent value="objectifs" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Objectifs individuels
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setAddObjectifOpen(true)}
                    data-testid="button-add-objectif"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {(!fullFiche.objectifs || fullFiche.objectifs.length === 0) ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Aucun objectif défini
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fullFiche.objectifs.map((obj) => (
                        <div
                          key={obj.id}
                          className="p-3 rounded-lg border border-border bg-muted/20"
                          data-testid={`objectif-${obj.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  obj.type === "TECHNIQUE"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                }`}>
                                  {obj.type === "TECHNIQUE" ? "Technique" : "Mental"}
                                </span>
                                <Select
                                  value={obj.statut}
                                  onValueChange={(v) =>
                                    updateObjectifMutation.mutate({ id: obj.id, statut: v })
                                  }
                                >
                                  <SelectTrigger className="h-6 w-auto text-xs border-0 bg-transparent p-0 gap-1 focus:ring-0">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      obj.statut === "Atteint" ? "badge-atteint" :
                                      obj.statut === "Abandonné" ? "badge-abandonne" : "badge-en-cours"
                                    }`}>
                                      {obj.statut}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="En cours">En cours</SelectItem>
                                    <SelectItem value="Atteint">Atteint</SelectItem>
                                    <SelectItem value="Abandonné">Abandonné</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="text-sm font-medium">{obj.libelle}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 italic">
                                "{obj.formulationEnfant}"
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => deleteObjectifMutation.mutate(obj.id)}
                              data-testid={`button-delete-objectif-${obj.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Notes ── */}
            <TabsContent value="notes" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 px-5 pt-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-primary" />
                    Notes internes (coachs)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {/* Add note */}
                  <div className="flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Ajouter une observation, idée ou information..."
                      rows={2}
                      className="flex-1 text-sm"
                      data-testid="input-new-note"
                    />
                    <Button
                      onClick={() => newNote.trim() && addNoteMutation.mutate()}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      size="sm"
                      className="self-end"
                      data-testid="button-add-note"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Notes list */}
                  {fullFiche.notesAdmin.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Aucune note interne
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...fullFiche.notesAdmin].reverse().map((note) => (
                        <div
                          key={note.id}
                          className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30"
                          data-testid={`note-${note.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm flex-1 whitespace-pre-wrap">{note.contenu}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1.5">
                            {new Date(note.dateCreation).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Note joueur */}
                  {fullFiche.noteJoueur && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Note du joueur
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-800/30 text-sm">
                        {fullFiche.noteJoueur.contenu || <span className="italic text-muted-foreground">Vide</span>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Modals */}
      <CreateFicheDialog
        open={createFicheOpen}
        onOpenChange={setCreateFicheOpen}
        joueurId={joueurId}
      />
      {activeFicheId && (
        <ObjectifDialog
          open={addObjectifOpen}
          onOpenChange={setAddObjectifOpen}
          ficheId={activeFicheId}
        />
      )}

      <AlertDialog open={!!deleteFicheId} onOpenChange={(open) => !open && setDeleteFicheId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les évaluations, objectifs et notes de cette période seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteFicheId && deleteFicheMutation.mutate(deleteFicheId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
