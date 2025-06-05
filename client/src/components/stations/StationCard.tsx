import { useState, useMemo } from "react";
import GaugeInputCard from "./GaugeInputCard";
import GaugeCard from "./GaugeCard";
import ReadingHistoryTable from "./ReadingHistoryTable";
import { Station, Reading } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface StationCardProps {
  station: Station;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function StationCard({ station, isExpanded, onToggleExpand }: StationCardProps) {
  const { user, isAuthenticated } = useAuth();
  // Fetch station-specific readings directly
  const { data: readings = [] } = useQuery<Reading[]>({
    queryKey: ['/api/readings'],
    enabled: isExpanded,
    select: (data) => {
      // Filter readings to only show ones for this specific station
      return data.filter((reading) => reading.stationId === station.id);
    }
  });

  // Calculate if there are any alerts for this station
  const stationStatus = useMemo(() => {
    const outOfRangeGauges = station.gauges.filter(gauge => {
      const reading = gauge.currentReading;
      const minValue = gauge.minValue ?? 0;
      const maxValue = gauge.maxValue ?? 100;
      return reading < minValue || reading > maxValue;
    });
    
    return {
      hasAlerts: outOfRangeGauges.length > 0,
      alertCount: outOfRangeGauges.length
    };
  }, [station]);

  return (
    <div className="station-card bg-white rounded-lg shadow" id={`station-${station.id}`}>
      <div 
        className="station-header p-4 cursor-pointer flex justify-between items-center"
        onClick={onToggleExpand}
      >
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 12a5 5 0 0 0-5-5m5 5a5 5 0 0 1-5 5m5-5H3m14-5-3-3m3 3-3 3"/>
          </svg>
          <h3 className="text-xl font-semibold">{station.name}</h3>
        </div>
        <div className="flex items-center">
          {stationStatus.hasAlerts ? (
            <span className="flex items-center text-error-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>{stationStatus.alertCount} {stationStatus.alertCount === 1 ? 'Alert' : 'Alerts'}</span>
            </span>
          ) : (
            <span className="flex items-center text-success-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>All Normal</span>
            </span>
          )}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      {isExpanded && (
        <div className="station-gauges p-4 pt-0 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {station.gauges.sort((a, b) => a.id - b.id).map((gauge) => (
              isAuthenticated ? (
                <GaugeInputCard 
                  key={gauge.id} 
                  gauge={gauge} 
                  stationId={station.id} 
                />
              ) : (
                <GaugeCard
                  key={gauge.id}
                  gauge={gauge}
                  stationId={station.id}
                />
              )
            ))}
          </div>
          
          {/* Station History */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg">Recent History</h4>
              <button className="text-primary-600 hover:text-primary-700 flex items-center">
                <span>View All</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            <ReadingHistoryTable readings={readings} />
          </div>
        </div>
      )}
    </div>
  );
}
