import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Gauge } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [appTitle, setAppTitle] = useState("Manufacturing Monitor");
  const [logoOk, setLogoOk] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Use the configured app title if the admin has set one
  useEffect(() => {
    const storedTitle = localStorage.getItem("appTitle");
    if (storedTitle) setAppTitle(storedTitle);
  }, []);

  // Use useEffect for redirect to avoid hooks violation
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: async () => {
      // Refetch auth data and wait for it to complete
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Small delay to ensure state is updated
      setTimeout(() => {
        setLocation("/");
      }, 50);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error?.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Validation error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Brand panel */}
          <div className="order-2 md:order-1 relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 p-8 md:p-10 text-white flex flex-col justify-between min-h-[200px] md:min-h-[460px]">
            {/* decorative gauge rings */}
            <div className="pointer-events-none absolute -bottom-20 -right-20 opacity-20">
              <div className="h-72 w-72 rounded-full border border-white/40" />
              <div className="absolute inset-8 rounded-full border border-white/30" />
              <div className="absolute inset-16 rounded-full border border-white/20" />
              <div className="absolute inset-24 rounded-full border border-white/10" />
            </div>

            {/* brand lockup */}
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                {logoOk ? (
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="h-9 w-9 object-contain"
                    onError={() => setLogoOk(false)}
                  />
                ) : (
                  <Gauge className="h-7 w-7 text-white" />
                )}
              </div>
              <span className="text-lg font-semibold tracking-tight">{appTitle}</span>
            </div>

            {/* tagline */}
            <div className="relative mt-8 md:mt-0">
              <h2 className="text-2xl md:text-3xl font-bold leading-snug tracking-tight">
                Real-time visibility across every machine on the floor.
              </h2>
              <p className="mt-3 text-sm md:text-base text-blue-100/80 max-w-sm">
                Track gauge readings, catch issues early, and keep production running — all in one place.
              </p>
            </div>

            <div className="relative hidden md:block text-xs text-blue-200/70">
              © {new Date().getFullYear()} Factory Maintenance System
            </div>
          </div>

          {/* Form panel */}
          <div className="order-1 md:order-2 p-8 md:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to continue to {appTitle}.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
              Contact your administrator for account access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
