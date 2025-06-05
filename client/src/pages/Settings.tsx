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
  const [newGauge, setNewGauge] = useState<Partial<InsertGauge>>({
    name: "",
    gaugeTypeId: 0,
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

  // Local ordering state for manual arrangement
  const [localMachines, setLocalMachines] = useState<Machine[]>([]);
  const [localStations, setLocalStations] = useState<Station[]>([]);
  const [localGaugeTypes, setLocalGaugeTypes] = useState<GaugeType[]>([]);

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
    if (machinesData.length > 0) {
      const deduplicatedMachines = machinesData
        .filter((machine, index, self) => 
          index === self.findIndex(m => m.id === machine.id)
        );
      const orderedMachines = loadSavedOrder(deduplicatedMachines, 'machineOrder');
      setLocalMachines(orderedMachines);
    }
  }, [machinesData]);

  useEffect(() => {
    if (stationsData.length > 0) {
      const deduplicatedStations = stationsData
        .filter((station, index, self) => 
          index === self.findIndex(s => s.id === station.id)
        );
      const orderedStations = loadSavedOrder(deduplicatedStations, 'stationOrder');
      setLocalStations(orderedStations);
    }
  }, [stationsData]);

  useEffect(() => {
    if (gaugeTypesData.length > 0) {
      const orderedGaugeTypes = loadSavedOrder(gaugeTypesData, 'gaugeTypeOrder');
      setLocalGaugeTypes(orderedGaugeTypes);
    }
  }, [gaugeTypesData]);

  // Use local state for rendering
  const machines = localMachines;
  const stations = localStations;
  const gaugeTypes = localGaugeTypes;

  // Move item up/down handlers
  const moveItemUp = (index: number, type: 'machines' | 'stations' | 'gaugeTypes') => {
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
    }
  };

  const moveItemDown = (index: number, type: 'machines' | 'stations' | 'gaugeTypes') => {
    const maxIndex = type === 'machines' ? machines.length - 1 : 
                   type === 'stations' ? stations.length - 1 : 
                   gaugeTypes.length - 1;
    
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
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: "Success", description: "Station deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete station.", variant: "destructive" });
    }
  });

  // Create gauge type mutation
  const createGaugeTypeMutation = useMutation({
    mutationFn: async (gaugeTypeData: InsertGaugeType) => {
      return apiRequest('POST', '/api/gauge-types/create', gaugeTypeData);
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

  // Update gauge type mutation
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

  // Delete gauge type mutation
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
                          <option value="During Maintenance">During Maintenance</option>
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
                                      <option value="During Maintenance">During Maintenance</option>
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