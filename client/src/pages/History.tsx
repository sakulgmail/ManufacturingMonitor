import { useState } from "react";
import NavigationTabs from "@/components/layout/NavigationTabs";
import { useQuery } from "@tanstack/react-query";
import { Reading } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function History() {
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedGauge, setSelectedGauge] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const { data: readings = [], isLoading } = useQuery<Reading[]>({
    queryKey: ['/api/readings'],
  });
  
  const { data: stationsData = [] } = useQuery({
    queryKey: ['/api/stations'],
  });
  
  // Sort stations in ascending order by ID
  const stations = stationsData.sort((a: any, b: any) => a.id - b.id);
  
  // Get unique gauge names from all readings
  const gaugeNames = [...new Set(readings.map(reading => reading.gaugeName))];
  
  // Filter readings based on selection
  const filteredReadings = readings.filter(reading => {
    const stationMatch = selectedStation === "all" || reading.stationId.toString() === selectedStation;
    const gaugeMatch = selectedGauge === "all" || reading.gaugeName === selectedGauge;
    const inRange = reading.value >= reading.minValue && reading.value <= reading.maxValue;
    const statusMatch = selectedStatus === "all" 
      || (selectedStatus === "normal" && inRange)
      || (selectedStatus === "alert" && !inRange);
    
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
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
                    const isOutOfRange = reading.value < reading.minValue || reading.value > reading.maxValue;
                    
                    return (
                      <tr key={reading.id}>
                        <td className="px-6 py-3">{formatDateTime(reading.timestamp)}</td>
                        <td className="px-6 py-3">{reading.stationName}</td>
                        <td className="px-6 py-3">{reading.gaugeName}</td>
                        <td className="px-6 py-3">{reading.value} {reading.unit}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 ${isOutOfRange ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} rounded-full text-xs`}>
                            {isOutOfRange ? 'Alert' : 'Normal'}
                          </span>
                        </td>
                        <td className="px-6 py-3">{reading.staffName}</td>
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
