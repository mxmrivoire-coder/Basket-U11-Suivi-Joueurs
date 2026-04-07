import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, TrendingUp, Target, MessageSquare,
  ChevronRight, Star, Clock, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Joueur } from "@shared/schema";

const PROFIL_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: "Candidat U13", color: "bg-green-500/15 text-green-600 dark:text-green-400" },
  B: { label: "Ambitieux", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  C: { label: "En construction", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
};

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();

  const { data: joueurs = [], isLoading: joueursLoading } = useQuery<Joueur[]>({
    queryKey: ["/api/joueurs"],
  });

  const { data: notifIds = [] } = useQuery<number[]>({
    queryKey: ["/api/notes-joueurs/non-lues"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const joueursByEquipe = joueurs.reduce((acc: Record<string, number>, j) => {
    acc[j.equipe] = (acc[j.equipe] || 0) + 1;
    return acc;
  }, {});

  const joueursU13 = joueurs.filter(j => j.profil === "A").length;

  const WELCOME: Record<string, string> = {
    SUPER_ADMIN: `Bonjour ${user?.prenom} — Vue super administrateur`,
    ADMIN: `Bonjour ${user?.prenom} — Bonne séance !`,
    READONLY: `Bonjour ${user?.prenom} — Mode consultation`,
    JOUEUR: `Bonjour ${user?.prenom}`,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {WELCOME[user?.role || "ADMIN"]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tableau de bord — Saison 2024-2025
          </p>
        </div>
        {notifIds.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
            <Bell className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {notifIds.length} note{notifIds.length > 1 ? "s" : ""} non lue{notifIds.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Joueurs actifs"
          value={joueursLoading ? "—" : joueurs.length}
          sub="Total effectif"
        />
        <StatCard
          icon={TrendingUp}
          label="Candidats U13"
          value={joueursLoading ? "—" : joueursU13}
          sub="Profil A"
        />
        <StatCard
          icon={Target}
          label="U11-1"
          value={joueursLoading ? "—" : (joueursByEquipe["U11-1"] || 0)}
          sub="Équipe 1"
        />
        <StatCard
          icon={MessageSquare}
          label="U11-2"
          value={joueursLoading ? "—" : (joueursByEquipe["U11-2"] || 0)}
          sub="Équipe 2"
        />
      </div>

      {/* Liste joueurs avec accès rapide */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Accès rapide joueurs
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
            <Link href="/joueurs">
              Voir tous <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {joueursLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : joueurs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun joueur enregistré
            </div>
          ) : (
            <div className="space-y-1">
              {joueurs.slice(0, 8).map((joueur) => {
                const hasNotif = notifIds.includes(joueur.id);
                const profil = PROFIL_LABELS[joueur.profil];
                return (
                  <Link
                    key={joueur.id}
                    href={`/joueurs/${joueur.id}`}
                    data-testid={`link-joueur-${joueur.id}`}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {joueur.prenom[0]}{joueur.nom[0]}
                          </span>
                        </div>
                        {hasNotif && (
                          <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-orange-500 border-2 border-background animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {joueur.prenom} {joueur.nom}
                          </span>
                          {hasNotif && (
                            <span className="text-[10px] font-semibold bg-orange-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
                              Note
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">{joueur.equipe}</span>
                          {joueur.poste && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-xs text-muted-foreground">{joueur.poste}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${profil?.color}`}>
                          {profil?.label}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
              {joueurs.length > 8 && (
                <div className="pt-2 text-center">
                  <Link href="/joueurs">
                    <span className="text-xs text-primary hover:underline cursor-pointer">
                      + {joueurs.length - 8} joueur{joueurs.length - 8 > 1 ? "s" : ""} supplémentaire{joueurs.length - 8 > 1 ? "s" : ""}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raccourcis admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <Link href="/joueurs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Gérer les joueurs</p>
                  <p className="text-xs text-muted-foreground">Créer, modifier, archiver</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Link>
          </Card>
          {isSuperAdmin && (
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <Link href="/utilisateurs">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Gérer les comptes</p>
                    <p className="text-xs text-muted-foreground">Utilisateurs et rôles</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
