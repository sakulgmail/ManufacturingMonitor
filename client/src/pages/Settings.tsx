import { useState, useEffect } from "react";
import { Factory, Gauge, Monitor, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NavigationTabs from "@/components/layout/NavigationTabs";

type IconKey = "factory" | "gauge" | "monitor";

const icons = {
  factory: <Factory className="h-16 w-16 text-gray-600" />,
  gauge: <Gauge className="h-16 w-16 text-gray-600" />,
  monitor: <Monitor className="h-16 w-16 text-gray-600" />
};

export default function Settings() {
  const { toast } = useToast();
  const [title, setTitle] = useState("Manufacturing Monitor System");
  const [currentIcon, setCurrentIcon] = useState<IconKey>("gauge");
  const [customImage, setCustomImage] = useState<string | null>(null);
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setCustomImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("appTitle", title);
    localStorage.setItem("appIcon", currentIcon);
    
    if (customImage) {
      localStorage.setItem("customImage", customImage);
    }
    
    localStorage.setItem("useCustomImage", useCustomImage ? "true" : "false");

    toast({
      title: "Settings Saved",
      description: "Application settings have been updated successfully.",
    });

    // Trigger a page refresh to update the header
    window.location.reload();
  };

  const removeCustomImage = () => {
    setCustomImage(null);
    setUseCustomImage(false);
    localStorage.removeItem("customImage");
    localStorage.setItem("useCustomImage", "false");
  };

  return (
    <>
      <NavigationTabs activeTab="settings" />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Application Settings</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Application Title */}
            <div>
              <label htmlFor="appTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Application Title
              </label>
              <input
                type="text"
                id="appTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter application title"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label htmlFor="iconSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Application Icon
              </label>
              <select
                id="iconSelect"
                value={currentIcon}
                onChange={(e) => setCurrentIcon(e.target.value as IconKey)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={useCustomImage}
              >
                <option value="gauge">Gauge</option>
                <option value="factory">Factory</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>

            {/* Custom Logo Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Custom Logo
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useCustomImage}
                    onChange={(e) => setUseCustomImage(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Use custom logo</span>
                </label>
              </div>
              
              {useCustomImage && (
                <div className="space-y-3">
                  {customImage ? (
                    <div className="relative inline-block">
                      <img 
                        src={customImage} 
                        alt="Custom logo preview" 
                        className="h-16 w-16 object-contain border border-gray-300 rounded"
                      />
                      <button
                        onClick={removeCustomImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        title="Remove custom logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload a custom logo</p>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500">
                    Supported formats: JPEG, PNG, GIF. Max size: 2MB
                  </p>
                </div>
              )}
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <div className="flex items-center space-x-3">
                  {useCustomImage && customImage ? (
                    <img 
                      src={customImage} 
                      alt="Logo preview" 
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center">
                      {icons[currentIcon]}
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-gray-700">{title}</h2>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}