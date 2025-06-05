import { useState, useEffect } from "react";
import { Factory, Gauge, Monitor, Upload, X, Plus, Edit2, Trash2, Save, XCircle, Users, Key, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type User } from "@/hooks/useAuth";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Machine, Station, Gauge as GaugeInterface, GaugeType, InsertMachine, InsertStation, InsertGauge, InsertGaugeType, MachineStatus, GaugeCondition } from "@/lib/types";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

type IconKey = "factory" | "gauge" | "monitor";

const icons = {
  factory: <Factory className="h-16 w-16 text-gray-600" />,
  gauge: <Gauge className="h-16 w-16 text-gray-600" />,
  monitor: <Monitor className="h-16 w-16 text-gray-600" />
};

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"app" | "machines" | "stations" | "gauges" | "gauge-types" | "users">("app");
  const [title, setTitle] = useState("Manufacturing Monitor System");
  const [currentIcon, setCurrentIcon] = useState<IconKey>("gauge");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [useCustomImage, setUseCustomImage] = useState(false);

  // Redirect non-admin users away from Settings
  if (user && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  // Machine management state
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineNo, setNewMachineNo] = useState("");
  const [newMachineStatus, setNewMachineStatus] = useState<MachineStatus>("RUNNING");
  const [showAddMachine, setShowAddMachine] = useState(false);

  // Station management state
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [newStationName, setNewStationName] = useState("");
  const [newStationDescription, setNewStationDescription] = useState("");
  const [newStationMachineId, setNewStationMachineId] = useState<number | null>(null);
  const [showAddStation, setShowAddStation] = useState(false);

  // Gauge management state
  const [editingGauge, setEditingGauge] = useState<GaugeInterface | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [newGauge, setNewGauge] = useState({
    name: "",
    gaugeTypeId: 1,
    unit: "",
    minValue: 0,
    maxValue: 100,
    step: 1,
    condition: "",
    instruction: ""
  });
  const [showAddGauge, setShowAddGauge] = useState(false);

  // Gauge Types management state
  const [editingGaugeType, setEditingGaugeType] = useState<GaugeType | null>(null);
  const [newGaugeType, setNewGaugeType] = useState({
    name: "",
    hasUnit: true,
    hasMinValue: true,
    hasMaxValue: true,
    hasStep: false,
    hasCondition: false,
    hasInstruction: false,
    defaultUnit: "",
    defaultMinValue: 0,
    defaultMaxValue: 100,
    defaultStep: 1,
    instruction: ""
  });
  const [showAddGaugeType, setShowAddGaugeType] = useState(false);

  // User management state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Local ordering state for drag and drop
  const [localMachines, setLocalMachines] = useState<Machine[]>([]);
  const [localStations, setLocalStations] = useState<Station[]>([]);
  const [localGaugeTypes, setLocalGaugeTypes] = useState<GaugeType[]>([]);
  const [localGauges, setLocalGauges] = useState<GaugeInterface[]>([]);

  // Fetch machines data
  const { data: machinesData = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  // Fetch stations data
  const { data: stationsData = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  // Fetch users data (admin only)
  const { data: usersData = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.isAdmin === true,
  });

  // Fetch gauge types data (admin only)
  const { data: gaugeTypesData = [] } = useQuery<GaugeType[]>({
    queryKey: ['/api/gauge-types'],
    enabled: user?.isAdmin === true,
  });

  // Sort users in ascending order
  const users = usersData.sort((a, b) => a.id - b.id);

  // Update local state when data changes
  useEffect(() => {
    const deduplicatedMachines = machinesData
      .filter((machine, index, self) => 
        index === self.findIndex(m => m.id === machine.id)
      )
      .sort((a, b) => a.id - b.id);
    setLocalMachines(deduplicatedMachines);
  }, [machinesData]);

  useEffect(() => {
    const deduplicatedStations = stationsData
      .filter((station, index, self) => 
        index === self.findIndex(s => s.id === station.id)
      )
      .sort((a, b) => a.id - b.id);
    setLocalStations(deduplicatedStations);
  }, [stationsData]);

  useEffect(() => {
    const sortedGaugeTypes = gaugeTypesData.sort((a, b) => a.id - b.id);
    setLocalGaugeTypes(sortedGaugeTypes);
  }, [gaugeTypesData]);

  // Use local state for rendering
  const machines = localMachines;
  const stations = localStations;
  const gaugeTypes = localGaugeTypes;

  // Drag and drop handlers
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, type } = result;
    
    if (type === 'machines') {
      const reorderedMachines = Array.from(machines);
      const [removed] = reorderedMachines.splice(source.index, 1);
      reorderedMachines.splice(destination.index, 0, removed);
      setLocalMachines(reorderedMachines);
    } else if (type === 'stations') {
      const reorderedStations = Array.from(stations);
      const [removed] = reorderedStations.splice(source.index, 1);
      reorderedStations.splice(destination.index, 0, removed);
      setLocalStations(reorderedStations);
    } else if (type === 'gaugeTypes') {
      const reorderedGaugeTypes = Array.from(gaugeTypes);
      const [removed] = reorderedGaugeTypes.splice(source.index, 1);
      reorderedGaugeTypes.splice(destination.index, 0, removed);
      setLocalGaugeTypes(reorderedGaugeTypes);
    }
  };

  // Create machine mutation
  const createMachineMutation = useMutation({
    mutationFn: async (machineData: InsertMachine) => {
      return apiRequest('POST', '/api/machines/create', machineData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      toast({ title: "Success", description: "Machine created successfully." });
      setNewMachineName("");
      setNewMachineNo("");
      setNewMachineStatus("RUNNING");
      setShowAddMachine(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create machine.", variant: "destructive" });
    }
  });

  // Update machine mutation
  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, ...machineData }: { id: number } & InsertMachine) => {
      return apiRequest('PUT', `/api/machines/${id}`, machineData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      toast({ title: "Success", description: "Machine updated successfully." });
      setEditingMachine(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update machine.", variant: "destructive" });
    }
  });

  // Delete machine mutation
  const deleteMachineMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Machine deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete machine.", variant: "destructive" });
    }
  });

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
      setNewGauge({ name: "", gaugeTypeId: 1, unit: "", minValue: 0, maxValue: 100, step: 1, condition: "", instruction: "" });
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

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string; isAdmin: boolean }) => {
      return apiRequest('POST', '/api/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Success", description: "User created successfully." });
      setNewUsername("");
      setNewUserPassword("");
      setNewUserIsAdmin(false);
      setShowAddUser(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to create user.", 
        variant: "destructive" 
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: Partial<User> }) => {
      return apiRequest('PUT', `/api/users/${id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Success", description: "User updated successfully." });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Success", description: "User deleted successfully." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to delete user.", 
        variant: "destructive" 
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      return apiRequest('PUT', `/api/users/${id}/password`, { password });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password reset successfully." });
      setResetPasswordUserId(null);
      setNewPassword("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset password.", variant: "destructive" });
    },
  });

  // Gauge Types mutations
  const createGaugeTypeMutation = useMutation({
    mutationFn: async (gaugeTypeData: InsertGaugeType) => {
      return apiRequest('POST', '/api/gauge-types', gaugeTypeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gauge-types'] });
      toast({ title: "Success", description: "Gauge type created successfully." });
      setNewGaugeType({
        name: "",
        hasUnit: true,
        hasMinValue: true,
        hasMaxValue: true,
        hasStep: false,
        hasCondition: false,
        hasInstruction: false,
        defaultUnit: "",
        defaultMinValue: 0,
        defaultMaxValue: 100,
        defaultStep: 1,
        instruction: ""
      });
      setShowAddGaugeType(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create gauge type.", variant: "destructive" });
    }
  });

  const updateGaugeTypeMutation = useMutation({
    mutationFn: async ({ id, ...gaugeTypeData }: { id: number } & Partial<InsertGaugeType>) => {
      return apiRequest('PUT', `/api/gauge-types/${id}`, gaugeTypeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gauge-types'] });
      toast({ title: "Success", description: "Gauge type updated successfully." });
      setEditingGaugeType(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update gauge type.", variant: "destructive" });
    }
  });

  const deleteGaugeTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/gauge-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gauge-types'] });
      toast({ title: "Success", description: "Gauge type deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete gauge type.", variant: "destructive" });
    }
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
                  onClick={() => setActiveTab("machines")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "machines"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Factory className="h-4 w-4 inline mr-2" />
                  Manage Machines
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
                <button
                  onClick={() => setActiveTab("gauge-types")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "gauge-types"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Gauge className="h-4 w-4 inline mr-2" />
                  Manage Gauge Types
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "users"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Manage Users
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

          {/* Machines Management Tab */}
          {activeTab === "machines" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Manage Machines</h2>
                <button
                  onClick={() => setShowAddMachine(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Machine
                </button>
              </div>

              {/* Add Machine Form */}
              {showAddMachine && (
                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h3 className="text-md font-medium mb-4">Add New Machine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Name
                      </label>
                      <input
                        type="text"
                        value={newMachineName}
                        onChange={(e) => setNewMachineName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter machine name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Number
                      </label>
                      <input
                        type="text"
                        value={newMachineNo}
                        onChange={(e) => setNewMachineNo(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter machine number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={newMachineStatus}
                        onChange={(e) => setNewMachineStatus(e.target.value as MachineStatus)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="RUNNING">Running</option>
                        <option value="STOP">Stop</option>
                        <option value="During Maintenance">During Maintenance</option>
                        <option value="Out of Order">Out of Order</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => {
                        if (newMachineName.trim() && newMachineNo.trim()) {
                          createMachineMutation.mutate({
                            name: newMachineName.trim(),
                            machineNo: newMachineNo.trim(),
                            status: newMachineStatus
                          });
                        }
                      }}
                      disabled={!newMachineName.trim() || !newMachineNo.trim() || createMachineMutation.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createMachineMutation.isPending ? "Creating..." : "Create Machine"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMachine(false);
                        setNewMachineName("");
                        setNewMachineNo("");
                        setNewMachineStatus("RUNNING");
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Machines List */}
              <div className="space-y-3">
                {machines.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No machines found. Add your first machine above.</p>
                ) : (
                  machines.map((machine) => (
                    <div key={machine.id} className="border border-gray-200 rounded-md p-4">
                      {editingMachine?.id === machine.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Machine Name
                              </label>
                              <input
                                type="text"
                                value={editingMachine.name}
                                onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Machine Number
                              </label>
                              <input
                                type="text"
                                value={editingMachine.machineNo}
                                onChange={(e) => setEditingMachine({ ...editingMachine, machineNo: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={editingMachine.status}
                                onChange={(e) => setEditingMachine({ ...editingMachine, status: e.target.value as MachineStatus })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                              >
                                <option value="RUNNING">Running</option>
                                <option value="STOP">Stop</option>
                                <option value="During Maintenance">During Maintenance</option>
                                <option value="Out of Order">Out of Order</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                if (editingMachine.name.trim() && editingMachine.machineNo.trim()) {
                                  updateMachineMutation.mutate({
                                    id: editingMachine.id,
                                    name: editingMachine.name.trim(),
                                    machineNo: editingMachine.machineNo.trim(),
                                    status: editingMachine.status
                                  });
                                }
                              }}
                              disabled={!editingMachine.name.trim() || !editingMachine.machineNo.trim() || updateMachineMutation.isPending}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {updateMachineMutation.isPending ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingMachine(null)}
                              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h3 className="font-medium text-gray-900">{machine.name}</h3>
                                <p className="text-sm text-gray-600">Machine No: {machine.machineNo}</p>
                              </div>
                              <div className="flex items-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  machine.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                                  machine.status === 'STOP' ? 'bg-red-100 text-red-800' :
                                  machine.status === 'During Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {machine.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingMachine(machine)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${machine.name}"? This will also delete all associated stations and gauges.`)) {
                                  deleteMachineMutation.mutate(machine.id);
                                }
                              }}
                              disabled={deleteMachineMutation.isPending}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {deleteMachineMutation.isPending ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
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
                        Machine
                      </label>
                      <select
                        value={newStationMachineId || ""}
                        onChange={(e) => setNewStationMachineId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select a machine</option>
                        {machines.map((machine) => (
                          <option key={machine.id} value={machine.id}>
                            {machine.name} (#{machine.machineNo})
                          </option>
                        ))}
                      </select>
                    </div>
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
                        onClick={() => {
                          if (newStationMachineId && newStationName.trim()) {
                            createStationMutation.mutate({ 
                              machineId: newStationMachineId,
                              name: newStationName.trim(), 
                              description: newStationDescription.trim() || null 
                            });
                          }
                        }}
                        disabled={!newStationName.trim() || !newStationMachineId || createStationMutation.isPending}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2 inline" />
                        {createStationMutation.isPending ? "Creating..." : "Create Station"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddStation(false);
                          setNewStationName("");
                          setNewStationDescription("");
                          setNewStationMachineId(null);
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
                            Machine
                          </label>
                          <select
                            value={editingStation.machineId}
                            onChange={(e) => setEditingStation({ ...editingStation, machineId: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          >
                            {machines.map((machine) => (
                              <option key={machine.id} value={machine.id}>
                                {machine.name} (#{machine.machineNo})
                              </option>
                            ))}
                          </select>
                        </div>
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
                            onClick={() => updateStationMutation.mutate({ 
                              id: editingStation.id, 
                              machineId: editingStation.machineId,
                              name: editingStation.name, 
                              description: editingStation.description 
                            })}
                            disabled={updateStationMutation.isPending}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4 mr-2 inline" />
                            {updateStationMutation.isPending ? "Saving..." : "Save"}
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
                          <p className="text-sm text-blue-600 mt-1">
                            Machine: {machines.find(m => m.id === station.machineId)?.name || 'Unknown'} 
                            (#{machines.find(m => m.id === station.machineId)?.machineNo || 'N/A'})
                          </p>
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
                        {stations.map((station) => {
                          const machine = machines.find(m => m.id === station.machineId);
                          return (
                            <option key={station.id} value={station.id}>
                              {machine?.name || 'Unknown Machine'} → {station.name}
                            </option>
                          );
                        })}
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
                        value={newGauge.gaugeTypeId}
                        onChange={(e) => setNewGauge({ ...newGauge, gaugeTypeId: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select gauge type...</option>
                        {gaugeTypesData.map((gaugeType) => (
                          <option key={gaugeType.id} value={gaugeType.id}>
                            {gaugeType.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Dynamic fields based on selected gauge type */}
                    {(() => {
                      const selectedGaugeType = gaugeTypesData.find(gt => gt.id === newGauge.gaugeTypeId);
                      if (!selectedGaugeType) return null;
                      
                      return (
                        <>
                          {selectedGaugeType.hasUnit && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit
                              </label>
                              <input
                                type="text"
                                value={newGauge.unit}
                                onChange={(e) => setNewGauge({ ...newGauge, unit: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder={selectedGaugeType.defaultUnit || "e.g., PSI, °C, hrs"}
                              />
                            </div>
                          )}
                          {selectedGaugeType.hasMinValue && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Value
                              </label>
                              <input
                                type="number"
                                value={newGauge.minValue}
                                onChange={(e) => setNewGauge({ ...newGauge, minValue: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder={selectedGaugeType.defaultMinValue?.toString() || "0"}
                              />
                            </div>
                          )}
                          {selectedGaugeType.hasMaxValue && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Value
                              </label>
                              <input
                                type="number"
                                value={newGauge.maxValue}
                                onChange={(e) => setNewGauge({ ...newGauge, maxValue: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder={selectedGaugeType.defaultMaxValue?.toString() || "100"}
                              />
                            </div>
                          )}
                          {selectedGaugeType.hasStep && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Step
                              </label>
                              <input
                                type="number"
                                value={newGauge.step || ""}
                                onChange={(e) => setNewGauge({ ...newGauge, step: Number(e.target.value) })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder={selectedGaugeType.defaultStep?.toString() || "1"}
                              />
                            </div>
                          )}
                          {selectedGaugeType.hasCondition && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Condition
                              </label>
                              <select
                                value={newGauge.condition || ""}
                                onChange={(e) => setNewGauge({ ...newGauge, condition: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                              >
                                <option value="">Select condition...</option>
                                <option value="Good condition">Good condition</option>
                                <option value="Problem">Problem</option>
                              </select>
                            </div>
                          )}
                          {selectedGaugeType.hasInstruction && (
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Instruction
                              </label>
                              <textarea
                                value={newGauge.instruction || ""}
                                onChange={(e) => setNewGauge({ ...newGauge, instruction: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                rows={3}
                                placeholder={selectedGaugeType.instruction || "Instructions for technicians..."}
                              />
                            </div>
                          )}

                        </>
                      );
                    })()}
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
                          setNewGauge({ name: "", gaugeTypeId: 1, unit: "", minValue: 0, maxValue: 100, step: 1, condition: "", instruction: "" });
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
                {stations.map((station) => {
                  const machine = machines.find(m => m.id === station.machineId);
                  return (
                    <div key={station.id} className="border border-gray-200 rounded-md p-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-gray-800">{station.name}</h3>
                        <p className="text-sm text-blue-600">
                          Machine: {machine?.name || 'Unknown'} (#{machine?.machineNo || 'N/A'})
                        </p>
                      </div>
                    {station.gauges && station.gauges.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {station.gauges.sort((a, b) => a.id - b.id).map((gauge) => (
                          <div key={gauge.id} className="border border-gray-100 rounded-md p-3 bg-gray-50">
                            {editingGauge?.id === gauge.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gauge Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editingGauge.name}
                                    onChange={(e) => setEditingGauge({ ...editingGauge, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Type
                                    </label>
                                    <select
                                      value={editingGauge.gaugeTypeId}
                                      onChange={(e) => setEditingGauge({ ...editingGauge, gaugeTypeId: Number(e.target.value) })}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                      <option value="">Select gauge type...</option>
                                      {gaugeTypesData.map((gaugeType) => (
                                        <option key={gaugeType.id} value={gaugeType.id}>
                                          {gaugeType.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                
                                {/* Dynamic fields based on selected gauge type */}
                                {(() => {
                                  const selectedGaugeType = gaugeTypesData.find(gt => gt.id === editingGauge.gaugeTypeId);
                                  if (!selectedGaugeType) return null;
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedGaugeType.hasUnit && (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Unit
                                            </label>
                                            <input
                                              type="text"
                                              value={editingGauge.unit || ""}
                                              onChange={(e) => setEditingGauge({ ...editingGauge, unit: e.target.value })}
                                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                              placeholder={selectedGaugeType.defaultUnit || "e.g., PSI, °C, hrs"}
                                            />
                                          </div>
                                        )}
                                        {selectedGaugeType.hasMinValue && (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Min Value
                                            </label>
                                            <input
                                              type="number"
                                              value={editingGauge.minValue || ""}
                                              onChange={(e) => setEditingGauge({ ...editingGauge, minValue: Number(e.target.value) })}
                                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                              placeholder={selectedGaugeType.defaultMinValue?.toString() || "0"}
                                            />
                                          </div>
                                        )}
                                        {selectedGaugeType.hasMaxValue && (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Max Value
                                            </label>
                                            <input
                                              type="number"
                                              value={editingGauge.maxValue || ""}
                                              onChange={(e) => setEditingGauge({ ...editingGauge, maxValue: Number(e.target.value) })}
                                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                              placeholder={selectedGaugeType.defaultMaxValue?.toString() || "100"}
                                            />
                                          </div>
                                        )}
                                        {selectedGaugeType.hasStep && (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Step
                                            </label>
                                            <input
                                              type="number"
                                              value={editingGauge.step || ""}
                                              onChange={(e) => setEditingGauge({ ...editingGauge, step: Number(e.target.value) })}
                                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                              placeholder={selectedGaugeType.defaultStep?.toString() || "1"}
                                            />
                                          </div>
                                        )}
                                        {selectedGaugeType.hasCondition && (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Condition
                                            </label>
                                            <select
                                              value={editingGauge.condition || ""}
                                              onChange={(e) => setEditingGauge({ ...editingGauge, condition: e.target.value })}
                                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                            >
                                              <option value="">Select condition...</option>
                                              <option value="Good condition">Good condition</option>
                                              <option value="Problem">Problem</option>
                                            </select>
                                          </div>
                                        )}
                                      </div>
                                      {selectedGaugeType.hasInstruction && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Instruction
                                          </label>
                                          <textarea
                                            value={editingGauge.instruction || ""}
                                            onChange={(e) => setEditingGauge({ ...editingGauge, instruction: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                            rows={3}
                                            placeholder={selectedGaugeType.instruction || "Instructions for technicians..."}
                                          />
                                        </div>
                                      )}

                                    </div>
                                  );
                                })()}
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      if (editingGauge.name.trim()) {
                                        updateGaugeMutation.mutate({
                                          id: editingGauge.id,
                                          name: editingGauge.name.trim(),
                                          gaugeTypeId: editingGauge.gaugeTypeId,
                                          stationId: editingGauge.stationId,
                                          unit: editingGauge.unit || null,
                                          minValue: editingGauge.minValue || null,
                                          maxValue: editingGauge.maxValue || null,
                                          step: editingGauge.step || null,
                                          condition: editingGauge.condition || null,
                                          instruction: editingGauge.instruction || null
                                        });
                                      }
                                    }}
                                    disabled={!editingGauge.name.trim() || updateGaugeMutation.isPending}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    {updateGaugeMutation.isPending ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() => setEditingGauge(null)}
                                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 flex items-center"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-gray-800">{gauge.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    Type: {gauge.gaugeType.name} | Unit: {gauge.unit}
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
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No gauges configured for this station.</p>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manage Users Tab */}
          {activeTab === "users" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </button>
              </div>

              {/* Add User Form */}
              {showAddUser && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Add New User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <div className="flex items-center space-x-4 pt-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!newUserIsAdmin}
                            onChange={() => setNewUserIsAdmin(false)}
                            className="mr-2"
                          />
                          User
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={newUserIsAdmin}
                            onChange={() => setNewUserIsAdmin(true)}
                            className="mr-2"
                          />
                          Admin
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => {
                        setShowAddUser(false);
                        setNewUsername("");
                        setNewUserPassword("");
                        setNewUserIsAdmin(false);
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <XCircle className="h-4 w-4 inline mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (newUsername && newUserPassword) {
                          createUserMutation.mutate({
                            username: newUsername,
                            password: newUserPassword,
                            isAdmin: newUserIsAdmin
                          });
                        }
                      }}
                      disabled={!newUsername || !newUserPassword || createUserMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 inline mr-2" />
                      Create User
                    </button>
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="space-y-4">
                {usersData.map((userItem) => (
                  <div key={userItem.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-800">{userItem.username}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              userItem.isAdmin 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {userItem.isAdmin ? 'Admin' : 'User'}
                            </span>
                            <span className="text-sm text-gray-500">
                              Created: {new Date(userItem.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {editingUser?.id === userItem.id ? (
                          <div className="flex items-center space-x-2">
                            <label className="flex items-center text-sm">
                              <input
                                type="radio"
                                checked={!editingUser.isAdmin}
                                onChange={() => setEditingUser({ ...editingUser, isAdmin: false })}
                                className="mr-1"
                              />
                              User
                            </label>
                            <label className="flex items-center text-sm">
                              <input
                                type="radio"
                                checked={editingUser.isAdmin}
                                onChange={() => setEditingUser({ ...editingUser, isAdmin: true })}
                                className="mr-1"
                              />
                              Admin
                            </label>
                            <button
                              onClick={() => {
                                updateUserMutation.mutate({
                                  id: editingUser.id,
                                  userData: { isAdmin: editingUser.isAdmin }
                                });
                              }}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingUser(userItem)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit role"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setResetPasswordUserId(userItem.id)}
                              className="text-orange-600 hover:text-orange-800"
                              title="Reset password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            {userItem.id !== user?.id && (
                              <button
                                onClick={() => setDeleteConfirmUser(userItem)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reset Password Form */}
                    {resetPasswordUserId === userItem.id && (
                      <div className="mt-4 p-3 border border-gray-200 rounded bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-800 mb-2">Reset Password for {userItem.username}</h4>
                        <div className="flex items-center space-x-2">
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => {
                              if (newPassword && newPassword.length >= 6) {
                                resetPasswordMutation.mutate({
                                  id: userItem.id,
                                  password: newPassword
                                });
                              }
                            }}
                            disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
                            className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordUserId(null);
                              setNewPassword("");
                            }}
                            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                        {newPassword && newPassword.length < 6 && (
                          <p className="text-red-500 text-xs mt-1">Password must be at least 6 characters long</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {usersData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No users found. Add a user to get started.</p>
                </div>
              )}

              {/* Delete Confirmation Dialog */}
              {deleteConfirmUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm User Deletion</h3>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to delete user "{deleteConfirmUser.username}"? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setDeleteConfirmUser(null)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          deleteUserMutation.mutate(deleteConfirmUser.id);
                          setDeleteConfirmUser(null);
                        }}
                        disabled={deleteUserMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gauge Types Management Tab */}
          {activeTab === "gauge-types" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Manage Gauge Types</h2>
                <button
                  onClick={() => setShowAddGaugeType(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Gauge Type
                </button>
              </div>

              {/* Add Gauge Type Form */}
              {showAddGaugeType && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Gauge Type</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gauge Type Name
                      </label>
                      <input
                        type="text"
                        value={newGaugeType.name}
                        onChange={(e) => setNewGaugeType(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter gauge type name"
                      />
                    </div>

                    {/* Field Configuration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Associated Fields
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGaugeType.hasUnit}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, hasUnit: e.target.checked }))}
                            className="mr-2"
                          />
                          Unit
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGaugeType.hasMinValue}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, hasMinValue: e.target.checked }))}
                            className="mr-2"
                          />
                          Min Value
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGaugeType.hasMaxValue}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, hasMaxValue: e.target.checked }))}
                            className="mr-2"
                          />
                          Max Value
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGaugeType.hasStep}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, hasStep: e.target.checked }))}
                            className="mr-2"
                          />
                          Step
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGaugeType.hasCondition}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, hasCondition: e.target.checked }))}
                            className="mr-2"
                          />
                          Condition
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGaugeType.hasInstruction}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, hasInstruction: e.target.checked }))}
                            className="mr-2"
                          />
                          Instruction
                        </label>

                      </div>
                    </div>

                    {/* Default Values */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {newGaugeType.hasUnit && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Unit
                          </label>
                          <input
                            type="text"
                            value={newGaugeType.defaultUnit || ""}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, defaultUnit: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="e.g., °C, rpm, bar"
                          />
                        </div>
                      )}
                      {newGaugeType.hasMinValue && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Min Value
                          </label>
                          <input
                            type="number"
                            value={newGaugeType.defaultMinValue || ""}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, defaultMinValue: parseFloat(e.target.value) || 0 }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        </div>
                      )}
                      {newGaugeType.hasMaxValue && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Max Value
                          </label>
                          <input
                            type="number"
                            value={newGaugeType.defaultMaxValue || ""}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, defaultMaxValue: parseFloat(e.target.value) || 100 }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        </div>
                      )}
                      {newGaugeType.hasStep && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Step
                          </label>
                          <input
                            type="number"
                            value={newGaugeType.defaultStep || ""}
                            onChange={(e) => setNewGaugeType(prev => ({ ...prev, defaultStep: parseFloat(e.target.value) || 1 }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        </div>
                      )}
                    </div>

                    {newGaugeType.hasInstruction && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default Instruction
                        </label>
                        <textarea
                          value={newGaugeType.instruction || ""}
                          onChange={(e) => setNewGaugeType(prev => ({ ...prev, instruction: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          rows={3}
                          placeholder="Instructions for technicians on how to check this gauge type"
                        />
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowAddGaugeType(false);
                          setNewGaugeType({
                            name: "",
                            hasUnit: true,
                            hasMinValue: true,
                            hasMaxValue: true,
                            hasStep: false,
                            hasCondition: false,
                            hasInstruction: false,

                            defaultUnit: "",
                            defaultMinValue: 0,
                            defaultMaxValue: 100,
                            defaultStep: 1,
                            instruction: ""
                          });
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newGaugeType.name.trim()) {
                            createGaugeTypeMutation.mutate(newGaugeType);
                          }
                        }}
                        disabled={!newGaugeType.name.trim() || createGaugeTypeMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {createGaugeTypeMutation.isPending ? "Creating..." : "Create Gauge Type"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Gauge Types List */}
              <div className="space-y-4">
                {gaugeTypesData.map((gaugeType) => (
                  <div key={gaugeType.id} className="p-4 border border-gray-200 rounded-lg">
                    {editingGaugeType?.id === gaugeType.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gauge Type Name
                          </label>
                          <input
                            type="text"
                            value={editingGaugeType.name}
                            onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Associated Fields
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editingGaugeType.hasUnit}
                                onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, hasUnit: e.target.checked }) : null)}
                                className="mr-2"
                              />
                              Unit
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editingGaugeType.hasMinValue}
                                onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, hasMinValue: e.target.checked }) : null)}
                                className="mr-2"
                              />
                              Min Value
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editingGaugeType.hasMaxValue}
                                onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, hasMaxValue: e.target.checked }) : null)}
                                className="mr-2"
                              />
                              Max Value
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editingGaugeType.hasStep}
                                onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, hasStep: e.target.checked }) : null)}
                                className="mr-2"
                              />
                              Step
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editingGaugeType.hasCondition}
                                onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, hasCondition: e.target.checked }) : null)}
                                className="mr-2"
                              />
                              Condition
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editingGaugeType.hasInstruction}
                                onChange={(e) => setEditingGaugeType(prev => prev ? ({ ...prev, hasInstruction: e.target.checked }) : null)}
                                className="mr-2"
                              />
                              Instruction
                            </label>

                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setEditingGaugeType(null)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <XCircle className="h-4 w-4 mr-1 inline" />
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editingGaugeType.name.trim()) {
                                updateGaugeTypeMutation.mutate({
                                  ...editingGaugeType
                                });
                              }
                            }}
                            disabled={!editingGaugeType.name.trim() || updateGaugeTypeMutation.isPending}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4 mr-1 inline" />
                            {updateGaugeTypeMutation.isPending ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-800 mb-2">{gaugeType.name}</h3>
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Associated Fields:</strong>{" "}
                            {[
                              gaugeType.hasUnit && "Unit",
                              gaugeType.hasMinValue && "Min Value",
                              gaugeType.hasMaxValue && "Max Value",
                              gaugeType.hasStep && "Step",
                              gaugeType.hasCondition && "Condition",
                              gaugeType.hasInstruction && "Instruction",

                            ].filter(Boolean).join(", ")}
                          </div>
                          {gaugeType.hasUnit && gaugeType.defaultUnit && (
                            <div className="text-sm text-gray-600">
                              <strong>Default Unit:</strong> {gaugeType.defaultUnit}
                            </div>
                          )}
                          {gaugeType.hasInstruction && gaugeType.instruction && (
                            <div className="text-sm text-gray-600 mt-1">
                              <strong>Default Instruction:</strong> {gaugeType.instruction}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => setEditingGaugeType(gaugeType)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit gauge type"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the gauge type "${gaugeType.name}"?`)) {
                                deleteGaugeTypeMutation.mutate(gaugeType.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete gauge type"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {gaugeTypesData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Gauge className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No gauge types found. Add a gauge type to get started.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}