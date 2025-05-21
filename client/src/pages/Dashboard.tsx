import { useState } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import StatusOverview from "@/components/dashboard/StatusOverview";
import QuickJumpNav from "@/components/dashboard/QuickJumpNav";
import StationsList from "@/components/stations/StationsList";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@/lib/types";

export default function Dashboard() {
  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);
  
  const stationIds = stations.map(station => station.id);

  return (
    <>
      <NavigationTabs activeTab="dashboard" />
      
      <StatusOverview stationIds={stationIds} />
      
      <QuickJumpNav onStationSelect={setSelectedStationId} />
      
      <StationsList selectedStationId={selectedStationId} />
    </>
  );
}
