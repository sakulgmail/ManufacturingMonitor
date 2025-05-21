import { useState } from "react";
import { Station, Gauge, StaffMember, InsertReading } from "@/lib/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DataInputFormProps {
  onClose: () => void;
}

export default function DataInputForm({ onClose }: DataInputFormProps) {
  const { toast } = useToast();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [readingValue, setReadingValue] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all stations
  const { data: allStations = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  // Filter out duplicate stations by name
  const uniqueStations = allStations.filter((station: Station, index: number, self: Station[]) => 
    index === self.findIndex((s: Station) => s.name === station.name)
  );
  
  // Fetch all staff members
  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff'],
  });
  
  // Get the selected station
  const selectedStation = selectedStationId 
    ? allStations.find((station: Station) => station.id === selectedStationId)
    : null;
    
  // Get gauges from the selected station
  const stationGauges = selectedStation?.gauges || [];

  // Get the selected gauge details
  const selectedGauge = selectedGaugeId 
    ? stationGauges.find((g: Gauge) => g.id === selectedGaugeId) 
    : null;

  // API call to save a new reading
  const saveReadingMutation = useMutation({
    mutationFn: async (reading: InsertReading) => {
      return apiRequest('POST', '/api/readings', reading);
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
      
      // Show success message
      toast({
        title: "Reading Saved",
        description: "The gauge reading has been recorded successfully.",
      });
      
      // Reset form and close modal
      setReadingValue("");
      setSelectedGaugeId(null);
      setIsSubmitting(false);
      onClose();
    },
    onError: (error) => {
      // Show error message
      toast({
        title: "Error",
        description: "Failed to save the reading. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Handle station selection
  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stationId = parseInt(e.target.value);
    setSelectedStationId(stationId);
    setSelectedGaugeId(null); // Reset gauge when station changes
  };

  // Handle gauge selection
  const handleGaugeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gaugeId = parseInt(e.target.value);
    setSelectedGaugeId(gaugeId);
    
    // Auto-fill with current reading if available
    const gauge = stationGauges.find((g: Gauge) => g.id === gaugeId);
    if (gauge) {
      setReadingValue(gauge.currentReading);
    } else {
      setReadingValue("");
    }
  };

  // Handle staff selection
  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staffId = parseInt(e.target.value);
    setSelectedStaffId(staffId);
  };

  // Handle reading value change
  const handleReadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReadingValue(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStationId || !selectedGaugeId || !readingValue) {
      toast({
        title: "Missing Information",
        description: "Please select a station, gauge, and enter a reading value.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const reading: InsertReading = {
      stationId: selectedStationId,
      gaugeId: selectedGaugeId,
      value: parseFloat(readingValue.toString()),
      timestamp: new Date().toISOString(),
      staffId: selectedStaffId
    };
    
    saveReadingMutation.mutate(reading);
  };

  // For debugging
  console.log("Selected station:", selectedStation);
  console.log("Station gauges:", stationGauges);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <h2 className="text-xl font-bold mb-4">Enter New Reading</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Station Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Station
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedStationId || ""}
            onChange={handleStationChange}
            required
          >
            <option value="">-- Select Station --</option>
            {uniqueStations.map((station: Station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Gauge Selection (only shown if station is selected) */}
        {selectedStationId && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Gauge
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedGaugeId || ""}
              onChange={handleGaugeChange}
              required
            >
              <option value="">-- Select Gauge --</option>
              {stationGauges && stationGauges.length > 0 ? (
                stationGauges.map((gauge: Gauge) => (
                  <option key={gauge.id} value={gauge.id}>
                    {gauge.name} ({gauge.unit})
                  </option>
                ))
              ) : (
                <option disabled>No gauges available for this station</option>
              )}
            </select>
          </div>
        )}
        
        {/* Reading Value (only shown if gauge is selected) */}
        {selectedGaugeId && selectedGauge && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reading Value ({selectedGauge.unit})
            </label>
            <div className="flex items-center">
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={readingValue}
                onChange={handleReadingChange}
                min={selectedGauge.minValue}
                max={selectedGauge.maxValue}
                step={selectedGauge.step || 1}
                required
              />
              <span className="ml-2 text-gray-500">{selectedGauge.unit}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Valid range: {selectedGauge.minValue} - {selectedGauge.maxValue} {selectedGauge.unit}
            </div>
          </div>
        )}
        
        {/* Staff Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Staff Member (Optional)
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedStaffId || ""}
            onChange={handleStaffChange}
          >
            <option value="">-- Select Staff Member --</option>
            {staffMembers.map((staff: StaffMember) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Reading"}
          </button>
        </div>
      </form>
    </div>
  );
}