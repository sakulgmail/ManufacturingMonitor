import { useState, useEffect } from "react";
import { Factory, Gauge, Monitor, Upload, X, Plus, Edit2, Trash2, Save, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Station, Gauge as GaugeType, InsertStation, InsertGauge, GaugeType as GaugeTypeEnum } from "@/lib/types";

type IconKey = "factory" | "gauge" | "monitor";

const icons = {
  factory: <Factory className="h-16 w-16 text-gray-600" />,
  gauge: <Gauge className="h-16 w-16 text-gray-600" />,
  monitor: <Monitor className="h-16 w-16 text-gray-600" />
};

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"app" | "stations" | "gauges">("app");
  const [title, setTitle] = useState("Manufacturing Monitor System");
  const [currentIcon, setCurrentIcon] = useState<IconKey>("gauge");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [useCustomImage, setUseCustomImage] = useState(false);

  // Station management state
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [newStationName, setNewStationName] = useState("");
  const [newStationDescription, setNewStationDescription] = useState("");
  const [showAddStation, setShowAddStation] = useState(false);

  // Gauge management state
  const [editingGauge, setEditingGauge] = useState<GaugeType | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [newGauge, setNewGauge] = useState({
    name: "",
    type: "pressure" as GaugeTypeEnum,
    unit: "",
    minValue: 0,
    maxValue: 100,
    step: 1
  });
  const [showAddGauge, setShowAddGauge] = useState(false);

  // Fetch stations data
  const { data: stationsData = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  // Deduplicate stations by ID to prevent duplicates
  const stations = stationsData.filter((station, index, self) => 
    index === self.findIndex(s => s.id === station.id)
  );

  // Create station mutation
  const createStationMutation = useMutation({
    mutationFn: async (stationData: InsertStation) => {
      return apiRequest('POST', '/api/stations/create', stationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station created successfully." });
      setNewStationName("");
      setNewStationDescription("");
      setShowAddStation(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create station.", variant: "destructive" });
    },
  });

  // Update station mutation
  const updateStationMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & InsertStation) => {
      return apiRequest('PUT', `/api/stations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station updated successfully." });
      setEditingStation(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update station.", variant: "destructive" });
    },
  });

  // Delete station mutation
  const deleteStationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/stations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete station.", variant: "destructive" });
    },
  });

  // Create gauge mutation
  const createGaugeMutation = useMutation({
    mutationFn: async (gaugeData: InsertGauge) => {
      return apiRequest('POST', '/api/gauges/create', gaugeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Gauge created successfully." });
      setNewGauge({ name: "", type: "pressure", unit: "", minValue: 0, maxValue: 100, step: 1 });
      setShowAddGauge(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create gauge.", variant: "destructive" });
    },
  });

  // Update gauge mutation
  const updateGaugeMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertGauge>) => {
      return apiRequest('PUT', `/api/gauges/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Gauge updated successfully." });
      setEditingGauge(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update gauge.", variant: "destructive" });
    },
  });

  // Delete gauge mutation
  const deleteGaugeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/gauges/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Gauge deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete gauge.", variant: "destructive" });
    },
  });

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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
          
          {/* Settings Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("app")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "app"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Application Settings
                </button>
                <button
                  onClick={() => setActiveTab("stations")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "stations"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Manage Stations
                </button>
                <button
                  onClick={() => setActiveTab("gauges")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "gauges"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Manage Gauges
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "app" && (
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
          )}

          {/* Stations Management Tab */}
          {activeTab === "stations" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Manage Stations</h2>
                <button
                  onClick={() => setShowAddStation(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </button>
              </div>

              {/* Add Station Form */}
              {showAddStation && (
                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium mb-4">Add New Station</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Station Name
                      </label>
                      <input
                        type="text"
                        value={newStationName}
                        onChange={(e) => setNewStationName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter station name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        value={newStationDescription}
                        onChange={(e) => setNewStationDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        rows={2}
                        placeholder="Enter station description"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => createStationMutation.mutate({ name: newStationName, description: newStationDescription || null })}
                        disabled={!newStationName || createStationMutation.isPending}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2 inline" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowAddStation(false);
                          setNewStationName("");
                          setNewStationDescription("");
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        <XCircle className="h-4 w-4 mr-2 inline" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stations List */}
              <div className="space-y-4">
                {stations.map((station) => (
                  <div key={station.id} className="border border-gray-200 rounded-md p-4">
                    {editingStation?.id === station.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Station Name
                          </label>
                          <input
                            type="text"
                            value={editingStation.name}
                            onChange={(e) => setEditingStation({ ...editingStation, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={editingStation.description || ""}
                            onChange={(e) => setEditingStation({ ...editingStation, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            rows={2}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateStationMutation.mutate({ id: editingStation.id, name: editingStation.name, description: editingStation.description })}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                          >
                            <Save className="h-4 w-4 mr-2 inline" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStation(null)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                          >
                            <XCircle className="h-4 w-4 mr-2 inline" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">{station.name}</h3>
                          {station.description && (
                            <p className="text-gray-600 mt-1">{station.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-2">
                            Gauges: {station.gauges?.length || 0}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingStation(station)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${station.name}"?`)) {
                                deleteStationMutation.mutate(station.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gauges Management Tab */}
          {activeTab === "gauges" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Manage Gauges</h2>
                <button
                  onClick={() => setShowAddGauge(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Gauge
                </button>
              </div>

              {/* Add Gauge Form */}
              {showAddGauge && (
                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium mb-4">Add New Gauge</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Station
                      </label>
                      <select
                        value={selectedStationId || ""}
                        onChange={(e) => setSelectedStationId(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select a station</option>
                        {stations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gauge Name
                      </label>
                      <input
                        type="text"
                        value={newGauge.name}
                        onChange={(e) => setNewGauge({ ...newGauge, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter gauge name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={newGauge.type}
                        onChange={(e) => setNewGauge({ ...newGauge, type: e.target.value as GaugeTypeEnum })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="pressure">Pressure</option>
                        <option value="temperature">Temperature</option>
                        <option value="runtime">Runtime</option>
                        <option value="electrical_power">Electrical Power</option>
                        <option value="electrical_current">Electrical Current</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={newGauge.unit}
                        onChange={(e) => setNewGauge({ ...newGauge, unit: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="e.g., PSI, °C, hrs"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Value
                      </label>
                      <input
                        type="number"
                        value={newGauge.minValue}
                        onChange={(e) => setNewGauge({ ...newGauge, minValue: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Value
                      </label>
                      <input
                        type="number"
                        value={newGauge.maxValue}
                        onChange={(e) => setNewGauge({ ...newGauge, maxValue: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div className="md:col-span-2 flex space-x-2">
                      <button
                        onClick={() => {
                          if (selectedStationId) {
                            createGaugeMutation.mutate({ ...newGauge, stationId: selectedStationId });
                          }
                        }}
                        disabled={!newGauge.name || !selectedStationId || createGaugeMutation.isPending}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2 inline" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowAddGauge(false);
                          setNewGauge({ name: "", type: "pressure", unit: "", minValue: 0, maxValue: 100, step: 1 });
                          setSelectedStationId(null);
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        <XCircle className="h-4 w-4 mr-2 inline" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Gauges by Station */}
              <div className="space-y-6">
                {stations.map((station) => (
                  <div key={station.id} className="border border-gray-200 rounded-md p-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">{station.name}</h3>
                    {station.gauges && station.gauges.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {station.gauges.map((gauge) => (
                          <div key={gauge.id} className="border border-gray-100 rounded-md p-3 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-800">{gauge.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Type: {gauge.type} | Unit: {gauge.unit}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Range: {gauge.minValue} - {gauge.maxValue}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingGauge(gauge)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${gauge.name}"?`)) {
                                      deleteGaugeMutation.mutate(gauge.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No gauges configured for this station.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}