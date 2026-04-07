import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Pencil, Trash2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/hooks/use-auth";
import type { User as UserType } from "@shared/schema";

type SafeUser = Omit<UserType, "password">;

type UserForm = {
  nom: string;
  prenom: string;
  email: string;
  role: string;
  password: string;
};

const emptyForm: UserForm = {
  nom: "",
  prenom: "",
  email: "",
  role: "JOUEUR",
  password: "",
};

function UserFormDialog({
  open,
  onOpenChange,
  initial,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<UserForm>;
  userId?: number;
}) {
  const [form, setForm] = useState<UserForm>({ ...emptyForm, ...initial });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (userId) {
        const payload: Partial<UserForm> = { ...form };
        if (!payload.password) delete payload.password;
        const res = await apiRequest("PUT", `/api/users/${userId}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/users", form);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onOpenChange(false);
      toast({ title: userId ? "Utilisateur modifié" : "Utilisateur créé" });
    },
    onError: async (err: any) => {
      const body = await err?.response?.json?.().catch(() => ({}));
      toast({
        title: "Erreur",
        description: body?.error || "Impossible de sauvegarder",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{userId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                required
                placeholder="Lucas"
                data-testid="input-user-prenom"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                placeholder="Martin"
                data-testid="input-user-nom"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="prenom.nom@example.com"
              data-testid="input-user-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin (coach)</SelectItem>
                <SelectItem value="JOUEUR">Joueur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{userId ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={userId ? "(inchangé)" : "Minimum 6 caractères"}
              required={!userId}
              data-testid="input-user-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !form.nom ||
              !form.prenom ||
              !form.email ||
              (!userId && !form.password)
            }
            data-testid="button-save-user"
          >
            {mutation.isPending ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UtilisateursPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<SafeUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Utilisateur supprimé" });
      setDeleteUser(null);
    },
  });

  const admins = users?.filter((u) => u.role === "ADMIN") ?? [];
  const joueurs = users?.filter((u) => u.role === "JOUEUR") ?? [];

  function UserRow({ u }: { u: SafeUser }) {
    const isMe = u.id === currentUser?.id;
    return (
      <div
        className="flex items-center gap-3 px-5 py-3.5 group hover:bg-muted/30 transition-colors"
        data-testid={`row-user-${u.id}`}
      >
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          u.role === "ADMIN"
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-secondary-foreground"
        }`}>
          {u.prenom[0]}{u.nom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {u.prenom} {u.nom}
            </span>
            {isMe && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Vous
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex items-center gap-1 ${
            u.role === "ADMIN"
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-secondary-foreground"
          }`}>
            {u.role === "ADMIN" ? (
              <><ShieldCheck className="h-3 w-3" /> Admin</>
            ) : (
              <><User className="h-3 w-3" /> Joueur</>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() => setEditUser(u)}
            data-testid={`button-edit-user-${u.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!isMe && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
              onClick={() => setDeleteUser(u)}
              data-testid={`button-delete-user-${u.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users?.length ?? 0} compte{(users?.length ?? 0) > 1 ? "s" : ""} au total
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" data-testid="button-add-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Nouveau compte
        </Button>
      </div>

      {/* Admins */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Administrateurs · Coachs ({admins.length})
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucun admin</div>
            ) : (
              <div className="divide-y divide-border">
                {admins.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Joueurs */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          Comptes joueurs ({joueurs.length})
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : joueurs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucun joueur</div>
            ) : (
              <div className="divide-y divide-border">
                {joueurs.map((u) => <UserRow key={u.id} u={u} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editUser && (
        <UserFormDialog
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          initial={{ nom: editUser.nom, prenom: editUser.prenom, email: editUser.email, role: editUser.role, password: "" }}
          userId={editUser.id}
        />
      )}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de {deleteUser?.prenom} {deleteUser?.nom} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
              data-testid="button-confirm-delete-user"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
