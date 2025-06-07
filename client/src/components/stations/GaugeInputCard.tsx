import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GaugeWithType, Reading } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import GaugeImagePreview from "./GaugeImagePreview";

interface GaugeInputCardProps {
  gauge: GaugeWithType;
  stationId: number;
}

export default function GaugeInputCard({ gauge, stationId }: GaugeInputCardProps) {
  const [inputValue, setInputValue] = useState<number>(gauge.currentReading);
  const [conditionValue, setConditionValue] = useState<string>(gauge.condition || "");
  
  // Fetch all readings to get latest comment
  const { data: allReadings = [] } = useQuery<Reading[]>({
    queryKey: ['/api/readings'],
  });

  // Get latest comment for this gauge
  const latestComment = useMemo(() => {
    const gaugeReadings = allReadings.filter(r => 
      r.gaugeId === gauge.id && 
      (r as any).comment && 
      (r as any).comment.trim().length > 0
    );
    const sortedReadings = [...gaugeReadings].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return (sortedReadings[0] as any)?.comment || null;
  }, [allReadings, gauge.id]);

  // Determine gauge status based on type and values
  const gaugeStatus = useMemo(() => {
    // For condition-type gauges, use condition value
    if (gauge.gaugeType?.hasCondition) {
      const currentCondition = conditionValue || gauge.condition;
      if (currentCondition === "Good" || currentCondition === "Good condition") {
        return { status: "NORMAL", color: "green" };
      } else if (currentCondition === "Bad" || currentCondition === "Problem") {
        return { status: "ALERT", color: "red" };
      } else if (currentCondition) {
        return { status: "OTHER", color: "gray" };
      }
      return { status: "NOT SET", color: "gray" };
    }
    
    // For min/max value gauges, check if reading is in range
    if (gauge.gaugeType?.hasMinValue || gauge.gaugeType?.hasMaxValue) {
      let isOutOfRange = false;
      
      // Check minimum value if it exists
      if (gauge.gaugeType?.hasMinValue && gauge.minValue != null) {
        isOutOfRange = isOutOfRange || inputValue < gauge.minValue;
      }
      
      // Check maximum value if it exists
      if (gauge.gaugeType?.hasMaxValue && gauge.maxValue != null) {
        isOutOfRange = isOutOfRange || inputValue > gauge.maxValue;
      }
      
      return {
        status: isOutOfRange ? "ALERT" : "NORMAL",
        color: isOutOfRange ? "red" : "green"
      };
    }
    
    return { status: "NORMAL", color: "green" };
  }, [inputValue, conditionValue, gauge.minValue, gauge.maxValue, gauge.condition, gauge.gaugeType]);

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

  // Get the appropriate icon for gauge type
  const getGaugeIcon = () => {
    if (gauge.gaugeType?.name === 'Temperature') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
        </svg>
      );
    } else if (gauge.gaugeType?.name === 'Condition') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      );
    } else {
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
          {gauge.gaugeType?.hasCondition ? (
            <span>Type: Condition Check</span>
          ) : (
            <span>Range: {gauge.minValue}-{gauge.maxValue} {gauge.unit}</span>
          )}
        </div>
      </div>
      <div className="p-4">
        {/* Display the latest image for this gauge using our new component */}
        <GaugeImagePreview gauge={gauge} />
        
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <label className="block text-gray-700 font-medium">Current Reading</label>
            <span className={`${
              gaugeStatus.color === 'red' ? 'bg-red-600' : 
              gaugeStatus.color === 'gray' ? 'bg-gray-600' : 'bg-green-600'
            } text-white text-xs font-bold px-2 py-1 rounded`}>
              {gaugeStatus.status}
            </span>
          </div>
          
          {gauge.gaugeType?.hasCondition ? (
            <div className="flex">
              <select
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                className={`border-2 ${
                  gaugeStatus.color === 'red' ? 'border-red-500' : 
                  gaugeStatus.color === 'gray' ? 'border-gray-500' : 'border-green-500'
                } rounded p-2 w-full text-lg`}
              >
                <option value="">Select condition...</option>
                <option value="Good">Good</option>
                <option value="Bad">Bad</option>
                <option value="Others">Others</option>
              </select>
            </div>
          ) : (
            <div className="flex">
              <input 
                type="number" 
                className={`border-2 ${
                  gaugeStatus.color === 'red' ? 'border-red-500' : 
                  gaugeStatus.color === 'gray' ? 'border-gray-500' : 'border-green-500'
                } rounded-l p-2 w-full text-lg`} 
                value={inputValue} 
                step={(gauge.step !== null) ? gauge.step : 1}
                onChange={(e) => setInputValue(Number(e.target.value))}
              />
              <span className={`bg-gray-100 flex items-center px-3 rounded-r border-2 border-l-0 ${
                gaugeStatus.color === 'red' ? 'border-red-500' : 
                gaugeStatus.color === 'gray' ? 'border-gray-500' : 'border-green-500'
              }`}>
                {gauge.unit}
              </span>
            </div>
          )}
        </div>
        <div className="mb-3">
          <div className="text-sm text-gray-600">
            Last check: <span>{formatDateTime(gauge.lastChecked)}</span>
          </div>
          {latestComment && (
            <div className="text-sm text-gray-600 mt-1">
              Comment: <span className="italic">{latestComment}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
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
