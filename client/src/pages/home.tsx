import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ClipboardList, LayoutDashboard, Star, Target, BookOpen, MessageSquare } from "lucide-react";
import type { Joueur } from "@shared/schema";

// ── Vue Admin ──────────────────────────────────────────────────────────────────
function AdminHome() {
  const { user } = useAuth();
  const { data: joueurs } = useQuery<Joueur[]>({ queryKey: ["/api/joueurs"] });
  const { data: nonLues } = useQuery<number[]>({
    queryKey: ["/api/notes-joueurs/non-lues"],
    refetchInterval: 30_000, // rafraîchit toutes les 30s
  });
  const nonLuesSet = new Set(nonLues ?? []);

  const cards = [
    {
      href: "/joueurs",
      icon: Users,
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      title: "Joueurs",
      desc: joueurs ? `${joueurs.length} joueur${joueurs.length > 1 ? "s" : ""} enregistré${joueurs.length > 1 ? "s" : ""}` : "Gérer les joueurs",
    },
    {
      href: "/joueurs",
      icon: ClipboardList,
      color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
      title: "Fiches de suivi",
      desc: "Évaluations, objectifs, notes",
    },
    {
      href: "/utilisateurs",
      icon: LayoutDashboard,
      color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
      title: "Utilisateurs",
      desc: "Comptes admin & joueurs",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold">
          Bonjour, {user?.prenom ?? "Coach"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Tableau de bord — Basket U11 · Suivi des joueurs
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={title} href={href}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 px-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Accès rapide joueurs récents */}
      {joueurs && joueurs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Accès rapide — Joueurs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {joueurs.slice(0, 6).map((j) => (
              <Link key={j.id} href={`/joueurs/${j.id}`}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="relative w-8 h-8 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
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
                    <div className="text-sm font-medium">{j.prenom} {j.nom}</div>
                    <div className="text-xs text-muted-foreground">#{j.numero} · {j.poste}</div>
                  </div>
                  {nonLuesSet.has(j.id) && (
                    <span className="flex items-center gap-1 text-xs text-orange-600 font-medium shrink-0">
                      <MessageSquare className="h-3 w-3" />
                      Note
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {joueurs.length > 6 && (
            <Link href="/joueurs">
              <Button variant="outline" size="sm" className="w-full mt-1">
                Voir tous les joueurs ({joueurs.length})
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Vue Joueur ─────────────────────────────────────────────────────────────────
function JoueurHome() {
  const { user } = useAuth();
  const { data: joueurs, isLoading } = useQuery<Joueur[]>({ queryKey: ["/api/joueurs"] });
  const joueur = joueurs?.[0] ?? null;

  const cards = [
    {
      href: "/ma-fiche",
      icon: Star,
      color: "bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400",
      title: "Ma fiche",
      desc: "Mes compétences et évaluations",
    },
    {
      href: "/mes-objectifs",
      icon: Target,
      color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
      title: "Mes objectifs",
      desc: "Ce que je dois travailler",
    },
    {
      href: "/ma-fiche",
      icon: BookOpen,
      color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      title: "Ma note",
      desc: "Écrire à mon coach",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-1">
        {isLoading ? (
          <Skeleton className="h-7 w-48" />
        ) : (
          <>
            <h1 className="text-xl font-bold">
              Salut, {joueur?.prenom ?? user?.prenom ?? "Joueur"} ! 🏀
            </h1>
            <p className="text-sm text-muted-foreground">
              {joueur
                ? `#${joueur.numero} · ${joueur.poste} · ${joueur.equipe}`
                : "Bienvenue dans ton espace basket"}
            </p>
          </>
        )}
      </div>

      {/* Motivation du jour */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-primary">
          💡 Chaque entraînement compte. Continue comme ça !
        </p>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={title} href={href}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 px-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!joueur && !isLoading && (
        <div className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/40 border">
          Ton compte n'est pas encore lié à un joueur. Demande à ton coach de faire le lien.
        </div>
      )}
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminHome /> : <JoueurHome />;
}
