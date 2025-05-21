import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Station } from "@/lib/types";

interface StatusOverviewProps {
  stationIds: number[];
}

export default function StatusOverview({ stationIds }: StatusOverviewProps) {
  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  // Calculate station statuses
  const stationStatuses = useMemo(() => {
    return stations.map(station => {
      const outOfRangeGauges = station.gauges.filter(gauge => {
        const reading = gauge.currentReading;
        return reading < gauge.minValue || reading > gauge.maxValue;
      });
      return {
        id: station.id,
        name: station.name,
        hasAlerts: outOfRangeGauges.length > 0,
        alertCount: outOfRangeGauges.length
      };
    });
  }, [stations]);

  if (isLoading) {
    return (
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Station Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="bg-gray-100 rounded p-3 h-20 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Station Status Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stationStatuses.map((station) => (
          <div 
            key={station.id}
            className={`${
              station.hasAlerts 
                ? "bg-red-50 border border-error-500" 
                : "bg-green-50 border border-success-500"
            } rounded p-3 flex flex-col items-center`}
          >
            <div className={`${
              station.hasAlerts ? "text-error-700" : "text-success-700"
            } font-semibold`}>
              {station.name}
            </div>
            <div className={`${
              station.hasAlerts ? "text-error-600" : "text-success-600"
            } flex items-center`}>
              {station.hasAlerts ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>{station.alertCount} {station.alertCount === 1 ? 'Alert' : 'Alerts'}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>All Normal</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
