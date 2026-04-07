import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { UserPlus, Search, ChevronRight, Pencil, Trash2, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import type { Joueur } from "@shared/schema";

const profilLabels: Record<string, { label: string; short: string; className: string }> = {
  A: { label: "Candidat U13", short: "A", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  B: { label: "Ambitieux U11", short: "B", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  C: { label: "En construction", short: "C", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

type JoueurFormData = {
  nom: string;
  prenom: string;
  dateNaissance: string;
  equipe: string;
  profil: string;
};

const emptyForm: JoueurFormData = {
  nom: "",
  prenom: "",
  dateNaissance: "",
  equipe: "U11-1",
  profil: "C",
};

function JoueurFormDialog({
  open,
  onOpenChange,
  initial,
  joueurId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<JoueurFormData>;
  joueurId?: number;
}) {
  const [form, setForm] = useState<JoueurFormData>({ ...emptyForm, ...initial });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: JoueurFormData) => {
      if (joueurId) {
        const res = await apiRequest("PUT", `/api/joueurs/${joueurId}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/joueurs", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      onOpenChange(false);
      toast({ title: joueurId ? "Joueur modifié" : "Joueur créé", description: `${form.prenom} ${form.nom}` });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{joueurId ? "Modifier le joueur" : "Nouveau joueur"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                required
                placeholder="Lucas"
                data-testid="input-prenom"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Martin"
                data-testid="input-nom"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date de naissance</Label>
            <Input
              type="date"
              value={form.dateNaissance}
              onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
              data-testid="input-date-naissance"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Équipe</Label>
              <Select value={form.equipe} onValueChange={(v) => setForm({ ...form, equipe: v })}>
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
              <Select value={form.profil} onValueChange={(v) => setForm({ ...form, profil: v })}>
                <SelectTrigger data-testid="select-profil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A – Candidat U13</SelectItem>
                  <SelectItem value="B">B – Ambitieux U11</SelectItem>
                  <SelectItem value="C">C – En construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-joueur">
              {mutation.isPending ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function JoueursPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: joueurs, isLoading } = useQuery<Joueur[]>({ queryKey: ["/api/joueurs"] });
  const { data: nonLues } = useQuery<number[]>({
    queryKey: ["/api/notes-joueurs/non-lues"],
    refetchInterval: 30_000,
  });
  const nonLuesSet = new Set(nonLues ?? []);

  const [search, setSearch] = useState("");
  const [filterEquipe, setFilterEquipe] = useState("all");
  const [filterProfil, setFilterProfil] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editJoueur, setEditJoueur] = useState<Joueur | null>(null);
  const [deleteJoueur, setDeleteJoueur] = useState<Joueur | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/joueurs/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/joueurs"] });
      toast({ title: "Joueur supprimé" });
      setDeleteJoueur(null);
    },
  });

  const filtered = (joueurs ?? []).filter((j) => {
    const matchSearch =
      !search ||
      `${j.prenom} ${j.nom}`.toLowerCase().includes(search.toLowerCase());
    const matchEquipe = filterEquipe === "all" || j.equipe === filterEquipe;
    const matchProfil = filterProfil === "all" || j.profil === filterProfil;
    return matchSearch && matchEquipe && matchProfil;
  });

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Joueurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {joueurs?.length ?? 0} joueur{(joueurs?.length ?? 0) > 1 ? "s" : ""} enregistré{(joueurs?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-add-joueur" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Nouveau joueur
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            data-testid="input-search"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterEquipe} onValueChange={setFilterEquipe}>
          <SelectTrigger className="w-32 h-9" data-testid="select-filter-equipe">
            <SelectValue placeholder="Équipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="U11-1">U11-1</SelectItem>
            <SelectItem value="U11-2">U11-2</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProfil} onValueChange={setFilterProfil}>
          <SelectTrigger className="w-40 h-9" data-testid="select-filter-profil">
            <SelectValue placeholder="Profil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous profils</SelectItem>
            <SelectItem value="A">A – Candidat U13</SelectItem>
            <SelectItem value="B">B – Ambitieux</SelectItem>
            <SelectItem value="C">C – En construction</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search || filterEquipe !== "all" || filterProfil !== "all"
                ? "Aucun joueur ne correspond aux filtres"
                : "Aucun joueur enregistré"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((j) => {
                const profil = profilLabels[j.profil] ?? profilLabels.C;
                return (
                  <div
                    key={j.id}
                    className="flex items-center gap-3 px-5 py-3.5 group hover:bg-muted/30 transition-colors"
                    data-testid={`row-joueur-${j.id}`}
                  >
                    <Link href={`/joueurs/${j.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative h-9 w-9 shrink-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {j.prenom[0]}{j.nom[0]}
                        </div>
                        {nonLuesSet.has(j.id) && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {j.prenom} {j.nom}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {j.equipe}{j.dateNaissance ? ` · né(e) le ${j.dateNaissance}` : ""}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {nonLuesSet.has(j.id) && (
                        <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                          <MessageSquare className="h-3 w-3" />
                          <span className="hidden sm:inline">Note</span>
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex ${profil.className}`}>
                        {profil.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium sm:hidden ${profil.className}`}>
                        {profil.short}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => setEditJoueur(j)}
                        data-testid={`button-edit-joueur-${j.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => setDeleteJoueur(j)}
                        data-testid={`button-delete-joueur-${j.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/joueurs/${j.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <JoueurFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editJoueur && (
        <JoueurFormDialog
          open={!!editJoueur}
          onOpenChange={(open) => !open && setEditJoueur(null)}
          initial={editJoueur}
          joueurId={editJoueur.id}
        />
      )}
      <AlertDialog open={!!deleteJoueur} onOpenChange={(open) => !open && setDeleteJoueur(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le joueur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement {deleteJoueur?.prenom} {deleteJoueur?.nom} et toutes ses fiches.
              Elle est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteJoueur && deleteMutation.mutate(deleteJoueur.id)}
              data-testid="button-confirm-delete"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
