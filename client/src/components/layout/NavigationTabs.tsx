import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NavigationTabsProps {
  activeTab: string;
}

interface Tab {
  id: string;
  label: string;
  path: string;
}

export default function NavigationTabs({ activeTab }: NavigationTabsProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs: Tab[] = [
    { id: "dashboard", label: "Dashboard", path: "/" },
    { id: "history", label: "History", path: "/history" },
    { id: "reports", label: "Reports", path: "/reports" },
    ...(user?.isAdmin ? [{ id: "settings", label: "Settings", path: "/settings" }] : []),
  ];

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  const handleTabChange = useCallback(
    (path: string) => {
      setLocation(path);
      setMenuOpen(false);
    },
    [setLocation]
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [activeTab]);

  const desktopTabClass = (id: string) =>
    `px-4 py-3 ${
      activeTab === id
        ? "text-primary-600 border-b-2 border-primary-600 font-medium"
        : "text-gray-600 hover:text-primary-600"
    }`;

  const mobileTabClass = (id: string) =>
    `block w-full text-left px-4 py-3 ${
      activeTab === id
        ? "text-primary-600 font-medium bg-gray-50"
        : "text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        {/* Mobile: hamburger row */}
        <div className="sm:hidden flex items-center justify-between py-2">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="p-2 -ml-2 text-gray-700"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-medium text-gray-700">
            {activeTabInfo?.label ?? "Menu"}
          </span>
          <span className="w-9" aria-hidden="true" />
        </div>

        {/* Mobile: dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t flex flex-col">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.path)}
                className={mobileTabClass(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Desktop: inline tabs */}
        <div className="hidden sm:flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.path)}
              className={desktopTabClass(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
