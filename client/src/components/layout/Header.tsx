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
  const { formattedTime } = useClock();
  const { isAuthenticated } = useAuth();

  // Store state with default values
  const [title, setTitle] = useState("Manufacturing Monitor System");
  const [currentIcon, setCurrentIcon] = useState<IconKey>("gauge");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [showDataInput, setShowDataInput] = useState(false);
  const [useCustomImage, setUseCustomImage] = useState(false);

  // Load settings from local storage on component mount
  useEffect(() => {
    const storedTitle = localStorage.getItem("appTitle");
    const storedIcon = localStorage.getItem("appIcon") as IconKey;
    const storedCustomImage = localStorage.getItem("customImage");
    const storedUseCustomImage = localStorage.getItem("useCustomImage");

    if (storedTitle) {
      setTitle(storedTitle);
    }

    if (storedIcon && Object.keys(icons).includes(storedIcon)) {
      setCurrentIcon(storedIcon);
    }
    
    if (storedCustomImage) {
      setCustomImage(storedCustomImage);
    }
    
    if (storedUseCustomImage === "true") {
      setUseCustomImage(true);
    }
  }, []);

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
    <header className="bg-[#e0e0e0] shadow-md sticky top-0 z-50 w-full" style={{ backgroundColor: '#e0e0e0' }}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div
          className="flex items-center space-x-2"
          onClick={() => setLocation("/")}
          style={{ cursor: "pointer" }}
        >
          {useCustomImage && customImage ? (
            <div className="h-16 w-16 flex items-center justify-center">
              <img 
                src={customImage} 
                alt="Logo" 
                className="max-h-16 max-w-16 object-contain rounded"
                style={{ maxHeight: "64px", maxWidth: "64px" }}
              />
            </div>
          ) : (
            icons[currentIcon]
          )}
          <h1 className="text-xl font-bold text-gray-600">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">{formattedTime}</span>
          <button
            className="bg-white bg-opacity-20 rounded px-3 py-1.5 flex items-center text-gray-600"
            onClick={handleRefresh}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            <span className="text-gray-600">Refresh</span>
          </button>
          
          {isAuthenticated && (
            <button
              className="bg-white bg-opacity-20 rounded px-3 py-1.5 flex items-center text-gray-600 mr-2"
              onClick={() => setShowDataInput(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-gray-600">Enter Data</span>
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