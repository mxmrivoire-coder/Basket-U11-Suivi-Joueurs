import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus, Search, ChevronRight, Filter,
  Archive, ArchiveRestore, Trash2, Edit, Bell, X, UserCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Joueur } from "@shared/schema";

const PROFIL_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: "Candidat U13", color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20" },
  B: { label: "Ambitieux", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  C: { label: "En construction", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20" },
};

type JoueurForm = {
  nom: string; prenom: string; dateNaissance: string;
  equipe: string; profil: string; poste: string; numeroDossard: string;
  userId: string; // id du compte joueur lié ("" = aucun)
};

const defaultForm: JoueurForm = {
  nom: "", prenom: "", dateNaissance: "", equipe: "U11-1",
  profil: "C", poste: "", numeroDossard: "", userId: "",
};

export default function JoueursPage() {
  const { canWrite, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState("all");
  const [filterProfil, setFilterProfil] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJoueur, setEditJoueur] = useState<Joueur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Joueur | null>(null);
  const [form, setForm] = useState<JoueurForm>(defaultForm);

  const { data: joueurs = [], isLoading } = useQuery<Joueur[]>({
    queryKey: ["/api/joueurs", showArchived],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/joueurs${showArchived ? "?archived=true" : ""}`);
      return res.json();
    },
  });

  const { data: notifIds = [] } = useQuery<number[]>({
    queryKey: ["/api/notes-joueurs/non-lues"],
    enabled: canWrite,
  });

  // Liste des comptes avec rôle JOUEUR pour la liaison
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
    enabled: canWrite,
  });
  const compteJoueurs = allUsers.filter((u: any) => u.role === "JOUEUR");

  const createMutation = useMutation({
    mutationFn: async (data: JoueurForm) => {
      const res = await apiRequest("POST", "/api/joueurs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ description: "Joueur créé avec succès" });
    },
    onError: (e: any) => toast({ variant: "destructive", description: e.message || "Erreur" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: JoueurForm }) => {
      const res = await apiRequest("PUT", `/api/joueurs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      setDialogOpen(false);
      setEditJoueur(null);
      toast({ description: "Joueur modifié" });
    },
    onError: (e: any) => toast({ variant: "destructive", description: e.message || "Erreur" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/joueurs/${id}/archiver`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      toast({ description: "Joueur archivé" });
    },
  });

  const desarchiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/joueurs/${id}/desarchiver`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      toast({ description: "Joueur réactivé" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/joueurs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      setDeleteTarget(null);
      toast({ description: "Joueur supprimé définitivement" });
    },
  });

  const filtered = joueurs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${j.prenom} ${j.nom}`.toLowerCase().includes(q) ||
      (j.poste || "").toLowerCase().includes(q);
    const matchEquipe = filterEquipe === "all" || j.equipe === filterEquipe;
    const matchProfil = filterProfil === "all" || j.profil === filterProfil;
    return matchSearch && matchEquipe && matchProfil;
  });

  function openCreate() {
    setEditJoueur(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(j: Joueur) {
    setEditJoueur(j);
    setForm({
      nom: j.nom, prenom: j.prenom,
      dateNaissance: j.dateNaissance || "",
      equipe: j.equipe, profil: j.profil,
      poste: j.poste || "", numeroDossard: j.numeroDossard || "",
      userId: j.userId ? String(j.userId) : "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.nom || !form.prenom) return;
    // Convertir userId string -> number | null pour l'API
    const payload = {
      ...form,
      userId: form.userId ? parseInt(form.userId) : null,
    };
    if (editJoueur) {
      updateMutation.mutate({ id: editJoueur.id, data: payload as any });
    } else {
      createMutation.mutate(payload as any);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Joueurs</h1>
          <p className="text-sm text-muted-foreground">
            {joueurs.length} joueur{joueurs.length !== 1 ? "s" : ""} {showArchived ? "(avec archivés)" : "actifs"}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} data-testid="button-create-joueur" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau joueur
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
            data-testid="input-search-joueur"
          />
        </div>
        <Select value={filterEquipe} onValueChange={setFilterEquipe}>
          <SelectTrigger className="w-36 h-9" data-testid="select-filter-equipe">
            <SelectValue placeholder="Équipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes équipes</SelectItem>
            <SelectItem value="U11-1">U11-1</SelectItem>
            <SelectItem value="U11-2">U11-2</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProfil} onValueChange={setFilterProfil}>
          <SelectTrigger className="w-44 h-9" data-testid="select-filter-profil">
            <SelectValue placeholder="Profil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous profils</SelectItem>
            <SelectItem value="A">Candidat U13</SelectItem>
            <SelectItem value="B">Ambitieux</SelectItem>
            <SelectItem value="C">En construction</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="h-9 gap-1.5 text-xs"
        >
          <Archive className="h-3.5 w-3.5" />
          Archivés
        </Button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || filterEquipe !== "all" || filterProfil !== "all"
                ? "Aucun joueur ne correspond à votre recherche"
                : "Aucun joueur enregistré"}
            </p>
            {canWrite && !search && (
              <Button onClick={openCreate} size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Créer le premier joueur
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(joueur => {
            const hasNotif = notifIds.includes(joueur.id);
            const profil = PROFIL_LABELS[joueur.profil];
            return (
              <div
                key={joueur.id}
                className="flex items-center gap-3 px-3 py-3 bg-card border border-border rounded-xl hover:border-border/80 hover:bg-muted/30 transition-all group"
                data-testid={`card-joueur-${joueur.id}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {joueur.prenom[0]}{joueur.nom[0]}
                    </span>
                  </div>
                  {hasNotif && (
                    <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-orange-500 border-2 border-background animate-pulse" />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {joueur.prenom} {joueur.nom}
                    </span>
                    {joueur.numeroDossard && (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        #{joueur.numeroDossard}
                      </span>
                    )}
                    {joueur.archive && (
                      <Badge variant="secondary" className="text-[10px] h-4">Archivé</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{joueur.equipe}</span>
                    {joueur.poste && (
                      <>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{joueur.poste}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Profil badge + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${profil?.color} hidden sm:inline-flex`}>
                    {profil?.label}
                  </span>
                  {canWrite && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7"
                        onClick={e => { e.preventDefault(); openEdit(joueur); }}
                        data-testid={`button-edit-joueur-${joueur.id}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {!joueur.archive ? (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-orange-500"
                          title="Archiver ce joueur"
                          onClick={e => { e.preventDefault(); archiveMutation.mutate(joueur.id); }}
                          data-testid={`button-archive-joueur-${joueur.id}`}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-green-600"
                          title="Réactiver ce joueur"
                          onClick={e => { e.preventDefault(); desarchiveMutation.mutate(joueur.id); }}
                          data-testid={`button-desarchiver-joueur-${joueur.id}`}
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={e => { e.preventDefault(); setDeleteTarget(joueur); }}
                          data-testid={`button-delete-joueur-${joueur.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  <Link href={`/joueurs/${joueur.id}`} data-testid={`link-fiche-${joueur.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors cursor-pointer" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog créer/modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editJoueur ? "Modifier le joueur" : "Nouveau joueur"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom" value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                data-testid="input-prenom"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom" value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                data-testid="input-nom"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateNaissance">Date de naissance</Label>
              <Input
                id="dateNaissance" type="date" value={form.dateNaissance}
                onChange={e => setForm(f => ({ ...f, dateNaissance: e.target.value }))}
                data-testid="input-date-naissance"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroDossard">N° dossard</Label>
              <Input
                id="numeroDossard" value={form.numeroDossard}
                onChange={e => setForm(f => ({ ...f, numeroDossard: e.target.value }))}
                data-testid="input-numero-dossard"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Équipe</Label>
              <Select value={form.equipe} onValueChange={v => setForm(f => ({ ...f, equipe: v }))}>
                <SelectTrigger data-testid="select-equipe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="U11-1">U11-1</SelectItem>
                  <SelectItem value="U11-2">U11-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profil</Label>
              <Select value={form.profil} onValueChange={v => setForm(f => ({ ...f, profil: v }))}>
                <SelectTrigger data-testid="select-profil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A — Candidat U13</SelectItem>
                  <SelectItem value="B">B — Ambitieux</SelectItem>
                  <SelectItem value="C">C — En construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="poste">Poste</Label>
              <Input
                id="poste" value={form.poste} placeholder="ex: Meneur, Ailier, Pivot..."
                onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}
                data-testid="input-poste"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Compte joueur</Label>
              <Select
                value={form.userId || "none"}
                onValueChange={v => setForm(f => ({ ...f, userId: v === "none" ? "" : v }))}
              >
                <SelectTrigger data-testid="select-user-id">
                  <SelectValue placeholder="Aucun compte lié" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Aucun compte lié</span>
                  </SelectItem>
                  {compteJoueurs.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.prenom} {u.nom}
                      <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {compteJoueurs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun compte avec le rôle Joueur. Créez-en un dans Utilisateurs d’abord.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nom || !form.prenom || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-joueur"
            >
              {editJoueur ? "Enregistrer" : "Créer le joueur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement {deleteTarget?.prenom} {deleteTarget?.nom} et
              toutes ses données (fiches, évaluations, notes). Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
