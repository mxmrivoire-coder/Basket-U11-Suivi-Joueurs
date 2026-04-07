import { useQuery } from "@tanstack/react-query";
import { Target, CheckCircle2, Clock, XCircle, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import type { Joueur, FicheSuivi, Objectif } from "@shared/schema";

export default function MesObjectifsPage() {
  const { data: joueurs = [] } = useQuery<Joueur[]>({ queryKey: ["/api/joueurs"] });
  const myJoueur = joueurs[0];

  const { data: fiches = [] } = useQuery<FicheSuivi[]>({
    queryKey: ["/api/joueurs", myJoueur?.id, "fiches"],
    queryFn: async () => {
      if (!myJoueur?.id) return [];
      const res = await apiRequest("GET", `/api/joueurs/${myJoueur.id}/fiches`);
      return res.json();
    },
    enabled: !!myJoueur?.id,
  });

  const currentFiche = fiches[0];

  const { data: objectifs = [], isLoading } = useQuery<Objectif[]>({
    queryKey: ["/api/fiches", currentFiche?.id, "objectifs"],
    queryFn: async () => {
      if (!currentFiche?.id) return [];
      const res = await apiRequest("GET", `/api/fiches/${currentFiche.id}/objectifs`);
      return res.json();
    },
    enabled: !!currentFiche?.id,
  });

  const enCours = objectifs.filter(o => o.statut === "En cours");
  const atteints = objectifs.filter(o => o.statut === "Atteint");
  const abandonnes = objectifs.filter(o => o.statut === "Abandonné");

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 max-w-2xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Mes objectifs
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {atteints.length} atteint{atteints.length !== 1 ? "s" : ""} · {enCours.length} en cours
        </p>
      </div>

      {objectifs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Pas encore d'objectif cette saison</p>
          </CardContent>
        </Card>
      )}

      {enCours.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">En cours</p>
          {enCours.map(obj => (
            <Card key={obj.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">« {obj.formulationEnfant} »</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{obj.libelle}</p>
                  <Badge variant="outline" className="mt-1.5 text-[10px] h-4">
                    {obj.type === "TECHNIQUE" ? "Technique" : "Mental"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {atteints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">✨ Atteints</p>
          {atteints.map(obj => (
            <Card key={obj.id} className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">« {obj.formulationEnfant} »</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{obj.libelle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {abandonnes.length > 0 && (
        <div className="space-y-2 opacity-60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abandonnés</p>
          {abandonnes.map(obj => (
            <Card key={obj.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{obj.libelle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
