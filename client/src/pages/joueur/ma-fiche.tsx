import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Target, Dumbbell, Brain, MessageCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Joueur, FicheSuivi, EvalTech, EvalMentale, Objectif, NoteJoueur, Observation } from "@shared/schema";

type FicheCompleteData = {
  fiche: FicheSuivi;
  joueur: Joueur;
  evalTech: EvalTech | null;
  evalMentale: EvalMentale | null;
  objectifs: Objectif[];
  observations: Observation[];
  noteJoueur: NoteJoueur | null;
};

// ─── Labels tech pour les enfants ────────────────────────────────────────────
const TECH_ENFANT: Record<string, { label: string; emoji: string; color: string }> = {
  début: { label: "Je découvre", emoji: "👀", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
  à_travailler: { label: "Je m'entraîne", emoji: "💪", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  en_cours: { label: "Je progresse", emoji: "📈", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
  acquis: { label: "Je sais faire", emoji: "✅", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  maîtrise: { label: "Je maîtrise", emoji: "🌟", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
};

const MENTAL_ENFANT = [
  { label: "J'ai du mal", emoji: "😐" },
  { label: "Ça commence", emoji: "🙂" },
  { label: "C'est bien", emoji: "😊" },
  { label: "Je suis bon", emoji: "😄" },
  { label: "Je suis top !", emoji: "🙌" },
];

const MENTAL_COLORS = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-blue-400", "bg-emerald-400"];

const TECH_COMPETENCES_STD = [
  { key: "dribbleMainDroite", label: "Dribble main droite" },
  { key: "dribbleMainGauche", label: "Dribble main gauche" },
  { key: "changementMain", label: "Changement de main" },
  { key: "tirCercleDroite", label: "Tir au cercle (droite)" },
  { key: "tirCercleGauche", label: "Tir au cercle (gauche)" },
  { key: "passeDeuxMains", label: "Passe à deux mains" },
  { key: "passeUneMain", label: "Passe à une main" },
  { key: "attraperSousPression", label: "Attraper sous pression" },
  { key: "comprehension1c1", label: "Jeu en 1 contre 1" },
  { key: "duelsSimples", label: "Duels" },
  { key: "placementSansBallon", label: "Me placer sans ballon" },
  { key: "occupationEspaces", label: "Occuper l'espace" },
];

const MENTAL_COMPETENCES_STD = [
  { key: "concentration", label: "Ma concentration" },
  { key: "coachabilite", label: "J'écoute le coach" },
  { key: "gestionFrustration", label: "Je gère la pression" },
  { key: "confianceMatch", label: "Ma confiance en match" },
  { key: "espritCollectif", label: "Mon esprit d'équipe" },
  { key: "plaisirVisible", label: "Mon plaisir de jouer" },
];

export default function MaFichePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("accueil");

  // Récupérer mes joueurs
  const { data: joueurs = [] } = useQuery<Joueur[]>({
    queryKey: ["/api/joueurs"],
  });

  const myJoueur = joueurs[0];

  // Récupérer mes fiches
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

  // Fiche complète
  const { data, isLoading } = useQuery<FicheCompleteData>({
    queryKey: ["/api/fiches", currentFiche?.id, "full"],
    queryFn: async () => {
      if (!currentFiche?.id) return null;
      const res = await apiRequest("GET", `/api/fiches/${currentFiche.id}/full`);
      return res.json();
    },
    enabled: !!currentFiche?.id,
  });

  const displayNote = noteContent !== null ? noteContent : (data?.noteJoueur?.contenu || "");

  const saveNoteMutation = useMutation({
    mutationFn: async (contenu: string) => {
      const res = await apiRequest("PUT", `/api/fiches/${currentFiche!.id}/note-joueur`, { contenu });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiches", currentFiche?.id, "full"] });
      setNoteContent(null);
      toast({ description: "Message envoyé au coach !" });
    },
  });

  if (isLoading || !myJoueur) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data || !currentFiche) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Pas encore de fiche disponible. Ton coach va la créer bientôt !</p>
      </div>
    );
  }

  const { joueur, evalTech, evalMentale, objectifs } = data;
  const objectifsEnCours = objectifs.filter(o => o.statut === "En cours");
  const objectifsAtteints = objectifs.filter(o => o.statut === "Atteint");

  const customTech = (() => {
    try { return JSON.parse((evalTech as any)?.competencesCustom || "[]"); } catch { return []; }
  })();
  const customMental = (() => {
    try { return JSON.parse((evalMentale as any)?.competencesCustom || "[]"); } catch { return []; }
  })();

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/80 to-primary p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {joueur.prenom[0]}{joueur.nom[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">{joueur.prenom} {joueur.nom}</h1>
            <p className="text-white/80 text-sm">
              {joueur.equipe} {joueur.poste ? `· ${joueur.poste}` : ""}
              {joueur.numeroDossard ? ` · #${joueur.numeroDossard}` : ""}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              Saison {currentFiche.periodeDebut?.slice(0, 4)}–{currentFiche.periodeFin?.slice(0, 4)}
            </p>
          </div>
        </div>
        {objectifsAtteints.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
            <Star className="h-4 w-4" />
            <span className="text-sm font-medium">
              {objectifsAtteints.length} objectif{objectifsAtteints.length > 1 ? "s" : ""} atteint{objectifsAtteints.length > 1 ? "s" : ""} 🎉
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-10">
          <TabsTrigger value="accueil" className="text-xs">🏠 Accueil</TabsTrigger>
          <TabsTrigger value="technique" className="text-xs">🏀 Technique</TabsTrigger>
          <TabsTrigger value="mental" className="text-xs">🧠 Mental</TabsTrigger>
          <TabsTrigger value="observations" className="text-xs">📋 Coach</TabsTrigger>
          <TabsTrigger value="message" className="text-xs">💬 Message</TabsTrigger>
        </TabsList>

        {/* ─── Accueil / Objectifs ──────────────────────────────────────────── */}
        <TabsContent value="accueil" className="space-y-4 mt-4">
          {/* Mes objectifs en cours */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Mes objectifs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {objectifsEnCours.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Pas encore d'objectif cette saison !
                </p>
              ) : (
                objectifsEnCours.map(obj => (
                  <div key={obj.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                    <Clock className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">« {obj.formulationEnfant} »</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{obj.libelle}</p>
                    </div>
                  </div>
                ))
              )}
              {objectifsAtteints.length > 0 && (
                <div className="pt-2 border-t border-dashed border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Déjà atteints ✨</p>
                  {objectifsAtteints.map(obj => (
                    <div key={obj.id} className="flex items-start gap-3 p-2 rounded-lg opacity-70">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">« {obj.formulationEnfant} »</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ce que dit le coach */}
          {(data.fiche.pointsForts || data.fiche.axesPrioritaires) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ce que dit le coach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.fiche.pointsForts && (
                  <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">✅ Tes points forts</p>
                    <p className="text-sm text-foreground">{data.fiche.pointsForts}</p>
                  </div>
                )}
                {data.fiche.axesPrioritaires && (
                  <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">💪 À travailler</p>
                    <p className="text-sm text-foreground">{data.fiche.axesPrioritaires}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Technique ────────────────────────────────────────────────────── */}
        <TabsContent value="technique" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" /> Mes compétences techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {TECH_COMPETENCES_STD.map(comp => {
                const niveau = (evalTech as any)?.[comp.key] || "début";
                const config = TECH_ENFANT[niveau] || TECH_ENFANT.début;
                return (
                  <div key={comp.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{comp.label}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${config.color} shrink-0`}>
                      {config.emoji} {config.label}
                    </span>
                  </div>
                );
              })}
              {customTech.length > 0 && (
                <div className="pt-2 border-t border-dashed border-border space-y-2">
                  {customTech.map((c: any) => {
                    const config = TECH_ENFANT[c.niveau] || TECH_ENFANT.début;
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">{c.libelle}</span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${config.color} shrink-0`}>
                          {config.emoji} {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!evalTech && <p className="text-sm text-center text-muted-foreground py-4">Pas encore évalué</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Mental ───────────────────────────────────────────────────────── */}
        <TabsContent value="mental" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Mon comportement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MENTAL_COMPETENCES_STD.map(comp => {
                const val = (evalMentale as any)?.[comp.key] || 3;
                const config = MENTAL_ENFANT[val - 1];
                return (
                  <div key={comp.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{comp.label}</span>
                      <span className="text-sm">{config?.emoji} <span className="text-xs text-muted-foreground">{config?.label}</span></span>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <div
                          key={n}
                          className={`h-2 flex-1 rounded-full transition-all ${n <= val ? MENTAL_COLORS[n - 1] : "bg-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {customMental.length > 0 && (
                <div className="pt-2 border-t border-dashed border-border space-y-4">
                  {customMental.map((c: any) => {
                    const val = Number(c.niveau) || 3;
                    const config = MENTAL_ENFANT[val - 1];
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{c.libelle}</span>
                          <span className="text-sm">{config?.emoji} <span className="text-xs text-muted-foreground">{config?.label}</span></span>
                        </div>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className={`h-2 flex-1 rounded-full ${n <= val ? MENTAL_COLORS[n - 1] : "bg-muted"}`} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {evalMentale?.commentaireGlobal && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Note du coach</p>
                  <p className="text-sm text-foreground italic">« {evalMentale.commentaireGlobal} »</p>
                </div>
              )}
              {!evalMentale && <p className="text-sm text-center text-muted-foreground py-4">Pas encore évalué</p>}
            </CardContent>
          </Card>
        </TabsContent>


        {/* ─── Observations du coach (lecture seule) ───────────────────────── */}
        <TabsContent value="observations" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                📋 Observations du coach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(!data.observations || data.observations.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune observation pour le moment.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.observations.map((obs) => (
                    <div key={obs.id} className="border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          {new Date(obs.dateSeance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        {obs.type && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {obs.type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{obs.contenu}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Message au coach ─────────────────────────────────────────────── */}
        <TabsContent value="message" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Mon message pour le coach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Tu peux écrire un message pour ton coach. Il le verra lors de sa prochaine visite.
              </p>
              <Textarea
                value={displayNote}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Écris ce que tu veux dire à ton coach..."
                rows={5}
                className="resize-none text-sm"
                data-testid="textarea-note-joueur"
              />
              <Button
                onClick={() => saveNoteMutation.mutate(displayNote)}
                disabled={saveNoteMutation.isPending || displayNote === (data.noteJoueur?.contenu || "")}
                className="w-full gap-2"
                data-testid="button-save-note"
              >
                <MessageCircle className="h-4 w-4" />
                {saveNoteMutation.isPending ? "Envoi..." : "Envoyer au coach"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
