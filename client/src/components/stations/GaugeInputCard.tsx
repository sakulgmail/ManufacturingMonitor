import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Gauge, Reading } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface GaugeInputCardProps {
  gauge: Gauge;
  stationId: number;
}

export default function GaugeInputCard({ gauge, stationId }: GaugeInputCardProps) {
  const [inputValue, setInputValue] = useState<number>(gauge.currentReading);
  
  // Fetch the latest reading with image for this gauge
  const { data: latestReadings = [] } = useQuery<Reading[]>({
    queryKey: ['/api/stations', stationId, 'gauges', gauge.id, 'readings']
  });
  
  // Get the latest reading with an image
  const latestReadingWithImage = useMemo(() => {
    if (!latestReadings || latestReadings.length === 0) return null;
    // Find the most recent reading that has an image
    return latestReadings.find(reading => reading && reading.imageUrl);
  }, [latestReadings]);
  
  const isOutOfRange = useMemo(() => {
    return inputValue < gauge.minValue || inputValue > gauge.maxValue;
  }, [inputValue, gauge.minValue, gauge.maxValue]);

  const { mutate: saveReading, isPending } = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/stations/${stationId}/gauges/${gauge.id}/readings`, {
        value: inputValue,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh station data
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stations', stationId, 'readings'] });
    }
  });

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
            <span className={`${isOutOfRange ? 'text-error-600' : 'text-success-600'} text-sm font-medium`}>
              {isOutOfRange ? 'Out of Range' : 'Within Range'}
            </span>
          </div>
          <div className="flex">
            <input 
              type="number" 
              className={`border-2 ${isOutOfRange ? 'border-error-500' : 'border-success-500'} rounded-l p-2 w-full text-lg`} 
              value={inputValue} 
              min="0"
              step={(gauge.step !== null) ? gauge.step : 1}
              onChange={(e) => setInputValue(Number(e.target.value))}
            />
            <span className={`bg-gray-100 flex items-center px-3 rounded-r border-2 border-l-0 ${isOutOfRange ? 'border-error-500' : 'border-success-500'}`}>
              {gauge.unit}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Last check: <span>{formatDateTime(gauge.lastChecked)}</span>
          </div>
          <button 
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded flex items-center"
            onClick={() => saveReading()}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Reading</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
