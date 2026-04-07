import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, TrendingUp, Star, Clock, ChevronRight, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Joueur } from "@shared/schema";

const profilLabels: Record<string, { label: string; className: string }> = {
  A: { label: "Candidat U13", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  B: { label: "Ambitieux U11", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  C: { label: "En construction", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-5 px-5">
        <div className="flex items-center gap-4">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
              {value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: joueurs, isLoading } = useQuery<Joueur[]>({
    queryKey: ["/api/joueurs"],
  });

  const totalJoueurs = joueurs?.length ?? 0;
  const u11_1 = joueurs?.filter((j) => j.equipe === "U11-1").length ?? 0;
  const u11_2 = joueurs?.filter((j) => j.equipe === "U11-2").length ?? 0;
  const profilA = joueurs?.filter((j) => j.profil === "A").length ?? 0;

  // Recent joueurs (last 5)
  const recentJoueurs = joueurs?.slice(-5).reverse() ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vue d'ensemble de vos équipes U11
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5 px-5">
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={Users}
              value={totalJoueurs}
              label="Joueurs total"
              color="bg-primary/10 text-primary"
            />
            <StatCard
              icon={TrendingUp}
              value={u11_1}
              label="Équipe U11-1"
              color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            />
            <StatCard
              icon={Clock}
              value={u11_2}
              label="Équipe U11-2"
              color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            />
            <StatCard
              icon={Star}
              value={profilA}
              label="Candidats U13"
              color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            />
          </>
        )}
      </div>

      {/* Joueurs list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Joueurs récents</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/joueurs">
              Voir tous <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : recentJoueurs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground text-sm mb-3">Aucun joueur créé</div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/joueurs">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un joueur
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentJoueurs.map((j) => {
                const profil = profilLabels[j.profil] ?? profilLabels.C;
                return (
                  <Link
                    key={j.id}
                    href={`/joueurs/${j.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors group"
                    data-testid={`row-joueur-${j.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {j.prenom[0]}{j.nom[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {j.prenom} {j.nom}
                        </div>
                        <div className="text-xs text-muted-foreground">{j.equipe}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profil.className}`}>
                        {profil.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
