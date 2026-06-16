import { useCallback, useState, useEffect, ReactElement } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useClock } from "@/hooks/useClock";
import DataInputModal from "./DataInputModal";
import AuthButtons from "./AuthButtons";
import { RefreshCcw, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Define types for icons
type IconKey = "factory" | "gauge" | "monitor";
type IconsObject = Record<IconKey, ReactElement>;

// Define icons for manufacturing
const icons: IconsObject = {
  factory: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 8.5V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v6.5a1 1 0 0 1-1 1 1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h17a1 1 0 0 0 1-1v-9.5a1 1 0 0 0-1-1 1 1 0 0 1-1-1Z" />
      <path d="M3 20.5V10" />
      <path d="M21 10v10.5" />
    </svg>
  ),
  gauge: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 6v2"></path>
      <path d="M16.24 7.76l-1.42 1.42"></path>
      <path d="M18 12h-2"></path>
      <path d="M16.24 16.24l-1.42-1.42"></path>
      <path d="M12 18v-2"></path>
      <path d="M7.76 16.24l1.42-1.42"></path>
      <path d="M6 12h2"></path>
      <path d="M7.76 7.76l1.42 1.42"></path>
    </svg>
  ),
  monitor: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ),
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const { formattedTime, compactTime } = useClock();
  const { isAuthenticated } = useAuth();

  // Store state with default values
  const [title, setTitle] = useState("Manufacturing Monitor System");
  const [currentIcon, setCurrentIcon] = useState<IconKey>("gauge");
  const [showDataInput, setShowDataInput] = useState(false);
  const [logoExists, setLogoExists] = useState(false);

  // Load settings from local storage on component mount
  useEffect(() => {
    const storedTitle = localStorage.getItem("appTitle");
    const storedIcon = localStorage.getItem("appIcon") as IconKey;

    if (storedTitle) {
      setTitle(storedTitle);
    }

    if (storedIcon && Object.keys(icons).includes(storedIcon)) {
      setCurrentIcon(storedIcon);
    }

    // Check if logo file exists on server
    checkLogoExists();
  }, []);

  // Function to check if logo file exists on server
  const checkLogoExists = async () => {
    const logoFormats = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.gif'];
    
    for (const format of logoFormats) {
      try {
        const response = await fetch(`/${format}`, { method: 'HEAD' });
        if (response.ok) {
          setLogoExists(true);
          return;
        }
      } catch (error) {
        // Continue to next format
      }
    }
    setLogoExists(false);
  };

  // Logo component with fallback logic
  const LogoComponent = () => {
    const [currentFormat, setCurrentFormat] = useState('logo.png');
    const [showFallback, setShowFallback] = useState(false);

    const handleImageError = () => {
      const formats = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.gif'];
      const currentIndex = formats.indexOf(currentFormat);
      
      if (currentIndex < formats.length - 1) {
        // Try next format
        setCurrentFormat(formats[currentIndex + 1]);
      } else {
        // All formats failed, show fallback icon
        setShowFallback(true);
        setLogoExists(false);
      }
    };

    if (showFallback || !logoExists) {
      return (
        <div className="h-16 w-16 flex items-center justify-center">
          {icons[currentIcon]}
        </div>
      );
    }

    return (
      <div className="h-16 w-16 flex items-center justify-center">
        <img
          src={`/${currentFormat}`}
          alt="Logo"
          className="max-h-16 max-w-16 object-contain rounded"
          style={{ maxHeight: "64px", maxWidth: "64px" }}
          onError={handleImageError}
        />
      </div>
    );
  };

  const handleRefresh = useCallback(() => {
    // Invalidate all queries to force a refresh of data
    queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
    
    // Add visual feedback for the refresh action
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
      refreshButton.classList.add('animate-spin');
      setTimeout(() => {
        refreshButton.classList.remove('animate-spin');
      }, 500);
    }
    
    // Show a toast notification
    alert("Data refreshed successfully");
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-3">
        <div
          className="flex items-center gap-3 min-w-0"
          onClick={() => setLocation("/")}
          style={{ cursor: "pointer" }}
        >
          <div className="text-slate-700">
            <LogoComponent />
          </div>
          <h1 className="hidden sm:block text-lg font-semibold text-slate-800 truncate">{title}</h1>
        </div>
        <span className="sm:hidden flex-1 text-center text-slate-500 whitespace-nowrap text-sm tabular-nums">
          {compactTime}
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap text-sm tabular-nums">
            {formattedTime}
          </span>
          <button
            className="border border-slate-200 rounded-md px-2.5 sm:px-3 py-1.5 flex items-center text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={handleRefresh}
            aria-label="Refresh"
          >
            <RefreshCcw className="refresh-button h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-sm font-medium">Refresh</span>
          </button>

          {isAuthenticated && (
            <button
              className="bg-blue-600 rounded-md px-2.5 sm:px-3 py-1.5 flex items-center text-white hover:bg-blue-700 transition-colors"
              onClick={() => setShowDataInput(true)}
              aria-label="Enter Data"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-sm font-medium">Enter Data</span>
            </button>
          )}
          <AuthButtons />
        </div>
      </div>

      {/* Data Input Modal */}
      <DataInputModal 
        isOpen={showDataInput} 
        onClose={() => setShowDataInput(false)} 
      />
    </header>
  );
}