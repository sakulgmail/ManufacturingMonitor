import { useState, useEffect } from "react";
import { Factory, Gauge, Monitor, Upload, X, Plus, Edit2, Trash2, Save, XCircle, Users, Key, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type User } from "@/hooks/useAuth";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Machine, Station, Gauge as GaugeInterface, GaugeType, InsertMachine, InsertStation, InsertGauge, InsertGaugeType, MachineStatus, GaugeCondition } from "@/lib/types";

type IconKey = "factory" | "gauge" | "monitor";

const icons = {
  factory: <Factory className="h-16 w-16 text-gray-600" />,
  gauge: <Gauge className="h-16 w-16 text-gray-600" />,
  monitor: <Monitor className="h-16 w-16 text-gray-600" />
};

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"app" | "machines" | "stations" | "gauges" | "gauge-types" | "users" | "reset-time">("app");
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
  const [newGauge, setNewGauge] = useState<Partial<InsertGauge>>({
    name: "",
    gaugeTypeId: 0,
    stationId: 0,
    unit: "",
    minValue: 0,
    maxValue: 100,
    step: 1,
    condition: "",
    instruction: ""
  });
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showAddGauge, setShowAddGauge] = useState(false);

  // Gauge Type management state
  const [editingGaugeType, setEditingGaugeType] = useState<GaugeType | null>(null);
  const [newGaugeType, setNewGaugeType] = useState<Partial<InsertGaugeType>>({
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

  // Machine Status Reset Time state
  const [resetTimeEnabled, setResetTimeEnabled] = useState(false);
  const [resetTime, setResetTime] = useState("07:00");
  const [resetTimeLoading, setResetTimeLoading] = useState(false);

  // Local ordering state for manual arrangement
  const [localMachines, setLocalMachines] = useState<Machine[]>([]);
  const [localStations, setLocalStations] = useState<Station[]>([]);
  const [localGaugeTypes, setLocalGaugeTypes] = useState<GaugeType[]>([]);
  const [localGauges, setLocalGauges] = useState<any[]>([]);

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

  // Fetch gauges data (admin only)
  const { data: gaugesData = [] } = useQuery<any[]>({
    queryKey: ['/api/gauges'],
    enabled: user?.isAdmin === true,
  });

  // Fetch system settings (admin only)
  const { data: systemSettings = [], refetch: refetchSystemSettings } = useQuery<any[]>({
    queryKey: ['/api/system-settings'],
    enabled: user?.isAdmin === true,
  });

  // Sort users in ascending order
  const users = usersData.sort((a, b) => a.id - b.id);

  // Load saved ordering from localStorage
  const loadSavedOrder = (items: any[], storageKey: string) => {
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const orderedItems = orderIds.map((id: number) => items.find(item => item.id === id)).filter(Boolean);
        const newItems = items.filter(item => !orderIds.includes(item.id));
        return [...orderedItems, ...newItems];
      } catch (e) {
        return items.sort((a, b) => a.id - b.id);
      }
    }
    return items.sort((a, b) => a.id - b.id);
  };

  // Save ordering to localStorage
  const saveOrder = (items: any[], storageKey: string) => {
    const orderIds = items.map(item => item.id);
    localStorage.setItem(storageKey, JSON.stringify(orderIds));
  };

  // Update local state when data changes
  useEffect(() => {
    const orderedMachines = loadSavedOrder(machinesData, 'machineOrder');
    setLocalMachines(orderedMachines);
  }, [JSON.stringify(machinesData)]);

  useEffect(() => {
    const orderedStations = loadSavedOrder(stationsData, 'stationOrder');
    setLocalStations(orderedStations);
  }, [JSON.stringify(stationsData)]);

  useEffect(() => {
    const orderedGaugeTypes = loadSavedOrder(gaugeTypesData, 'gaugeTypeOrder');
    setLocalGaugeTypes(orderedGaugeTypes);
  }, [JSON.stringify(gaugeTypesData)]);

  useEffect(() => {
    const orderedGauges = loadSavedOrder(gaugesData, 'gaugeOrder');
    setLocalGauges(orderedGauges);
  }, [JSON.stringify(gaugesData)]);

  // Use local state for rendering
  const machines = localMachines;
  const stations = localStations;
  const gaugeTypes = localGaugeTypes;
  const gauges = localGauges;

  // Initialize reset time settings from system settings
  useEffect(() => {
    if (systemSettings.length > 0) {
      const resetTimeSetting = systemSettings.find(s => s.key === 'machine_reset_time');
      if (resetTimeSetting) {
        setResetTimeEnabled(resetTimeSetting.enabled);
        setResetTime(resetTimeSetting.value);
      }
    }
  }, [systemSettings]);

  // Move item up/down handlers
  const moveItemUp = (index: number, type: 'machines' | 'stations' | 'gaugeTypes' | 'gauges') => {
    if (index === 0) return;
    
    if (type === 'machines') {
      const newMachines = [...machines];
      [newMachines[index], newMachines[index - 1]] = [newMachines[index - 1], newMachines[index]];
      setLocalMachines(newMachines);
      saveOrder(newMachines, 'machineOrder');
    } else if (type === 'stations') {
      const newStations = [...stations];
      [newStations[index], newStations[index - 1]] = [newStations[index - 1], newStations[index]];
      setLocalStations(newStations);
      saveOrder(newStations, 'stationOrder');
    } else if (type === 'gaugeTypes') {
      const newGaugeTypes = [...gaugeTypes];
      [newGaugeTypes[index], newGaugeTypes[index - 1]] = [newGaugeTypes[index - 1], newGaugeTypes[index]];
      setLocalGaugeTypes(newGaugeTypes);
      saveOrder(newGaugeTypes, 'gaugeTypeOrder');
    } else if (type === 'gauges') {
      const newGauges = [...gauges];
      [newGauges[index], newGauges[index - 1]] = [newGauges[index - 1], newGauges[index]];
      setLocalGauges(newGauges);
      saveOrder(newGauges, 'gaugeOrder');
    }
  };

  const moveItemDown = (index: number, type: 'machines' | 'stations' | 'gaugeTypes' | 'gauges') => {
    const maxIndex = type === 'machines' ? machines.length - 1 : 
                   type === 'stations' ? stations.length - 1 : 
                   type === 'gaugeTypes' ? gaugeTypes.length - 1 :
                   gauges.length - 1;
    
    if (index === maxIndex) return;
    
    if (type === 'machines') {
      const newMachines = [...machines];
      [newMachines[index], newMachines[index + 1]] = [newMachines[index + 1], newMachines[index]];
      setLocalMachines(newMachines);
      saveOrder(newMachines, 'machineOrder');
    } else if (type === 'stations') {
      const newStations = [...stations];
      [newStations[index], newStations[index + 1]] = [newStations[index + 1], newStations[index]];
      setLocalStations(newStations);
      saveOrder(newStations, 'stationOrder');
    } else if (type === 'gaugeTypes') {
      const newGaugeTypes = [...gaugeTypes];
      [newGaugeTypes[index], newGaugeTypes[index + 1]] = [newGaugeTypes[index + 1], newGaugeTypes[index]];
      setLocalGaugeTypes(newGaugeTypes);
      saveOrder(newGaugeTypes, 'gaugeTypeOrder');
    } else if (type === 'gauges') {
      const newGauges = [...gauges];
      [newGauges[index], newGauges[index + 1]] = [newGauges[index + 1], newGauges[index]];
      setLocalGauges(newGauges);
      saveOrder(newGauges, 'gaugeOrder');
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
      // Invalidate and refetch queries for immediate UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      
      // Force refetch of critical data for real-time updates
      queryClient.refetchQueries({ queryKey: ['/api/machines'] });
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      
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
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station created successfully." });
      setNewStationName("");
      setNewStationDescription("");
      setNewStationMachineId(null);
      setShowAddStation(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create station.", variant: "destructive" });
    }
  });

  // Update station mutation
  const updateStationMutation = useMutation({
    mutationFn: async ({ id, ...stationData }: { id: number } & InsertStation) => {
      return apiRequest('PUT', `/api/stations/${id}`, stationData);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station updated successfully." });
      setEditingStation(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update station.", variant: "destructive" });
    }
  });

  // Delete station mutation
  const deleteStationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/stations/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete station.", variant: "destructive" });
    }
  });

  // Create gauge type mutation
  const createGaugeTypeMutation = useMutation({
    mutationFn: async (gaugeTypeData: InsertGaugeType) => {
      return apiRequest('POST', '/api/gauge-types', gaugeTypeData);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/gauge-types'] });
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

  // Update gauge type mutation
  const updateGaugeTypeMutation = useMutation({
    mutationFn: async ({ id, ...gaugeTypeData }: { id: number } & Partial<InsertGaugeType>) => {
      return apiRequest('PUT', `/api/gauge-types/${id}`, gaugeTypeData);
    },
    onSuccess: () => {
      // Force refetch instead of just invalidating to ensure fresh data
      queryClient.refetchQueries({ queryKey: ['/api/gauge-types'] });
      toast({ title: "Success", description: "Gauge type updated successfully." });
      setEditingGaugeType(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update gauge type.", variant: "destructive" });
    }
  });

  // Delete gauge type mutation
  const deleteGaugeTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/gauge-types/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/gauge-types'] });
      toast({ title: "Success", description: "Gauge type deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete gauge type.", variant: "destructive" });
    }
  });

  // Create gauge mutation
  const createGaugeMutation = useMutation({
    mutationFn: async (gaugeData: InsertGauge) => {
      return apiRequest('POST', '/api/gauges', gaugeData);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/gauges'] });
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Gauge created successfully." });
      setNewGauge({ name: "", gaugeTypeId: 0, stationId: 0, unit: "", minValue: 0, maxValue: 100, step: 1, condition: "", instruction: "" });
      setSelectedStationId(null);
      setShowAddGauge(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create gauge.", variant: "destructive" });
    }
  });

  // Update gauge mutation
  const updateGaugeMutation = useMutation({
    mutationFn: async ({ id, ...gaugeData }: { id: number } & Partial<InsertGauge>) => {
      return apiRequest('PUT', `/api/gauges/${id}`, gaugeData);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/gauges'] });
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Gauge updated successfully." });
      setEditingGauge(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update gauge.", variant: "destructive" });
    }
  });

  // Delete gauge mutation
  const deleteGaugeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/gauges/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/gauges'] });
      toast({ title: "Success", description: "Gauge deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete gauge.", variant: "destructive" });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
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
    onError: () => {
      toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
    }
  });

  // System Settings mutations
  const updateSystemSettingMutation = useMutation({
    mutationFn: async ({ key, value, enabled }: { key: string; value: string; enabled: boolean }) => {
      const existingSetting = systemSettings.find(s => s.key === key);
      if (existingSetting) {
        return apiRequest('PUT', `/api/system-settings/${key}`, { value, enabled });
      } else {
        return apiRequest('POST', '/api/system-settings', { key, value, enabled });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      toast({ title: "Success", description: "System setting updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update system setting.", variant: "destructive" });
    }
  });

  // Machine Status Reset mutation
  const resetMachineStatusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/machines/reset-status');
    },
    onSuccess: () => {
      // Invalidate and refetch queries for immediate UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      
      // Force refetch of critical data for real-time updates
      queryClient.refetchQueries({ queryKey: ['/api/machines'] });
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      
      toast({ title: "Success", description: "All machine statuses reset to 'To Check'." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset machine statuses.", variant: "destructive" });
    }
  });

  // Handle reset time settings save
  const handleResetTimeSubmit = () => {
    setResetTimeLoading(true);
    updateSystemSettingMutation.mutate(
      { key: 'machine_reset_time', value: resetTime, enabled: resetTimeEnabled },
      {
        onSettled: () => {
          setResetTimeLoading(false);
        }
      }
    );
  };



  // Load settings from local storage on component mount
  useEffect(() => {
    const storedTitle = localStorage.getItem("appTitle");
    const storedIcon = localStorage.getItem("appIcon") as IconKey;
    const storedCustomImage = localStorage.getItem("customImage");
    const storedUseCustomImage = localStorage.getItem("useCustomImage");

    if (storedTitle) {
      setTitle(storedTitle);
    }
    if (storedIcon && ["factory", "gauge", "monitor"].includes(storedIcon)) {
      setCurrentIcon(storedIcon);
    }
    if (storedCustomImage) {
      setCustomImage(storedCustomImage);
    }
    if (storedUseCustomImage) {
      setUseCustomImage(storedUseCustomImage === "true");
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomImage(result);
        setUseCustomImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Settings handlers
  const saveSettings = () => {
    localStorage.setItem("appTitle", title);
    localStorage.setItem("appIcon", currentIcon);
    if (customImage) {
      localStorage.setItem("customImage", customImage);
    }
    localStorage.setItem("useCustomImage", useCustomImage.toString());
    
    toast({ title: "Settings Saved", description: "Application settings have been saved successfully." });
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
                  <Monitor className="h-4 w-4 inline mr-2" />
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
                  <Gauge className="h-4 w-4 inline mr-2" />
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
                  <Key className="h-4 w-4 inline mr-2" />
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
                <button
                  onClick={() => setActiveTab("reset-time")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "reset-time"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Key className="h-4 w-4 inline mr-2" />
                  Machine Status Reset Time
                </button>
              </nav>
            </div>

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
                          <option value="RUNNING">RUNNING</option>
                          <option value="STOP">STOP</option>
                          <option value="To Check">To Check</option>
                          <option value="Out of Order">Out of Order</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={() => {
                          if (newMachineName.trim() && newMachineNo.trim()) {
                            createMachineMutation.mutate({
                              name: newMachineName,
                              machineNo: newMachineNo,
                              status: newMachineStatus
                            });
                          } else {
                            toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
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

                {/* Machines List with Manual Ordering */}
                <div className="space-y-3">
                  {machines.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No machines found. Add your first machine above.</p>
                  ) : (
                    machines.map((machine, index) => (
                      <div key={machine.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center">
                          <div className="flex flex-col mr-3">
                            <button
                              onClick={() => moveItemUp(index, 'machines')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => moveItemDown(index, 'machines')}
                              disabled={index === machines.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex-1">
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
                                      <option value="RUNNING">RUNNING</option>
                                      <option value="STOP">STOP</option>
                                      <option value="To Check">To Check</option>
                                      <option value="Out of Order">Out of Order</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      updateMachineMutation.mutate({
                                        id: editingMachine.id,
                                        name: editingMachine.name,
                                        machineNo: editingMachine.machineNo,
                                        status: editingMachine.status
                                      });
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
                        </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
                        <input
                          type="text"
                          value={newStationName}
                          onChange={(e) => setNewStationName(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter station name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                        <select
                          value={newStationMachineId || ""}
                          onChange={(e) => setNewStationMachineId(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select a machine</option>
                          {machines.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={newStationDescription}
                          onChange={(e) => setNewStationDescription(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter station description"
                          rows={3}
                        />
                      </div>
                      <div className="md:col-span-2 flex space-x-2">
                        <button
                          onClick={() => {
                            if (newStationName && newStationMachineId) {
                              createStationMutation.mutate({
                                name: newStationName,
                                machineId: newStationMachineId,
                                description: newStationDescription
                              });
                            }
                          }}
                          disabled={!newStationName || !newStationMachineId || createStationMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
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
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Station Form */}
                {editingStation && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-md bg-blue-50">
                    <h3 className="text-md font-medium mb-4">Edit Station</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
                        <input
                          type="text"
                          value={editingStation.name}
                          onChange={(e) => setEditingStation({...editingStation, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter station name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                        <select
                          value={editingStation.machineId}
                          onChange={(e) => setEditingStation({...editingStation, machineId: Number(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          {machines.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editingStation.description || ""}
                          onChange={(e) => setEditingStation({...editingStation, description: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter station description"
                          rows={3}
                        />
                      </div>
                      <div className="md:col-span-2 flex space-x-2">
                        <button
                          onClick={() => {
                            updateStationMutation.mutate({
                              id: editingStation.id,
                              name: editingStation.name,
                              machineId: editingStation.machineId,
                              description: editingStation.description || ""
                            });
                          }}
                          disabled={updateStationMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setEditingStation(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stations List with Manual Ordering */}
                <div className="space-y-3">
                  {stations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No stations found. Add your first station above.</p>
                  ) : (
                    stations.map((station, index) => (
                      <div key={station.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center">
                          <div className="flex flex-col mr-3">
                            <button
                              onClick={() => moveItemUp(index, 'stations')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => moveItemDown(index, 'stations')}
                              disabled={index === stations.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div>
                                  <h3 className="font-medium text-gray-900">{station.name}</h3>
                                  <p className="text-sm text-gray-600">
                                    Machine: {machines.find(m => m.id === station.machineId)?.name || 'Unknown'}
                                  </p>
                                  {station.description && (
                                    <p className="text-sm text-gray-500">{station.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingStation(station)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${station.name}"? This will also delete all associated gauges.`)) {
                                      deleteStationMutation.mutate(station.id);
                                    }
                                  }}
                                  disabled={deleteStationMutation.isPending}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  {deleteStationMutation.isPending ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Gauge Types Management Tab */}
            {activeTab === "gauge-types" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Manage Gauge Types</h2>
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
                  <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h3 className="text-md font-medium mb-4">Add New Gauge Type</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
                        <input
                          type="text"
                          value={newGaugeType.name || ""}
                          onChange={(e) => setNewGaugeType({...newGaugeType, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter gauge type name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit</label>
                        <input
                          type="text"
                          value={newGaugeType.defaultUnit || ""}
                          onChange={(e) => setNewGaugeType({...newGaugeType, defaultUnit: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="e.g., °C, PSI, RPM"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <h4 className="font-medium text-gray-700 mb-2">Features</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newGaugeType.hasUnit}
                              onChange={(e) => setNewGaugeType({...newGaugeType, hasUnit: e.target.checked})}
                              className="mr-2"
                            />
                            Has Unit
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newGaugeType.hasMinValue}
                              onChange={(e) => setNewGaugeType({...newGaugeType, hasMinValue: e.target.checked})}
                              className="mr-2"
                            />
                            Has Min Value
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newGaugeType.hasMaxValue}
                              onChange={(e) => setNewGaugeType({...newGaugeType, hasMaxValue: e.target.checked})}
                              className="mr-2"
                            />
                            Has Max Value
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newGaugeType.hasStep}
                              onChange={(e) => setNewGaugeType({...newGaugeType, hasStep: e.target.checked})}
                              className="mr-2"
                            />
                            Has Step
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newGaugeType.hasCondition}
                              onChange={(e) => setNewGaugeType({...newGaugeType, hasCondition: e.target.checked})}
                              className="mr-2"
                            />
                            Has Condition
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newGaugeType.hasInstruction}
                              onChange={(e) => setNewGaugeType({...newGaugeType, hasInstruction: e.target.checked})}
                              className="mr-2"
                            />
                            Has Instruction
                          </label>
                        </div>
                      </div>
                      <div className="md:col-span-2 flex space-x-2">
                        <button
                          onClick={() => {
                            if (newGaugeType.name) {
                              createGaugeTypeMutation.mutate(newGaugeType as any);
                            }
                          }}
                          disabled={!newGaugeType.name || createGaugeTypeMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
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
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Gauge Type Form */}
                {editingGaugeType && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-md bg-blue-50">
                    <h3 className="text-md font-medium mb-4">Edit Gauge Type</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
                        <input
                          type="text"
                          value={editingGaugeType.name}
                          onChange={(e) => setEditingGaugeType({...editingGaugeType, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter gauge type name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit</label>
                        <input
                          type="text"
                          value={editingGaugeType.defaultUnit || ""}
                          onChange={(e) => setEditingGaugeType({...editingGaugeType, defaultUnit: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="e.g., °C, PSI, RPM"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <h4 className="font-medium text-gray-700 mb-2">Features</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingGaugeType.hasUnit}
                              onChange={(e) => setEditingGaugeType({...editingGaugeType, hasUnit: e.target.checked})}
                              className="mr-2"
                            />
                            Has Unit
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingGaugeType.hasMinValue}
                              onChange={(e) => setEditingGaugeType({...editingGaugeType, hasMinValue: e.target.checked})}
                              className="mr-2"
                            />
                            Has Min Value
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingGaugeType.hasMaxValue}
                              onChange={(e) => setEditingGaugeType({...editingGaugeType, hasMaxValue: e.target.checked})}
                              className="mr-2"
                            />
                            Has Max Value
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingGaugeType.hasStep}
                              onChange={(e) => setEditingGaugeType({...editingGaugeType, hasStep: e.target.checked})}
                              className="mr-2"
                            />
                            Has Step
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingGaugeType.hasCondition}
                              onChange={(e) => setEditingGaugeType({...editingGaugeType, hasCondition: e.target.checked})}
                              className="mr-2"
                            />
                            Has Condition
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editingGaugeType.hasInstruction}
                              onChange={(e) => setEditingGaugeType({...editingGaugeType, hasInstruction: e.target.checked})}
                              className="mr-2"
                            />
                            Has Instruction
                          </label>
                        </div>
                      </div>
                      <div className="md:col-span-2 flex space-x-2">
                        <button
                          onClick={() => {
                            const { id, ...updateData } = editingGaugeType;
                            updateGaugeTypeMutation.mutate({ id, ...updateData });
                          }}
                          disabled={updateGaugeTypeMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => setEditingGaugeType(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gauge Types List with Manual Ordering */}
                <div className="space-y-3">
                  {gaugeTypes.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No gauge types found. Add your first gauge type above.</p>
                  ) : (
                    gaugeTypes.map((gaugeType, index) => (
                      <div key={gaugeType.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center">
                          <div className="flex flex-col mr-3">
                            <button
                              onClick={() => moveItemUp(index, 'gaugeTypes')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => moveItemDown(index, 'gaugeTypes')}
                              disabled={index === gaugeTypes.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div>
                                  <h3 className="font-medium text-gray-900">{gaugeType.name}</h3>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Features: {[
                                      gaugeType.hasUnit && 'Unit',
                                      gaugeType.hasMinValue && 'Min Value',
                                      gaugeType.hasMaxValue && 'Max Value',
                                      gaugeType.hasStep && 'Step',
                                      gaugeType.hasCondition && 'Condition',
                                      gaugeType.hasInstruction && 'Instruction'
                                    ].filter(Boolean).join(', ')}
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingGaugeType(gaugeType)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${gaugeType.name}"? This will affect all gauges of this type.`)) {
                                      deleteGaugeTypeMutation.mutate(gaugeType.id);
                                    }
                                  }}
                                  disabled={deleteGaugeTypeMutation.isPending}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  {deleteGaugeTypeMutation.isPending ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Manage Gauges Tab */}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gauge Name</label>
                        <input
                          type="text"
                          value={newGauge.name || ""}
                          onChange={(e) => setNewGauge({...newGauge, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter gauge name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gauge Type</label>
                        <select
                          value={newGauge.gaugeTypeId || ""}
                          onChange={(e) => setNewGauge({...newGauge, gaugeTypeId: Number(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select gauge type...</option>
                          {gaugeTypes.map((gaugeType) => (
                            <option key={gaugeType.id} value={gaugeType.id}>
                              {gaugeType.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Dynamic fields based on selected gauge type */}
                      {newGauge.gaugeTypeId && (() => {
                        const selectedGaugeType = gaugeTypes.find(gt => gt.id === newGauge.gaugeTypeId);
                        if (!selectedGaugeType) return null;
                        
                        return (
                          <>
                            {selectedGaugeType.hasUnit && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                <input
                                  type="text"
                                  value={newGauge.unit || selectedGaugeType.defaultUnit || ""}
                                  onChange={(e) => setNewGauge({...newGauge, unit: e.target.value})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder={selectedGaugeType.defaultUnit || "Enter unit"}
                                />
                              </div>
                            )}
                            {selectedGaugeType.hasMinValue && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
                                <input
                                  type="number"
                                  value={newGauge.minValue ?? selectedGaugeType.defaultMinValue ?? ""}
                                  onChange={(e) => setNewGauge({...newGauge, minValue: Number(e.target.value)})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder={String(selectedGaugeType.defaultMinValue || 0)}
                                />
                              </div>
                            )}
                            {selectedGaugeType.hasMaxValue && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
                                <input
                                  type="number"
                                  value={newGauge.maxValue ?? selectedGaugeType.defaultMaxValue ?? ""}
                                  onChange={(e) => setNewGauge({...newGauge, maxValue: Number(e.target.value)})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder={String(selectedGaugeType.defaultMaxValue || 100)}
                                />
                              </div>
                            )}
                            {selectedGaugeType.hasStep && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Step</label>
                                <input
                                  type="number"
                                  value={newGauge.step ?? selectedGaugeType.defaultStep ?? ""}
                                  onChange={(e) => setNewGauge({...newGauge, step: Number(e.target.value)})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder={String(selectedGaugeType.defaultStep || 1)}
                                />
                              </div>
                            )}
                            {selectedGaugeType.hasCondition && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                                <input
                                  type="text"
                                  value={newGauge.condition || ""}
                                  onChange={(e) => setNewGauge({...newGauge, condition: e.target.value})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder="Enter condition"
                                />
                              </div>
                            )}
                            {selectedGaugeType.hasInstruction && (
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
                                <textarea
                                  value={newGauge.instruction || selectedGaugeType.instruction || ""}
                                  onChange={(e) => setNewGauge({...newGauge, instruction: e.target.value})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder={selectedGaugeType.instruction || "Enter instruction"}
                                  rows={2}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
                      <div className="md:col-span-2 flex space-x-2">
                        <button
                          onClick={() => {
                            if (selectedStationId && newGauge.name && newGauge.gaugeTypeId && newGauge.gaugeTypeId > 0) {
                              createGaugeMutation.mutate({ 
                                name: newGauge.name,
                                stationId: selectedStationId,
                                gaugeTypeId: newGauge.gaugeTypeId,
                                unit: newGauge.unit || null,
                                minValue: newGauge.minValue || null,
                                maxValue: newGauge.maxValue || null,
                                step: newGauge.step || null,
                                condition: newGauge.condition || null,
                                instruction: newGauge.instruction || null
                              });
                            }
                          }}
                          disabled={!newGauge.name || !selectedStationId || !newGauge.gaugeTypeId || newGauge.gaugeTypeId === 0 || createGaugeMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowAddGauge(false);
                            setNewGauge({ name: "", gaugeTypeId: 0, stationId: 0, unit: "", minValue: 0, maxValue: 100, step: 1, condition: "", instruction: "" });
                            setSelectedStationId(null);
                          }}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Gauge Form */}
                {editingGauge && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-md bg-blue-50">
                    <h3 className="text-md font-medium mb-4">Edit Gauge</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gauge Name</label>
                        <input
                          type="text"
                          value={editingGauge.name}
                          onChange={(e) => setEditingGauge({...editingGauge, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter gauge name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gauge Type</label>
                        <select
                          value={editingGauge.gaugeTypeId}
                          onChange={(e) => setEditingGauge({...editingGauge, gaugeTypeId: Number(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select gauge type...</option>
                          {gaugeTypes.map((gaugeType) => (
                            <option key={gaugeType.id} value={gaugeType.id}>
                              {gaugeType.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Dynamic fields based on selected gauge type */}
                      {editingGauge.gaugeTypeId && (() => {
                        const selectedGaugeType = gaugeTypes.find(gt => gt.id === editingGauge.gaugeTypeId);
                        if (!selectedGaugeType) return null;
                        
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              {selectedGaugeType.hasUnit && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                  <input
                                    type="text"
                                    value={editingGauge.unit || selectedGaugeType.defaultUnit || ""}
                                    onChange={(e) => setEditingGauge({...editingGauge, unit: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder={selectedGaugeType.defaultUnit || "Enter unit"}
                                  />
                                </div>
                              )}
                              {selectedGaugeType.hasMinValue && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
                                  <input
                                    type="number"
                                    value={editingGauge.minValue ?? selectedGaugeType.defaultMinValue ?? 0}
                                    onChange={(e) => setEditingGauge({...editingGauge, minValue: Number(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  />
                                </div>
                              )}
                              {selectedGaugeType.hasMaxValue && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
                                  <input
                                    type="number"
                                    value={editingGauge.maxValue ?? selectedGaugeType.defaultMaxValue ?? 100}
                                    onChange={(e) => setEditingGauge({...editingGauge, maxValue: Number(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  />
                                </div>
                              )}
                              {selectedGaugeType.hasStep && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Step</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={editingGauge.step ?? selectedGaugeType.defaultStep ?? 1}
                                    onChange={(e) => setEditingGauge({...editingGauge, step: Number(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  />
                                </div>
                              )}
                              {selectedGaugeType.hasCondition && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                                  <select
                                    value={editingGauge.condition || ""}
                                    onChange={(e) => setEditingGauge({...editingGauge, condition: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  >
                                    <option value="">Select condition...</option>
                                    <option value="Good condition">Good condition</option>
                                    <option value="Problem">Problem</option>
                                  </select>
                                </div>
                              )}
                            </div>
                            {selectedGaugeType.hasInstruction && (
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
                                <textarea
                                  value={editingGauge.instruction || selectedGaugeType.instruction || ""}
                                  onChange={(e) => setEditingGauge({...editingGauge, instruction: e.target.value})}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  rows={3}
                                  placeholder={selectedGaugeType.instruction || "Enter instructions for this gauge"}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
                      <div className="md:col-span-2 flex space-x-2">
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
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {updateGaugeMutation.isPending ? "Updating..." : "Update"}
                        </button>
                        <button
                          onClick={() => setEditingGauge(null)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gauges List with Manual Ordering */}
                <div className="space-y-4">
                  {stations.map((station) => {
                    const machine = machines.find(m => m.id === station.machineId);
                    const stationGauges = gauges.filter(g => g.stationId === station.id);
                    
                    return (
                      <div key={station.id} className="border border-gray-200 rounded-md p-4">
                        <h3 className="font-medium text-gray-900 mb-2">
                          {machine?.name || 'Unknown Machine'} → {station.name}
                        </h3>
                        {stationGauges.length > 0 ? (
                          <div className="space-y-3">
                            {stationGauges.map((gauge, index) => (
                              <div key={gauge.id} className="border border-gray-200 rounded-md p-4">
                                <div className="flex items-center">
                                  <div className="flex flex-col mr-3">
                                    <button
                                      onClick={() => {
                                        const gaugeIndex = gauges.findIndex(g => g.id === gauge.id);
                                        moveItemUp(gaugeIndex, 'gauges');
                                      }}
                                      disabled={gauges.findIndex(g => g.id === gauge.id) === 0}
                                      className="text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const gaugeIndex = gauges.findIndex(g => g.id === gauge.id);
                                        moveItemDown(gaugeIndex, 'gauges');
                                      }}
                                      disabled={gauges.findIndex(g => g.id === gauge.id) === gauges.length - 1}
                                      className="text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{gauge.name}</h4>
                                    <p className="text-xs text-gray-600">
                                      Type: {gauge.gaugeType?.name || gaugeTypes.find(gt => gt.id === gauge.gaugeTypeId)?.name || 'Unknown'}
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manage Users Tab */}
            {activeTab === "users" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">Manage Users</h2>
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </button>
                </div>

                {/* Add User Form */}
                {showAddUser && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h3 className="text-md font-medium mb-4">Add New User</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter password"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newUserIsAdmin}
                            onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                            className="mr-2"
                          />
                          Administrator privileges
                        </label>
                      </div>
                      <div className="md:col-span-2 flex space-x-2">
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
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowAddUser(false);
                            setNewUsername("");
                            setNewUserPassword("");
                            setNewUserIsAdmin(false);
                          }}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Users List */}
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No users found. Add your first user above.</p>
                  ) : (
                    users.map((userItem) => (
                      <div key={userItem.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-gray-900">{userItem.username}</h3>
                            <p className="text-sm text-gray-600">
                              Role: {userItem.isAdmin ? 'Administrator' : 'User'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Created: {new Date(userItem.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setResetPasswordUserId(userItem.id)}
                              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUser(userItem)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Machine Status Reset Time Tab */}
            {activeTab === "reset-time" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Machine Status Reset Time</h2>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      This feature allows you to automatically reset all machine statuses to "To Check" at a specified time each day. 
                      This ensures daily maintenance checks are performed consistently.
                    </p>
                  </div>

                  {/* Enable/Disable Feature */}
                  <div className="flex items-center space-x-3">
                    <input
                      id="reset-time-enabled"
                      type="checkbox"
                      checked={resetTimeEnabled}
                      onChange={(e) => setResetTimeEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="reset-time-enabled" className="block text-sm font-medium text-gray-700">
                      Enable automatic machine status reset
                    </label>
                  </div>

                  {/* Time Setting */}
                  <div className={`space-y-3 ${!resetTimeEnabled ? 'opacity-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700">
                      Reset Time (24-hour format)
                    </label>
                    <input
                      type="time"
                      value={resetTime}
                      onChange={(e) => setResetTime(e.target.value)}
                      disabled={!resetTimeEnabled}
                      className="w-48 border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                    />
                    <p className="text-xs text-gray-500">
                      All machines will be reset to "To Check" at this time daily
                    </p>
                  </div>

                  {/* Manual Reset Button */}
                  <div className="border-t pt-6">
                    <h3 className="text-md font-medium text-gray-700 mb-3">Manual Reset</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      You can also manually reset all machine statuses immediately.
                    </p>
                    <button
                      onClick={() => resetMachineStatusMutation.mutate()}
                      disabled={resetMachineStatusMutation.isPending}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetMachineStatusMutation.isPending ? 'Resetting...' : 'Reset All Machines Now'}
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleResetTimeSubmit}
                      disabled={resetTimeLoading || updateSystemSettingMutation.isPending}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetTimeLoading || updateSystemSettingMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Application Settings Tab */}
            {activeTab === "app" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Application Settings</h2>
                <div className="space-y-6">
                  {/* Title Setting */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Application Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter application title"
                    />
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}