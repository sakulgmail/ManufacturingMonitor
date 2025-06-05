import { useState, useEffect } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import MachineOverview from "@/components/dashboard/MachineOverview";
import StatusOverview from "@/components/dashboard/StatusOverview";
import StationsList from "@/components/stations/StationsList";
import { useQuery } from "@tanstack/react-query";
import { Machine, Station } from "@/lib/types";

export default function Dashboard() {
  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: stations = [], isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);

  // Automatically select the first machine when machines data loads
  useEffect(() => {
    if (machines.length > 0 && selectedMachineId === undefined) {
      // Sort machines by ID ascending and select the first one
      const sortedMachines = machines.sort((a, b) => a.id - b.id);
      setSelectedMachineId(sortedMachines[0].id);
    }
  }, [machines, selectedMachineId]);

  // Filter stations by selected machine and sort by ID in ascending order
  const filteredStations = stations
    .filter(station => !selectedMachineId || station.machineId === selectedMachineId)
    .sort((a, b) => a.id - b.id);

  return (
    <>
      <NavigationTabs activeTab="dashboard" />
      
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
    </>
  );
}
