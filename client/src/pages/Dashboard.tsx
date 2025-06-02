import { useState } from "react";
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

  // Filter stations by selected machine and sort by name with natural sorting
  const filteredStations = stations
    .filter(station => !selectedMachineId || station.machineId === selectedMachineId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

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
