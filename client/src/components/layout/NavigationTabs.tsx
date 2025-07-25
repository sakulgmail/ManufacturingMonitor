import { useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface NavigationTabsProps {
  activeTab: string;
}

export default function NavigationTabs({ activeTab }: NavigationTabsProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleTabChange = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto">
          <button 
            className={`px-4 py-3 ${activeTab === "dashboard" 
              ? "text-primary-600 border-b-2 border-primary-600 font-medium" 
              : "text-gray-600 hover:text-primary-600"}`}
            onClick={() => handleTabChange("/")}
          >
            Dashboard
          </button>
          <button 
            className={`px-4 py-3 ${activeTab === "history" 
              ? "text-primary-600 border-b-2 border-primary-600 font-medium" 
              : "text-gray-600 hover:text-primary-600"}`}
            onClick={() => handleTabChange("/history")}
          >
            History
          </button>
          <button 
            className={`px-4 py-3 ${activeTab === "reports" 
              ? "text-primary-600 border-b-2 border-primary-600 font-medium" 
              : "text-gray-600 hover:text-primary-600"}`}
            onClick={() => handleTabChange("/reports")}
          >
            Reports
          </button>
          {user?.isAdmin && (
            <button 
              className={`px-4 py-3 ${activeTab === "settings" 
                ? "text-primary-600 border-b-2 border-primary-600 font-medium" 
                : "text-gray-600 hover:text-primary-600"}`}
              onClick={() => handleTabChange("/settings")}
            >
              Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
