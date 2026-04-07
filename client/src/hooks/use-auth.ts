import { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setAuthToken, getAuthToken } from "@/lib/queryClient";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "READONLY" | "JOUEUR";

export type AuthUser = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
};

export type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;          // SUPER_ADMIN ou ADMIN
  canWrite: boolean;         // SUPER_ADMIN ou ADMIN
  isReadonly: boolean;       // READONLY
  isJoueur: boolean;         // JOUEUR
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useAuthProvider(): AuthContextType {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      if (!getAuthToken()) return null;
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        return res.json();
      } catch {
        setAuthToken(null);
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      const { token, ...userInfo } = data;
      queryClient.setQueryData(["/api/auth/me"], userInfo);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      setAuthToken(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const role = user?.role;

  return {
    user: user ?? null,
    isLoading,
    isSuperAdmin: role === "SUPER_ADMIN",
    isAdmin: role === "SUPER_ADMIN" || role === "ADMIN",
    canWrite: role === "SUPER_ADMIN" || role === "ADMIN",
    isReadonly: role === "READONLY",
    isJoueur: role === "JOUEUR",
    login: async (email, password) => {
      await loginMutation.mutateAsync({ email, password });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };
}
