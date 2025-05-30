import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { User, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AuthButtons() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  // If we're already on the login or signup page, don't show the login button
  const currentPath = window.location.pathname;
  if (currentPath === "/login" || currentPath === "/signup") {
    return null;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-sm text-gray-600 mr-1">
          <span className="font-medium">Welcome, {user?.username}</span>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center space-x-1 text-gray-600"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        className="flex items-center space-x-1 text-gray-600"
        onClick={() => setLocation("/login")}
      >
        <LogIn className="h-4 w-4" />
        <span>Login</span>
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center space-x-1 text-gray-600"
        onClick={() => setLocation("/signup")}
      >
        <User className="h-4 w-4" />
        <span>Sign Up</span>
      </Button>
    </div>
  );
}