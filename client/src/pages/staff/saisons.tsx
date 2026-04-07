import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Saison } from "@shared/schema";

export default function SaisonsPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ libelle: "", dateDebut: "", dateFin: "" });

  const { data: saisons = [] } = useQuery<Saison[]>({
    queryKey: ["/api/saisons"],
  });

  const createMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await apiRequest("POST", "/api/saisons", d);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saisons"] });
      setDialogOpen(false);
      setForm({ libelle: "", dateDebut: "", dateFin: "" });
      toast({ description: "Saison créée" });
    },
  });

  const activerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/saisons/${id}/activer`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saisons"] });
      toast({ description: "Saison activée" });
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Accès réservé au super administrateur
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Saisons</h1>
          <p className="text-sm text-muted-foreground">{saisons.length} saison{saisons.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Nouvelle saison
        </Button>
      </div>

      <div className="space-y-2">
        {saisons.map(s => (
          <Card key={s.id} className={s.active ? "border-primary/30" : ""}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${s.active ? "bg-primary/10" : "bg-muted"}`}>
                  <CalendarDays className={`h-4 w-4 ${s.active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.libelle}</span>
                    {s.active && <Badge className="text-[10px] h-4">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.dateDebut).toLocaleDateString("fr-FR")} → {new Date(s.dateFin).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              {!s.active && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => activerMutation.mutate(s.id)}
                  className="gap-2 h-7 text-xs"
                >
                  <Check className="h-3.5 w-3.5" /> Activer
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle saison</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Libellé</Label>
              <Input value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="ex: 2025-2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date début</Label>
                <Input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date fin</Label>
                <Input type="date" value={form.dateFin} onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.libelle || !form.dateDebut || !form.dateFin}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
