import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Edit, Shield, UserCheck, UserX, Key,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@shared/schema";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "READONLY" | "JOUEUR";

const ROLE_CONFIG: Record<UserRole, { label: string; badge: string }> = {
  SUPER_ADMIN: { label: "Super Admin", badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  ADMIN: { label: "Coach / Admin", badge: "bg-primary/15 text-primary border-primary/20" },
  READONLY: { label: "Lecture seule", badge: "bg-muted text-muted-foreground" },
  JOUEUR: { label: "Joueur", badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
};

type UserForm = {
  nom: string; prenom: string; email: string; role: UserRole;
  password: string; actif: boolean;
};

const defaultForm: UserForm = {
  nom: "", prenom: "", email: "", role: "ADMIN",
  password: "", actif: true,
};

export default function UtilisateursPage() {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(defaultForm);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ description: "Utilisateur créé" });
    },
    onError: (e: any) => toast({ variant: "destructive", description: e.message || "Erreur" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserForm> }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
      setEditUser(null);
      toast({ description: "Utilisateur modifié" });
    },
    onError: (e: any) => toast({ variant: "destructive", description: e.message || "Erreur" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteTarget(null);
      toast({ description: "Utilisateur supprimé" });
    },
  });

  function openCreate() {
    setEditUser(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({
      nom: u.nom, prenom: u.prenom, email: u.email,
      role: u.role as UserRole,
      password: "",
      actif: u.actif ?? true,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.nom || !form.prenom || !form.email) return;
    if (editUser) {
      const updates: Partial<UserForm> = {
        nom: form.nom, prenom: form.prenom, email: form.email,
        role: form.role, actif: form.actif,
      };
      if (form.password) updates.password = form.password;
      updateMutation.mutate({ id: editUser.id, data: updates });
    } else {
      if (!form.password) return toast({ variant: "destructive", description: "Mot de passe requis" });
      createMutation.mutate(form);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Accès réservé au super administrateur</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} compte{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2" data-testid="button-create-user">
          <Plus className="h-4 w-4" /> Nouveau compte
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {users.map(u => {
            const roleConf = ROLE_CONFIG[u.role as UserRole] || ROLE_CONFIG.JOUEUR;
            const isCurrentUser = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-3 bg-card border border-border rounded-xl group hover:bg-muted/30 transition-all"
                data-testid={`card-user-${u.id}`}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{u.prenom[0]}{u.nom[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {u.prenom} {u.nom}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">vous</span>
                    )}
                    {!u.actif && (
                      <Badge variant="secondary" className="text-[10px] h-4 shrink-0">Inactif</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleConf.badge} hidden sm:inline-flex`}>
                    {roleConf.label}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openEdit(u)}
                      data-testid={`button-edit-user-${u.id}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {!isCurrentUser && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                        data-testid={`button-delete-user-${u.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
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
            <DialogTitle>{editUser ? "Modifier le compte" : "Nouveau compte"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} data-testid="input-user-prenom" />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} data-testid="input-user-nom" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} data-testid="input-user-email" />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Coach / Admin</SelectItem>
                  <SelectItem value="READONLY">Lecture seule</SelectItem>
                  <SelectItem value="JOUEUR">Joueur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Compte actif</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={form.actif}
                  onCheckedChange={v => setForm(f => ({ ...f, actif: v }))}
                  data-testid="switch-actif"
                />
              </div>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{editUser ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editUser ? "Laisser vide pour ne pas modifier" : "Mot de passe"}
                data-testid="input-user-password"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nom || !form.prenom || !form.email || createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-user"
            >
              {editUser ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de {deleteTarget?.prenom} {deleteTarget?.nom} sera supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
