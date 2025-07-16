import { useState } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery } from "@tanstack/react-query";
import { Machine, Station, Gauge } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // Sort machines by machine number (MACH01, MACH02, etc.)
  const sortedMachines = [...machinesData].sort((a, b) => {
    const getMachineNumber = (name: string) => {
      const match = name.match(/MACH(\d+)/);
      return match ? parseInt(match[1]) : 999;
    };
    return getMachineNumber(a.name) - getMachineNumber(b.name);
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

  // Get gauges from selected station
  const stationGauges = selectedStation?.gauges 
    ? [...selectedStation.gauges].sort((a, b) => {
        const getNumberFromName = (name: string) => {
          const match = name.match(/^(\d+)\./);
          return match ? parseInt(match[1]) : 999;
        };
        return getNumberFromName(a.name) - getNumberFromName(b.name);
      })
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
                      className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300"
                      onClick={() => handleMachineSelect(machine)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                            isRunning 
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                              : 'bg-gradient-to-br from-gray-500 to-gray-600'
                          }`}>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{machine.name}</h3>
                            <p className="text-sm text-gray-600">{machine.machineNo}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Machine Status</span>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isRunning 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {machine.status === 'RUNNING' ? 'Running' : 
                               machine.status === 'STOP' ? 'Stop' :
                               machine.status === 'Require Morning Check' ? 'Require Morning Check' :
                               machine.status === 'Out of Order' ? 'Out of Order' : machine.status}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Gauge Status</span>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 12a5 5 0 0 0-5-5m5 5a5 5 0 0 1-5 5m5-5H3m14-5-3-3m3 3-3 3" />
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
                    className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          status === 'alert' 
                            ? 'bg-gradient-to-br from-red-500 to-red-600' 
                            : 'bg-gradient-to-br from-purple-500 to-pink-600'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
