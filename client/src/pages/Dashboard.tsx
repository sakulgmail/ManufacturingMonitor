import { useState } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import StatusOverview from "@/components/dashboard/StatusOverview";
import StationsList from "@/components/stations/StationsList";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@/lib/types";

export default function Dashboard() {
  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);

  // Remove duplicate stations by name (keeping only the first occurrence) and sort by name with natural sorting
  const uniqueStations = stations
    .filter((station, index, self) => 
      index === self.findIndex(s => s.name === station.name)
    )
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <>
      <NavigationTabs activeTab="dashboard" />
      
      <StatusOverview 
        stations={uniqueStations} 
        isLoading={isLoading} 
        onStationSelect={setSelectedStationId}
      />
      
      <StationsList 
        stations={uniqueStations} 
        isLoading={isLoading} 
        selectedStationId={selectedStationId} 
      />
    </>
  );
}
