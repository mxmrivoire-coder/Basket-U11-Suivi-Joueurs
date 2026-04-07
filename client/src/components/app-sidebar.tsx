import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Target,
  LogOut,
  UserCog,
  CalendarDays,
  ChevronDown,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Basketball SVG logo
function BasketLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Basket U11"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M3 16h26M16 3v26" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 8C9 11.5 10 15 9.5 16.5M26.5 8C23 11.5 22 15 22.5 16.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <path
        d="M5.5 24C9 20.5 10 17 9.5 15.5M26.5 24C23 20.5 22 17 22.5 15.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Coach",
  READONLY: "Lecture seule",
  JOUEUR: "Joueur",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ADMIN: "bg-primary/20 text-primary border-primary/30",
  READONLY: "bg-muted text-muted-foreground border-border",
  JOUEUR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function AppSidebar() {
  const { user, logout, isAdmin, isSuperAdmin, isJoueur, canWrite } = useAuth();
  const [location] = useLocation();

  const staffItems = [
    { title: "Tableau de bord", url: "/", icon: LayoutDashboard, alwaysShow: true },
    { title: "Joueurs", url: "/joueurs", icon: Users, alwaysShow: true },
    { title: "Utilisateurs", url: "/utilisateurs", icon: UserCog, alwaysShow: !isJoueur && isAdmin },
    { title: "Saisons", url: "/saisons", icon: CalendarDays, alwaysShow: isSuperAdmin },
  ].filter(i => i.alwaysShow);

  const joueurItems = [
    { title: "Ma fiche", url: "/ma-fiche", icon: UserCircle },
    { title: "Mes objectifs", url: "/mes-objectifs", icon: Target },
  ];

  const items = isJoueur ? joueurItems : staffItems;
  const groupLabel = isJoueur ? "Mon espace" : "Navigation";

  function isActive(url: string) {
    if (url === "/") return location === "/" || location === "";
    return location.startsWith(url);
  }

  return (
    <Sidebar>
      <SidebarHeader className="py-4 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="text-sidebar-primary">
            <BasketLogo />
          </div>
          <div>
            <div className="font-bold text-sm text-sidebar-foreground leading-tight">
              Basket U11
            </div>
            <div className="text-xs text-sidebar-foreground/50 leading-tight">
              Suivi des joueurs
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] font-semibold tracking-widest px-4 mb-1">
            {groupLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-4 py-2.5">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="py-4 px-4 border-t border-sidebar-border">
        {user && (
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-sidebar-primary">
                  {user.prenom[0]}{user.nom[0]}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                  {user.prenom} {user.nom}
                </div>
                <div className="text-xs text-sidebar-foreground/40 truncate leading-tight">{user.email}</div>
              </div>
            </div>
            <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role] || ROLE_COLORS.JOUEUR}`}>
              <Shield className="h-2.5 w-2.5" />
              {ROLE_LABELS[user.role] || user.role}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
