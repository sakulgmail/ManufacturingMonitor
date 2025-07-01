import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect root path to login if not authenticated
  useEffect(() => {
    if (location === '/' && !isAuthenticated) {
      setLocation('/login');
    }
  }, [location, isAuthenticated, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/history" component={() => <ProtectedRoute component={History} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-6">
            <Router />
          </main>
          <Footer />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
