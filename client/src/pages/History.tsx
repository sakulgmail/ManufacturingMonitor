import { useState, useEffect } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery } from "@tanstack/react-query";
import { ReadingWithDetails } from "@shared/schema";
import { formatDateTime } from "@/lib/utils";

interface Station {
  id: number;
  name: string;
  machineId: number;
}

export default function History() {
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedGauge, setSelectedGauge] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Reset gauge selection when station changes
  useEffect(() => {
    setSelectedGauge("all");
  }, [selectedStation]);
  
  const { data: readings = [], isLoading } = useQuery<ReadingWithDetails[]>({
    queryKey: ['/api/readings'],
  });
  
  const { data: stationsData = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  // Sort stations by name (natural sort to handle "1. Control & Safety", "2. Temperature", etc.)
  const stations = stationsData.sort((a: Station, b: Station) => {
    // Extract the number from the start of the name for proper sorting
    const aNum = parseInt(a.name.match(/^\d+/)?.[0] || '0');
    const bNum = parseInt(b.name.match(/^\d+/)?.[0] || '0');
    return aNum - bNum;
  });
  
  // Get unique gauge names based on selected station and sort them
  const getUniqueGaugeNames = () => {
    let gaugeList: string[];
    
    if (selectedStation === "all") {
      gaugeList = readings.map(reading => reading.gaugeName);
    } else {
      gaugeList = readings
        .filter(reading => reading.stationId.toString() === selectedStation)
        .map(reading => reading.gaugeName);
    }
    
    // Get unique values manually
    const uniqueGauges: string[] = [];
    gaugeList.forEach(gauge => {
      if (!uniqueGauges.includes(gauge)) {
        uniqueGauges.push(gauge);
      }
    });
    
    // Sort gauge names by extracting numbers from the beginning
    return uniqueGauges.sort((a, b) => {
      const getNumberFromName = (name: string) => {
        const match = name.match(/^(\d+)\./);
        return match ? parseInt(match[1]) : 999;
      };
      return getNumberFromName(a) - getNumberFromName(b);
    });
  };
  
  const gaugeNames = getUniqueGaugeNames();
  
  // Filter readings based on selection
  const filteredReadings = readings.filter(reading => {
    const stationMatch = selectedStation === "all" || reading.stationId.toString() === selectedStation;
    const gaugeMatch = selectedGauge === "all" || reading.gaugeName === selectedGauge;
    
    // Calculate actual status using the same logic as display
    let isAlert = false;
    
    // Check condition-based gauges
    if (reading.gaugeType?.hasCondition && reading.condition) {
      isAlert = reading.condition === "Bad" || reading.condition === "Problem";
    }
    
    // Check min/max value gauges
    if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
      let isOutOfRange = false;
      
      // Check minimum value if it exists
      if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
        isOutOfRange = isOutOfRange || reading.value < reading.minValue;
      }
      
      // Check maximum value if it exists
      if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
        isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
      }
      
      isAlert = isOutOfRange;
    }
    
    const statusMatch = selectedStatus === "all" 
      || (selectedStatus === "normal" && !isAlert)
      || (selectedStatus === "alert" && isAlert);
    
    return stationMatch && gaugeMatch && statusMatch;
  });
  
  // Sort by newest first
  const sortedReadings = [...filteredReadings].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return (
    <>
      <NavigationTabs activeTab="history" />
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Reading History</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Station
            </label>
            <select 
              className="border border-gray-300 rounded-md p-2 w-full"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
            >
              <option value="all">All Stations</option>
              {stations.map(station => (
                <option key={station.id} value={station.id.toString()}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gauge Type
            </label>
            <select 
              className="border border-gray-300 rounded-md p-2 w-full"
              value={selectedGauge}
              onChange={(e) => setSelectedGauge(e.target.value)}
            >
              <option value="all">All Gauges</option>
              {gaugeNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select 
              className="border border-gray-300 rounded-md p-2 w-full"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="alert">Alert</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gauge</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reading</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedReadings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No readings match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sortedReadings.map((reading) => {
                    // Calculate status based on gauge type
                    let isAlert = false;
                    
                    // Check condition-based gauges
                    if (reading.gaugeType?.hasCondition && reading.condition) {
                      isAlert = reading.condition === "Bad" || reading.condition === "Problem";
                    }
                    
                    // Check min/max value gauges
                    if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
                      let isOutOfRange = false;
                      
                      // Check minimum value if it exists
                      if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
                        isOutOfRange = isOutOfRange || reading.value < reading.minValue;
                      }
                      
                      // Check maximum value if it exists
                      if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
                        isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
                      }
                      
                      isAlert = isOutOfRange;
                    }
                    
                    return (
                      <tr key={reading.id}>
                        <td className="px-6 py-3">{formatDateTime(reading.timestamp)}</td>
                        <td className="px-6 py-3">{reading.stationName}</td>
                        <td className="px-6 py-3">{reading.gaugeName}</td>
                        <td className="px-6 py-3">{reading.value} {reading.unit}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 ${isAlert ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} rounded-full text-xs`}>
                            {isAlert ? 'Alert' : 'Normal'}
                          </span>
                        </td>
                        <td className="px-6 py-3">{reading.username}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
