import { useState, useEffect } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Machine, Station, Gauge } from "@/lib/types";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import DataInputForm from "@/components/stations/DataInputForm";
import { queryClient, apiRequest } from "@/lib/queryClient";

type DrillDownLevel = 'machines' | 'stations' | 'gauges';

export default function Dashboard() {
  const { data: machinesData = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: stationsData = [], isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  const [currentLevel, setCurrentLevel] = useState<DrillDownLevel>('machines');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [readingModalContext, setReadingModalContext] = useState<{
    machineId: number;
    stationId: number;
    gaugeId: number;
  } | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);

  // Sort machines by machine number - try multiple patterns
  const sortedMachines = [...machinesData].sort((a, b) => {
    const getMachineNumber = (machine: Machine) => {
      // First try to extract from machineNo field
      if (machine.machineNo) {
        const machineNoMatch = machine.machineNo.match(/(\d+)/);
        if (machineNoMatch) {
          return parseInt(machineNoMatch[1]);
        }
      }
      
      // Then try various patterns in name field
      const name = machine.name;
      
      // Pattern 1: MACH01, MACH02, etc.
      let match = name.match(/MACH(\d+)/i);
      if (match) return parseInt(match[1]);
      
      // Pattern 2: ACH01, ACH02, etc. (missing M)
      match = name.match(/ACH(\d+)/i);
      if (match) return parseInt(match[1]);
      
      // Pattern 3: Any word followed by numbers
      match = name.match(/[A-Z]*(\d+)/i);
      if (match) return parseInt(match[1]);
      
      // Default: use machine ID as fallback for consistent ordering
      return machine.id;
    };
    
    return getMachineNumber(a) - getMachineNumber(b);
  });

  // Filter and sort stations by selected machine
  const filteredStations = selectedMachine 
    ? stationsData
        .filter(station => station.machineId === selectedMachine.id)
        .sort((a, b) => {
          const getNumberFromName = (name: string) => {
            const match = name.match(/^(\d+)\./);
            return match ? parseInt(match[1]) : 999;
          };
          return getNumberFromName(a.name) - getNumberFromName(b.name);
        })
    : [];

  // Get gauges from selected station - always get fresh data from stationsData
  const stationGauges = selectedStation 
    ? (() => {
        const freshStation = stationsData.find(station => station.id === selectedStation.id);
        return freshStation?.gauges 
          ? [...freshStation.gauges].sort((a, b) => {
              const getNumberFromName = (name: string) => {
                const match = name.match(/^(\d+)\./);
                return match ? parseInt(match[1]) : 999;
              };
              return getNumberFromName(a.name) - getNumberFromName(b.name);
            })
          : [];
      })()
    : [];

  // Navigation handlers
  const handleMachineSelect = (machine: Machine) => {
    setSelectedMachine(machine);
    setSelectedStation(null);
    setSelectedGauge(null);
    setCurrentLevel('stations');
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setSelectedGauge(null);
    setCurrentLevel('gauges');
  };

  const handleBackToMachines = () => {
    setSelectedMachine(null);
    setSelectedStation(null);
    setSelectedGauge(null);
    setCurrentLevel('machines');
  };

  const handleBackToStations = () => {
    setSelectedStation(null);
    setSelectedGauge(null);
    setCurrentLevel('stations');
  };

  // Handle gauge click to open reading modal
  const handleGaugeClick = (gauge: Gauge) => {
    if (selectedMachine && selectedStation) {
      setReadingModalContext({
        machineId: selectedMachine.id,
        stationId: selectedStation.id,
        gaugeId: gauge.id
      });
      setShowReadingModal(true);
    }
  };

  const handleCloseReadingModal = () => {
    setShowReadingModal(false);
    setReadingModalContext(null);
    
    // Force immediate refetch of all data to ensure gauge information is updated
    queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
    queryClient.refetchQueries({ queryKey: ['/api/stations'] });
    queryClient.refetchQueries({ queryKey: ['/api/machines'] });
  };

  const statusOptions = ['RUNNING', 'STOP', 'To Check', 'Out of Order'];

  // Machine status update mutation
  const updateMachineStatusMutation = useMutation({
    mutationFn: async ({ machine, status }: { machine: Machine; status: string }) => {
      const response = await apiRequest('PUT', `/api/machines/${machine.id}`, { 
        name: machine.name,
        machineNo: machine.machineNo,
        status 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.refetchQueries({ queryKey: ['/api/machines'] });
      setStatusDropdownOpen(null);
    },
  });

  const handleStatusChange = (machine: Machine, newStatus: string) => {
    updateMachineStatusMutation.mutate({ machine, status: newStatus });
  };

  const toggleStatusDropdown = (machineId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering machine selection
    setStatusDropdownOpen(statusDropdownOpen === machineId ? null : machineId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setStatusDropdownOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Breadcrumb component
  const Breadcrumb = () => (
    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <span 
        className={`${currentLevel === 'machines' ? 'font-semibold text-blue-600' : 'cursor-pointer hover:text-blue-600'}`}
        onClick={currentLevel !== 'machines' ? handleBackToMachines : undefined}
      >
        Machines
      </span>
      
      {selectedMachine && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span 
            className={`${currentLevel === 'stations' ? 'font-semibold text-blue-600' : 'cursor-pointer hover:text-blue-600'}`}
            onClick={currentLevel === 'gauges' ? handleBackToStations : undefined}
          >
            {selectedMachine.name}
          </span>
        </>
      )}
      
      {selectedStation && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-blue-600">
            {selectedStation.name}
          </span>
        </>
      )}
    </div>
  );

  // Calculate machine status
  const getMachineStatus = (machine: Machine) => {
    const machineStations = stationsData.filter(station => station.machineId === machine.id);
    const alertGauges = machineStations.flatMap(station => 
      station.gauges.filter(gauge => {
        // Check condition-type gauges
        if (gauge.gaugeType?.hasCondition && gauge.condition) {
          return gauge.condition === "Bad" || gauge.condition === "Problem";
        }
        // Check min/max value gauges
        if (gauge.gaugeType?.hasMinValue || gauge.gaugeType?.hasMaxValue) {
          let isOutOfRange = false;
          if (gauge.gaugeType?.hasMinValue && gauge.minValue != null) {
            isOutOfRange = isOutOfRange || gauge.currentReading < gauge.minValue;
          }
          if (gauge.gaugeType?.hasMaxValue && gauge.maxValue != null) {
            isOutOfRange = isOutOfRange || gauge.currentReading > gauge.maxValue;
          }
          return isOutOfRange;
        }
        return false;
      })
    );
    return alertGauges.length > 0 ? 'alert' : 'normal';
  };

  // Calculate station status
  const getStationStatus = (station: Station) => {
    const alertGauges = station.gauges.filter(gauge => {
      if (gauge.gaugeType?.hasCondition && gauge.condition) {
        return gauge.condition === "Bad" || gauge.condition === "Problem";
      }
      if (gauge.gaugeType?.hasMinValue || gauge.gaugeType?.hasMaxValue) {
        let isOutOfRange = false;
        if (gauge.gaugeType?.hasMinValue && gauge.minValue != null) {
          isOutOfRange = isOutOfRange || gauge.currentReading < gauge.minValue;
        }
        if (gauge.gaugeType?.hasMaxValue && gauge.maxValue != null) {
          isOutOfRange = isOutOfRange || gauge.currentReading > gauge.maxValue;
        }
        return isOutOfRange;
      }
      return false;
    });
    return alertGauges.length > 0 ? 'alert' : 'normal';
  };

  // Calculate gauge status
  const getGaugeStatus = (gauge: Gauge) => {
    if (gauge.gaugeType?.hasCondition && gauge.condition) {
      return gauge.condition === "Bad" || gauge.condition === "Problem" ? 'alert' : 'normal';
    }
    if (gauge.gaugeType?.hasMinValue || gauge.gaugeType?.hasMaxValue) {
      let isOutOfRange = false;
      if (gauge.gaugeType?.hasMinValue && gauge.minValue != null) {
        isOutOfRange = isOutOfRange || gauge.currentReading < gauge.minValue;
      }
      if (gauge.gaugeType?.hasMaxValue && gauge.maxValue != null) {
        isOutOfRange = isOutOfRange || gauge.currentReading > gauge.maxValue;
      }
      return isOutOfRange ? 'alert' : 'normal';
    }
    return 'normal';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <NavigationTabs activeTab="dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Production Dashboard</h1>
          <p className="text-gray-600">Monitor machine status and gauge readings in real-time</p>
        </div>
        
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        
        {/* Machine Level */}
        {currentLevel === 'machines' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Machine Overview</h2>
            {machinesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 h-32 animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedMachines.map((machine) => {
                  const gaugeStatus = getMachineStatus(machine);
                  const isRunning = machine.status === 'RUNNING';
                  
                  return (
                    <div 
                      key={machine.id}
                      className={`bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 ${
                        statusDropdownOpen === machine.id ? 'relative z-[101]' : 'relative'
                      }`}
                      onClick={() => handleMachineSelect(machine)}
                    >
                      <div className="flex items-start space-x-6">
                        <div className="flex flex-col items-center space-y-3">
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                            isRunning 
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                              : 'bg-gradient-to-br from-gray-500 to-gray-600'
                          }`}>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900">{machine.name}</h3>
                          </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-6">
                          <div className="flex flex-col items-center">
                            <span className="text-sm text-gray-500 mb-2">Machine Status</span>
                            <div className="relative">
                              <button
                                onClick={(e) => toggleStatusDropdown(machine.id, e)}
                                className={`px-4 py-2 rounded-full text-sm font-medium min-w-[120px] text-center cursor-pointer hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1 ${
                                  isRunning 
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                              >
                                <span>
                                  {machine.status === 'RUNNING' ? 'Running' : 
                                   machine.status === 'STOP' ? 'Stop' :
                                   machine.status === 'To Check' ? 'To Check' :
                                   machine.status === 'Require Morning Check' ? 'To Check' :
                                   machine.status === 'Out of Order' ? 'Out of Order' : machine.status}
                                </span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              
                              {statusDropdownOpen === machine.id && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[100]">
                                  {statusOptions.map((status) => (
                                    <button
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(machine, status);
                                      }}
                                      className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                                        machine.status === status ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                                      }`}
                                    >
                                      {status === 'RUNNING' ? 'Running' : 
                                       status === 'STOP' ? 'Stop' :
                                       status === 'To Check' ? 'To Check' :
                                       status === 'Out of Order' ? 'Out of Order' : status}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-sm text-gray-500 mb-2">Gauge Status</span>
                            <div className={`px-4 py-2 rounded-full text-sm font-medium min-w-[120px] text-center ${
                              gaugeStatus === 'alert' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {gaugeStatus === 'alert' ? 'Alert' : 'Normal'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Station Level */}
        {currentLevel === 'stations' && selectedMachine && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Stations for {selectedMachine.name}</h2>
              <button 
                onClick={handleBackToMachines}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Machines</span>
              </button>
            </div>
            {stationsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 h-32 animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStations.map((station) => {
                  const status = getStationStatus(station);
                  return (
                    <div 
                      key={station.id}
                      className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300"
                      onClick={() => handleStationSelect(station)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            status === 'alert' 
                              ? 'bg-gradient-to-br from-red-500 to-red-600' 
                              : 'bg-gradient-to-br from-teal-500 to-blue-600'
                          }`}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{station.name}</h3>
                            <p className="text-sm text-gray-600">{station.gauges.length} gauges</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          status === 'alert' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {status === 'alert' ? 'Alert' : 'Normal'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Gauge Level */}
        {currentLevel === 'gauges' && selectedStation && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Gauges for {selectedStation.name}</h2>
              <button 
                onClick={handleBackToStations}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Stations</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stationGauges.map((gauge) => {
                const status = getGaugeStatus(gauge);
                return (
                  <div 
                    key={gauge.id}
                    className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    onClick={() => handleGaugeClick(gauge)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          status === 'alert' 
                            ? 'bg-gradient-to-br from-red-500 to-red-600' 
                            : 'bg-gradient-to-br from-purple-500 to-pink-600'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 9-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{gauge.name}</h3>
                          <p className="text-sm text-gray-600">{gauge.gaugeType.name}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status === 'alert' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {status === 'alert' ? 'Alert' : 'Normal'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {gauge.gaugeType.hasCondition && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Condition:</span>
                          <span className={`text-sm font-medium ${
                            gauge.condition === 'Bad' || gauge.condition === 'Problem' 
                              ? 'text-red-600' 
                              : 'text-emerald-600'
                          }`}>
                            {gauge.condition || 'Unknown'}
                          </span>
                        </div>
                      )}
                      
                      {(gauge.gaugeType.hasUnit || gauge.gaugeType.hasMinValue || gauge.gaugeType.hasMaxValue) && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Reading:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {gauge.currentReading} {gauge.unit || ''}
                          </span>
                        </div>
                      )}
                      
                      {gauge.gaugeType.hasMinValue && gauge.minValue != null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Min:</span>
                          <span className="text-sm text-gray-900">{gauge.minValue} {gauge.unit || ''}</span>
                        </div>
                      )}
                      
                      {gauge.gaugeType.hasMaxValue && gauge.maxValue != null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Max:</span>
                          <span className="text-sm text-gray-900">{gauge.maxValue} {gauge.unit || ''}</span>
                        </div>
                      )}
                      
                      {gauge.lastChecked && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Checked:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(gauge.lastChecked).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Click indicator */}
                    <div className="mt-4 flex items-center justify-center">
                      <div className="bg-blue-50 px-3 py-1 rounded-full text-xs text-blue-600 font-medium">
                        Click to Enter Reading
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Reading Entry Modal */}
      {showReadingModal && readingModalContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <DataInputForm 
              onClose={handleCloseReadingModal}
              preSelectedMachineId={readingModalContext.machineId}
              preSelectedStationId={readingModalContext.stationId}
              preSelectedGaugeId={readingModalContext.gaugeId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
