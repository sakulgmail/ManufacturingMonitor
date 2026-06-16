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
    `px-4 py-3 text-sm -mb-px border-b-2 transition-colors ${
      activeTab === id
        ? "text-blue-600 border-blue-600 font-semibold"
        : "text-slate-600 border-transparent hover:text-blue-600 hover:border-slate-300"
    }`;

  const mobileTabClass = (id: string) =>
    `block w-full text-left px-4 py-3 text-sm transition-colors ${
      activeTab === id
        ? "text-blue-600 font-semibold bg-slate-50"
        : "text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <div className="bg-white shadow-sm border-b border-slate-200">
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
