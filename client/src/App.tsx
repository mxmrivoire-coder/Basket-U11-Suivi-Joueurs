import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthContext, useAuthProvider } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

// Pages partagées
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

// Pages staff (SUPER_ADMIN, ADMIN, READONLY)
import DashboardPage from "@/pages/staff/dashboard";
import JoueursPage from "@/pages/staff/joueurs";
import FicheJoueurPage from "@/pages/staff/fiche-joueur";
import UtilisateursPage from "@/pages/staff/utilisateurs";
import SaisonsPage from "@/pages/staff/saisons";

// Pages joueur
import MaFichePage from "@/pages/joueur/ma-fiche";
import MesObjectifsPage from "@/pages/joueur/mes-objectifs";

function StaffRoutes() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/joueurs" component={JoueursPage} />
      <Route path="/joueurs/:id" component={FicheJoueurPage} />
      <Route path="/joueurs/:id/fiche/:ficheId" component={FicheJoueurPage} />
      <Route path="/utilisateurs" component={UtilisateursPage} />
      <Route path="/saisons" component={SaisonsPage} />
      <Route>{() => <Redirect to="/" />}</Route>
    </Switch>
  );
}

function JoueurRoutes() {
  return (
    <Switch>
      <Route path="/" component={MaFichePage} />
      <Route path="/ma-fiche" component={MaFichePage} />
      <Route path="/mes-objectifs" component={MesObjectifsPage} />
      <Route>{() => <Redirect to="/" />}</Route>
    </Switch>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between h-12 px-4 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm font-semibold text-muted-foreground hidden sm:block">
                Basket U11 — Suivi des Joueurs
              </span>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-0">
            {children}
          </main>
          <div className="hidden">
            <PerplexityAttribution />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function InnerApp() {
  const auth = useAuthProvider();

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <Router hook={useHashLocation}>
        {!auth.user ? (
          <Switch>
            <Route path="*" component={LoginPage} />
          </Switch>
        ) : (
          <AppLayout>
            {auth.isJoueur ? <JoueurRoutes /> : <StaffRoutes />}
          </AppLayout>
        )}
      </Router>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <InnerApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
