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
    
    return {
      hasAlerts: alertGauges.length > 0,
      alertCount: alertGauges.length
    };
  }, [station]);

  return (
    <div className="station-card bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden" id={`station-${station.id}`}>
      <div 
        className="station-header p-6 cursor-pointer flex justify-between items-center hover:bg-white/50 transition-colors duration-200"
        onClick={onToggleExpand}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 12a5 5 0 0 0-5-5m5 5a5 5 0 0 1-5 5m5-5H3m14-5-3-3m3 3-3 3"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{station.name}</h3>
        </div>
        <div className="flex items-center">
          {stationStatus.hasAlerts ? (
            <span className="flex items-center text-red-600 mr-4 bg-red-50 px-3 py-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span className="font-semibold">{stationStatus.alertCount} {stationStatus.alertCount === 1 ? 'Alert' : 'Alerts'}</span>
            </span>
          ) : (
            <span className="flex items-center text-emerald-600 mr-4 bg-emerald-50 px-3 py-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span className="font-semibold">All Normal</span>
            </span>
          )}
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 text-gray-600 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
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
      </div>
      
      {isExpanded && (
        <div className="station-gauges bg-gradient-to-br from-gray-50/50 to-blue-50/50 p-6 border-t border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {station.gauges.sort((a, b) => {
              // Extract the number from the start of the gauge name for proper sorting
              const getNumberFromName = (name: string) => {
                const match = name.match(/^(\d+)\./);
                return match ? parseInt(match[1]) : 999;
              };
              return getNumberFromName(a.name) - getNumberFromName(b.name);
            }).map((gauge) => (
              <GaugeCard
                key={gauge.id}
                gauge={gauge}
                stationId={station.id}
              />
            ))}
          </div>
          
          {/* Station History */}
          <div className="mt-8 border-t border-white/20 pt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-lg text-gray-900">Recent History</h4>
              </div>
              <button className="text-blue-600 hover:text-blue-700 flex items-center bg-blue-50 px-3 py-2 rounded-lg transition-colors duration-200">
                <span className="font-medium">View All</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
