import { useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import StationCard from "./StationCard";
import { Station } from "@/lib/types";

interface StationsListProps {
  stations: Station[];
  isLoading?: boolean;
  selectedStationId?: number;
}

export default function StationsList({ stations, isLoading = false, selectedStationId }: StationsListProps) {
  
  // Track which stations are expanded
  const [expandedStationIds, setExpandedStationIds] = useState<number[]>([]);
  const stationsRef = useRef<Record<number, HTMLDivElement>>({});

  const handleExpandStation = useCallback((stationId: number) => {
    setExpandedStationIds(prev => {
      if (prev.includes(stationId)) {
        return prev.filter(id => id !== stationId);
      } else {
        return [...prev, stationId];
      }
    });
  }, []);

  // When selectedStationId changes, expand that station and scroll to it
  useEffect(() => {
    if (selectedStationId !== undefined) {
      // Expand the selected station if not already expanded
      if (!expandedStationIds.includes(selectedStationId)) {
        setExpandedStationIds(prev => [...prev, selectedStationId]);
      }
      
      // Scroll to the selected station
      const stationElement = stationsRef.current[selectedStationId];
      if (stationElement) {
        stationElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedStationId, expandedStationIds]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" id="stations-container">
      {stations.map((station) => (
        <div 
          key={station.id} 
          ref={el => {
            if (el) stationsRef.current[station.id] = el;
          }}
        >
          <StationCard
            station={station}
            isExpanded={expandedStationIds.includes(station.id)}
            onToggleExpand={() => handleExpandStation(station.id)}
          />
        </div>
      ))}
    </div>
  );
}
