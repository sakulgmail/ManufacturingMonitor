import { useState, useEffect } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import MachineOverview from "@/components/dashboard/MachineOverview";
import StatusOverview from "@/components/dashboard/StatusOverview";
import StationsList from "@/components/stations/StationsList";
import { useQuery } from "@tanstack/react-query";
import { Machine, Station } from "@/lib/types";

export default function Dashboard() {
  const { data: machinesData = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: stationsData = [], isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);

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

  // Apply saved ordering to machines and stations
  const machines = loadSavedOrder(machinesData, 'machineOrder');
  const stations = loadSavedOrder(stationsData, 'stationOrder');

  // Automatically select the first machine when machines data loads
  useEffect(() => {
    if (machines.length > 0 && selectedMachineId === undefined) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machines, selectedMachineId]);

  // Filter stations by selected machine while maintaining custom order
  const filteredStations = stations
    .filter(station => !selectedMachineId || station.machineId === selectedMachineId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <NavigationTabs activeTab="dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Production Dashboard</h1>
          <p className="text-gray-600">Monitor machine status and gauge readings in real-time</p>
        </div>
        
        <MachineOverview 
          machines={machines} 
          isLoading={machinesLoading} 
          onMachineSelect={setSelectedMachineId}
        />
        
        {selectedMachineId && (
          <StatusOverview 
            stations={filteredStations} 
            isLoading={stationsLoading} 
            onStationSelect={setSelectedStationId}
          />
        )}
        
        {selectedMachineId && (
          <StationsList 
            stations={filteredStations} 
            isLoading={stationsLoading} 
            selectedStationId={selectedStationId} 
          />
        )}
      </div>
    </div>
  );
}
