import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast({
        title: "Erreur de connexion",
        description: err?.message || "Identifiants incorrects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Basketball court background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="court" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <circle cx="60" cy="60" r="30" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="0" y1="60" x2="120" y2="60" stroke="currentColor" strokeWidth="1" />
              <line x1="60" y1="0" x2="60" y2="120" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#court)" />
        </svg>
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Basket U11">
                  <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2" />
                  <path d="M4 16h24M16 4v24" stroke="white" strokeWidth="1.5" />
                  <path d="M6 8.5C9 11.5 10 15 9.5 16.5M26 8.5C23 11.5 22 15 22.5 16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M6 23.5C9 20.5 10 17 9.5 15.5M26 23.5C23 20.5 22 17 22.5 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">Basket U11</div>
              <div className="text-sm text-muted-foreground">Suivi des joueurs</div>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-card">
          <CardHeader className="pb-4 pt-6 px-6">
            <CardTitle className="text-lg">Connexion</CardTitle>
            <CardDescription>
              Accédez à votre espace coach ou joueur
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Adresse e-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="prenom.nom@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  data-testid="input-email"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  data-testid="input-password"
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-10 font-semibold"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          CBCF Basket — Saison 2025/2026
        </p>
      </div>
    </div>
  );
}
