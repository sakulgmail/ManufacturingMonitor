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
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="text-xs sm:text-sm text-gray-600 mr-1 hidden sm:block">
          <span className="font-medium">Welcome, {user?.username}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="touch-target flex items-center space-x-1 text-gray-600 text-xs sm:text-sm px-2 sm:px-3"
          onClick={() => logout()}
        >
          <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Out</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      <Button 
        variant="outline" 
        size="sm"
        className="touch-target flex items-center space-x-1 text-gray-600 text-xs sm:text-sm px-2 sm:px-3"
        onClick={() => setLocation("/login")}
      >
        <LogIn className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Login</span>
        <span className="sm:hidden">In</span>
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        className="touch-target flex items-center space-x-1 text-gray-600 text-xs sm:text-sm px-2 sm:px-3"
        onClick={() => setLocation("/signup")}
      >
        <User className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Sign Up</span>
        <span className="sm:hidden">Up</span>
      </Button>
    </div>
  );
}