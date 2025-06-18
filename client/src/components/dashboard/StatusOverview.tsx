import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Station, Reading } from "@/lib/types";

interface StatusOverviewProps {
  stations: Station[];
  isLoading?: boolean;
  onStationSelect?: (stationId: number) => void;
}

export default function StatusOverview({ stations, isLoading = false, onStationSelect }: StatusOverviewProps) {
  // Fetch all readings to calculate last update times
  const { data: readings = [] } = useQuery<Reading[]>({
    queryKey: ['/api/readings'],
  });

  // Calculate station statuses with last update information
  const stationStatuses = useMemo(() => {
    return stations.map(station => {
      const alertGauges = station.gauges.filter(gauge => {
        // Check condition-type gauges
        if (gauge.gaugeType?.hasCondition && gauge.condition) {
          if (gauge.condition === "Bad" || gauge.condition === "Problem") {
            return true;
          }
        }
        
        // Check min/max value gauges
        if (gauge.gaugeType?.hasMinValue || gauge.gaugeType?.hasMaxValue) {
          let isOutOfRange = false;
          
          // Check minimum value if it exists
          if (gauge.gaugeType?.hasMinValue && gauge.minValue != null) {
            isOutOfRange = isOutOfRange || gauge.currentReading < gauge.minValue;
          }
          
          // Check maximum value if it exists
          if (gauge.gaugeType?.hasMaxValue && gauge.maxValue != null) {
            isOutOfRange = isOutOfRange || gauge.currentReading > gauge.maxValue;
          }
          
          return isOutOfRange;
        }
        
        return false;
      });

      // Calculate last update time for this station
      const stationReadings = readings.filter(reading => reading.stationId === station.id);
      let lastUpdate = null;
      let isWithin24Hours = false;
      let updateStatus = 'unknown'; // 'recent', 'old', 'unknown'

      if (station.gauges.length === 0) {
        // No gauges assigned
        updateStatus = 'unknown';
      } else if (stationReadings.length === 0) {
        // Has gauges but no readings
        updateStatus = 'unknown';
      } else {
        // Find the most recent reading
        const mostRecentReading = stationReadings.reduce((latest, current) => {
          return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
        });
        
        lastUpdate = new Date(mostRecentReading.timestamp);
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Check if ALL gauges in the station have been updated within 24 hours
        const allGaugesUpdated = station.gauges.every(gauge => {
          const gaugeReadings = stationReadings.filter(reading => reading.gaugeId === gauge.id);
          if (gaugeReadings.length === 0) return false;
          
          const latestGaugeReading = gaugeReadings.reduce((latest, current) => {
            return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
          });
          
          return new Date(latestGaugeReading.timestamp) > twentyFourHoursAgo;
        });
        
        isWithin24Hours = allGaugesUpdated;
        updateStatus = isWithin24Hours ? 'recent' : 'old';
      }
      
      return {
        id: station.id,
        name: station.name,
        hasAlerts: alertGauges.length > 0,
        alertCount: alertGauges.length,
        lastUpdate,
        updateStatus
      };
    });
  }, [stations, readings]);

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
          <button 
            key={station.id}
            onClick={() => onStationSelect?.(station.id)}
            className={`${
              station.hasAlerts 
                ? "bg-red-50 border border-error-500 hover:bg-red-100" 
                : "bg-green-50 border border-success-500 hover:bg-green-100"
            } rounded p-3 flex flex-col items-center transition-colors duration-200 hover:shadow-md cursor-pointer`}
          >
            <div className={`${
              station.hasAlerts ? "text-error-700" : "text-success-700"
            } font-semibold text-center`}>
              {station.name}
            </div>
            <div className={`${
              station.hasAlerts ? "text-error-600" : "text-success-600"
            } flex items-center mb-2`}>
              {station.hasAlerts ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span className="text-xs">{station.alertCount} Alert{station.alertCount !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span className="text-xs">All Normal</span>
                </>
              )}
            </div>
            <div className="text-xs text-center">
              <div className="font-medium mb-1">Last update:</div>
              <div className={`${
                station.updateStatus === 'recent' ? 'text-green-600' :
                station.updateStatus === 'old' ? 'text-red-600' :
                'text-red-600'
              }`}>
                {station.updateStatus === 'unknown' ? 'Unknown' :
                 station.lastUpdate ? station.lastUpdate.toLocaleDateString('en-CA') + ' ' + 
                   station.lastUpdate.toLocaleTimeString('en-US', { 
                     hour: '2-digit', 
                     minute: '2-digit', 
                     hour12: false 
                   }) : 'Unknown'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
