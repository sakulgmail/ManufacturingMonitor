import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Reading } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface GaugeCardProps {
  gauge: Gauge;
  stationId: number;
}

export default function GaugeCard({ gauge, stationId }: GaugeCardProps) {
  // Fetch all readings to find the ones with images
  const { data: allReadings = [] } = useQuery<Reading[]>({
    queryKey: ['/api/readings'],
  });
  
  // Get the latest reading with an image for this specific gauge
  const latestReadingWithImage = useMemo(() => {
    if (!allReadings || !Array.isArray(allReadings)) return null;
    
    // Filter readings for this gauge only
    const gaugeReadings = allReadings.filter(r => r.gaugeId === gauge.id);
    
    // Sort by timestamp (newest first)
    const sortedReadings = [...gaugeReadings].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Find the first reading with an image
    return sortedReadings.find(r => r.imageUrl && r.imageUrl.length > 0);
  }, [allReadings, gauge.id]);
  
  // Determine if current reading is out of range
  const isOutOfRange = useMemo(() => {
    return gauge.currentReading < gauge.minValue || gauge.currentReading > gauge.maxValue;
  }, [gauge.currentReading, gauge.minValue, gauge.maxValue]);
  
  // Get the appropriate icon for each gauge type
  const getGaugeIcon = () => {
    switch (gauge.type) {
      case 'pressure':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        );
      case 'temperature':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
          </svg>
        );
      case 'runtime':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        );
      case 'electrical_power':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
        );
      case 'electrical_current':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        );
    }
  };

  return (
    <div className="gauge-card border rounded-lg overflow-hidden">
      <div className="bg-primary-50 p-3 flex justify-between items-center">
        <div className="flex items-center">
          {getGaugeIcon()}
          <h4 className="font-medium">{gauge.name}</h4>
        </div>
        <div className="text-sm text-gray-600">
          Range: {gauge.minValue}-{gauge.maxValue} {gauge.unit}
        </div>
      </div>
      <div className="p-4">
        {/* Latest Reading Image (if available) */}
        {latestReadingWithImage && latestReadingWithImage.imageUrl && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-600 mb-2">Latest Image ({formatDateTime(latestReadingWithImage.timestamp)})</h5>
            <div className="border rounded-md p-1 bg-gray-50 relative">
              <img 
                src={latestReadingWithImage.imageUrl} 
                alt={`${gauge.name} reading on ${formatDateTime(latestReadingWithImage.timestamp)}`}
                className="w-full h-auto max-h-48 object-contain rounded"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {latestReadingWithImage.value} {gauge.unit}
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <label className="block text-gray-700 font-medium">Current Reading</label>
            <span className={`${isOutOfRange ? 'bg-red-600' : 'bg-green-600'} text-white text-xs font-bold px-2 py-1 rounded`}>
              {isOutOfRange ? 'ALERT' : 'NORMAL'}
            </span>
          </div>
          <div className="flex">
            <div className={`border-2 ${isOutOfRange ? 'border-error-500' : 'border-success-500'} rounded-l p-2 w-full text-lg`}>
              {gauge.currentReading}
            </div>
            <span className={`bg-gray-100 flex items-center px-3 rounded-r border-2 border-l-0 ${isOutOfRange ? 'border-error-500' : 'border-success-500'}`}>
              {gauge.unit}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Last check: <span>{formatDateTime(gauge.lastChecked)}</span>
        </div>
      </div>
    </div>
  );
}