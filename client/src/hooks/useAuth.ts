import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout
  };
}