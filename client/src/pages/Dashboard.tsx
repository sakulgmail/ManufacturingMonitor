import { useState } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import StatusOverview from "@/components/dashboard/StatusOverview";
import QuickJumpNav from "@/components/dashboard/QuickJumpNav";
import StationsList from "@/components/stations/StationsList";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@/lib/types";

export default function Dashboard() {
  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);

  // Remove duplicate stations (if any)
  const uniqueStations = stations.filter((station, index, self) => 
    index === self.findIndex(s => s.id === station.id)
  );

  return (
    <>
      <NavigationTabs activeTab="dashboard" />
      
      <StatusOverview stations={uniqueStations} isLoading={isLoading} />
      
      <QuickJumpNav 
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
