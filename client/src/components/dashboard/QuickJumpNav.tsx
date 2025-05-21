import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@/lib/types";

interface QuickJumpNavProps {
  onStationSelect: (stationId: number) => void;
}

export default function QuickJumpNav({ onStationSelect }: QuickJumpNavProps) {
  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const handleQuickJump = useCallback((stationId: number) => {
    onStationSelect(stationId);
  }, [onStationSelect]);

  if (isLoading) {
    return (
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Quick Jump to Station</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="w-28 h-10 bg-gray-100 rounded-md animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-3">Quick Jump to Station</h2>
      <div className="flex flex-wrap gap-2">
        {stations.map((station) => (
          <button 
            key={station.id}
            className="px-3 py-1.5 bg-gray-100 hover:bg-primary-50 rounded-md text-gray-700 hover:text-primary-600 border border-gray-300" 
            onClick={() => handleQuickJump(station.id)}
          >
            {station.name}
          </button>
        ))}
      </div>
    </div>
  );
}
