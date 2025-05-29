import { useCallback, useState, useEffect, ReactElement } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useClock } from "@/hooks/useClock";
import DataInputModal from "./DataInputModal";
import AuthButtons from "./AuthButtons";
import { RefreshCcw, Settings, Plus, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

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
      <path d="M12 12L8 8"></path>
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
      <path d="M3 8h18"></path>
      <path d="M7 12h10"></path>
      <path d="M7 16h10"></path>
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
  const [showSettings, setShowSettings] = useState(false);
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

  const saveSettings = (newTitle: string, newIcon: IconKey, newCustomImage?: string | null, newUseCustomImage?: boolean) => {
    localStorage.setItem("appTitle", newTitle);
    localStorage.setItem("appIcon", newIcon);
    
    if (newCustomImage !== undefined) {
      if (newCustomImage) {
        localStorage.setItem("customImage", newCustomImage);
        setCustomImage(newCustomImage);
      }
    }
    
    if (newUseCustomImage !== undefined) {
      localStorage.setItem("useCustomImage", newUseCustomImage ? "true" : "false");
      setUseCustomImage(newUseCustomImage);
    }
    
    setTitle(newTitle);
    setCurrentIcon(newIcon);
    setShowSettings(false);
  };

  return (
    <header className="bg-[#e0e0e0] shadow-md sticky top-0 z-50 w-full" style={{ backgroundColor: '#e0e0e0' }}>
      <div className="mobile-container py-3 sm:py-4 flex justify-between items-center">
        <div
          className="flex items-center space-x-2"
          onClick={() => setLocation("/")}
          style={{ cursor: "pointer" }}
        >
          {useCustomImage && customImage ? (
            <div className="h-10 w-10 sm:h-16 sm:w-16 flex items-center justify-center">
              <img 
                src={customImage} 
                alt="Logo" 
                className="max-h-10 max-w-10 sm:max-h-16 sm:max-w-16 object-contain rounded"
              />
            </div>
          ) : (
            <div className="h-10 w-10 sm:h-16 sm:w-16 flex items-center justify-center">
              {icons[currentIcon]}
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-gray-600 truncate">{title}</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-4">
          <span className="text-gray-600 text-sm hidden md:block">{formattedTime}</span>
          
          {/* Always show AuthButtons on mobile */}
          <div className="md:hidden">
            <AuthButtons />
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              className="touch-target p-2 text-gray-600 hover:bg-gray-200 rounded"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              className="mobile-button bg-white bg-opacity-20 rounded flex items-center text-gray-600 hover:bg-gray-200"
              onClick={handleRefresh}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              <span className="text-gray-600">Refresh</span>
            </button>
            
            {isAuthenticated && (
              <>
                <button
                  className="mobile-button bg-white bg-opacity-20 rounded flex items-center text-gray-600 hover:bg-gray-200"
                  onClick={() => setShowDataInput(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="text-gray-600">Enter Data</span>
                </button>
                
                <button
                  className="mobile-button bg-white bg-opacity-20 rounded flex items-center text-gray-600 hover:bg-gray-200"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="text-gray-600">Settings</span>
                </button>
              </>
            )}
            <AuthButtons />
          </div>
        </div>
      </div>

      {/* Mobile Settings Panel */}
      {showSettings && (
        <div className="md:absolute md:right-4 md:top-16 fixed inset-0 md:inset-auto z-50 bg-white text-gray-800 md:rounded-lg md:shadow-lg p-4 md:w-80 md:max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3">Application Settings</h3>

          <div className="mb-4">
            <label
              htmlFor="appTitleInput"
              className="block text-sm font-medium mb-1"
            >
              Application Title
            </label>
            <input
              type="text"
              className="w-full border rounded p-2 text-gray-800"
              defaultValue={title}
              id="appTitleInput"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <label className="text-sm font-medium">
                <input
                  type="radio"
                  name="logoType"
                  className="mr-2"
                  checked={!useCustomImage}
                  onChange={() => setUseCustomImage(false)}
                  id="useIcon"
                />
                Use Icon
              </label>
              <label className="text-sm font-medium ml-4">
                <input
                  type="radio"
                  name="logoType"
                  className="mr-2"
                  checked={useCustomImage}
                  onChange={() => setUseCustomImage(true)}
                  id="useCustomImage"
                />
                Use Custom Image
              </label>
            </div>
            
            {/* Icon Selection */}
            {!useCustomImage && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Icon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(icons) as [IconKey, ReactElement][]).map(
                    ([key, icon]) => (
                      <div
                        key={key}
                        className={`border p-2 rounded flex justify-center items-center cursor-pointer ${currentIcon === key ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
                        onClick={() => {
                          const selection = document.getElementById(
                            "iconSelection",
                          ) as HTMLSelectElement;
                          if (selection) {
                            selection.value = key;
                          }
                        }}
                      >
                        {/* Clone element with Typescript safety */}
                        {icon && {
                          ...icon,
                          props: {
                            ...icon.props,
                            className: "h-6 w-6 text-gray-700",
                          },
                        }}
                      </div>
                    ),
                  )}
                </div>
                <select
                  id="iconSelection"
                  className="hidden"
                  defaultValue={currentIcon}
                >
                  {(Object.keys(icons) as IconKey[]).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Image Upload */}
            {useCustomImage && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Upload Image
                </label>
                <div className="mb-2">
                  <input
                    type="file"
                    id="imageUpload"
                    accept=".jpg,.jpeg,.png"
                    className="border p-2 rounded w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const imageDataUrl = event.target?.result as string;
                          setCustomImage(imageDataUrl);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {customImage && (
                  <div className="mt-2 border p-2 rounded">
                    <p className="text-sm mb-1">Preview:</p>
                    <div className="flex items-center justify-center h-32 w-32">
                      <img
                        src={customImage}
                        alt="Custom logo preview"
                        className="max-h-32 max-w-32 object-contain rounded"
                        style={{ maxHeight: "128px", maxWidth: "128px" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              className="px-3 py-1.5 border border-gray-300 rounded"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 bg-green-600 text-white rounded font-bold"
              onClick={() => {
                const titleInput = document.getElementById(
                  "appTitleInput",
                ) as HTMLInputElement;
                const iconSelect = document.getElementById(
                  "iconSelection",
                ) as HTMLSelectElement;

                if (titleInput) {
                  const newTitle =
                    titleInput.value || "Manufacturing Monitor System";
                  const newIcon = iconSelect?.value as IconKey || "gauge";
                  
                  // Save with current image settings
                  saveSettings(newTitle, newIcon, customImage, useCustomImage);
                }
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Data Input Modal */}
      <DataInputModal 
        isOpen={showDataInput} 
        onClose={() => setShowDataInput(false)} 
      />
    </header>
  );
}
