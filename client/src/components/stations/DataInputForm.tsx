import { useState, useRef } from "react";
import { Station, Gauge, StaffMember, InsertReading, Machine } from "@/lib/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Image, Upload } from "lucide-react";

interface DataInputFormProps {
  onClose: () => void;
  preSelectedMachineId?: number;
  preSelectedStationId?: number;
  preSelectedGaugeId?: number;
}

export default function DataInputForm({ 
  onClose, 
  preSelectedMachineId, 
  preSelectedStationId, 
  preSelectedGaugeId 
}: DataInputFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(preSelectedMachineId || null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(preSelectedStationId || null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<number | null>(preSelectedGaugeId || null);
  const [readingValue, setReadingValue] = useState<number | string>("");
  const [condition, setCondition] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gaugeImage, setGaugeImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all machines
  const { data: machinesData = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  // Sort machines by machine number (MACH01, MACH02, etc.)
  const allMachines = [...machinesData].sort((a, b) => {
    const getMachineNumber = (name: string) => {
      const match = name.match(/MACH(\d+)/);
      return match ? parseInt(match[1]) : 999;
    };
    return getMachineNumber(a.name) - getMachineNumber(b.name);
  });

  // Fetch all stations with their gauges
  const { data: allStations = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });
  
  // Filter stations by selected machine
  const filteredStations = selectedMachineId 
    ? allStations.filter((station: Station) => station.machineId === selectedMachineId)
    : [];
  
  // Sort stations in ascending order by the number in station name
  const sortedStations = [...filteredStations].sort((a, b) => {
    const getNumberFromName = (name: string) => {
      const match = name.match(/^(\d+)\./);
      return match ? parseInt(match[1]) : 999;
    };
    return getNumberFromName(a.name) - getNumberFromName(b.name);
  });
  

  
  // Get the selected station
  const selectedStation = selectedStationId 
    ? sortedStations.find((station: Station) => station.id === selectedStationId)
    : null;
    
  // Get gauges from the selected station and sort in ascending order by the number in gauge name
  const stationGauges = selectedStation?.gauges ? [...selectedStation.gauges].sort((a, b) => {
    const getNumberFromName = (name: string) => {
      const match = name.match(/^(\d+)\./);
      return match ? parseInt(match[1]) : 999;
    };
    return getNumberFromName(a.name) - getNumberFromName(b.name);
  }) : [];

  // Handler for machine selection change
  const handleMachineChange = (machineId: number | null) => {
    setSelectedMachineId(machineId);
    setSelectedStationId(null); // Reset station when machine changes
    setSelectedGaugeId(null); // Reset gauge when machine changes
    setReadingValue("");
    setCondition("");
  };

  // Get the selected gauge details
  const selectedGauge = selectedGaugeId 
    ? stationGauges.find((g: Gauge) => g.id === selectedGaugeId) 
    : null;

  // API call to save a new reading
  const saveReadingMutation = useMutation({
    mutationFn: async (reading: Omit<InsertReading, 'userId'>) => {
      // Save the reading with the condition snapshot
      const savedReading = await apiRequest('POST', '/api/readings', reading);
      
      // Update the gauge's current condition to reflect latest status
      if (selectedGauge?.gaugeType.hasCondition && condition) {
        await apiRequest('PUT', `/api/gauges/${selectedGaugeId}`, {
          id: selectedGaugeId,
          stationId: selectedGauge.stationId,
          name: selectedGauge.name,
          gaugeTypeId: selectedGauge.gaugeTypeId,
          unit: selectedGauge.unit,
          minValue: selectedGauge.minValue,
          maxValue: selectedGauge.maxValue,
          step: selectedGauge.step,
          condition: condition,
          instruction: selectedGauge.instruction
        });
      }
      
      return savedReading;
    },
    onSuccess: () => {
      // Invalidate and refetch queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/readings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      
      // Force refetch of critical data for immediate UI updates
      queryClient.refetchQueries({ queryKey: ['/api/stations'] });
      queryClient.refetchQueries({ queryKey: ['/api/machines'] });
      
      // Show success message
      toast({
        title: "Reading Saved",
        description: "The gauge reading has been recorded successfully.",
      });
      
      // Reset form and close modal
      setReadingValue("");
      setCondition("");
      setComment("");
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



  // Handle reading value change
  const handleReadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReadingValue(e.target.value);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG)",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    setGaugeImage(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Trigger file input click
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  // Clear selected image
  const clearImage = () => {
    setGaugeImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMachineId || !selectedStationId || !selectedGaugeId) {
      toast({
        title: "Missing Information",
        description: "Please select a machine, station, and gauge.",
        variant: "destructive",
      });
      return;
    }

    // Check if numeric reading is required (for gauges with unit/min/max values) but not provided
    const requiresNumericReading = selectedGauge?.gaugeType.hasUnit || selectedGauge?.gaugeType.hasMinValue || selectedGauge?.gaugeType.hasMaxValue;
    if (requiresNumericReading && !readingValue) {
      toast({
        title: "Missing Reading Value",
        description: "Please enter a reading value for this gauge.",
        variant: "destructive",
      });
      return;
    }

    // Check if condition is required but not provided
    if (selectedGauge?.gaugeType.hasCondition && !condition) {
      toast({
        title: "Missing Condition",
        description: "Please select a condition for this gauge.",
        variant: "destructive",
      });
      return;
    }

    // Check if gauge image is provided (now mandatory)
    if (!gaugeImage) {
      toast({
        title: "Missing Gauge Image",
        description: "Please upload an image of the gauge reading.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // For condition-based gauges, map condition to numerical value to preserve historical status
    let readingValueToStore: number;
    if (selectedGauge?.gaugeType.hasCondition) {
      // Map condition to number: Good=0 (Normal), Bad/Problem=1 (Alert)
      readingValueToStore = (condition === "Bad" || condition === "Problem") ? 1 : 0;
    } else {
      readingValueToStore = requiresNumericReading ? parseFloat(readingValue.toString()) : 0;
    }
    
    const reading: Omit<InsertReading, 'userId'> = {
      stationId: selectedStationId,
      gaugeId: selectedGaugeId,
      value: readingValueToStore,
      timestamp: new Date().toISOString(),
      imageUrl: previewUrl,
      comment: comment || null,
      condition: selectedGauge?.gaugeType.hasCondition ? condition : null
    };
    
    saveReadingMutation.mutate(reading);
  };

  // For debugging
  console.log("All stations ordered:", sortedStations.map(s => ({ id: s.id, name: s.name })));
  console.log("Selected station:", selectedStation);
  console.log("Station gauges:", stationGauges);

  // Check if we have pre-selected values
  const isPreSelected = !!(preSelectedMachineId && preSelectedStationId && preSelectedGaugeId);
  
  // Get selected machine, station, and gauge names for display
  const selectedMachineName = selectedMachineId ? allMachines.find(m => m.id === selectedMachineId)?.name : '';
  const selectedStationName = selectedStationId ? sortedStations.find(s => s.id === selectedStationId)?.name : '';
  const selectedGaugeName = selectedGaugeId ? stationGauges.find(g => g.id === selectedGaugeId)?.name : '';

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <h2 className="text-xl font-bold mb-4">Enter New Reading</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Machine Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Machine
          </label>
          {isPreSelected ? (
            <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {selectedMachineName}
            </div>
          ) : (
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedMachineId || ""}
              onChange={(e) => handleMachineChange(e.target.value ? parseInt(e.target.value) : null)}
              required
            >
              <option value="">-- Select Machine --</option>
              {allMachines.map((machine: Machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Station Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Station
          </label>
          {isPreSelected ? (
            <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {selectedStationName}
            </div>
          ) : (
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedStationId || ""}
              onChange={handleStationChange}
              required
              disabled={!selectedMachineId}
            >
              <option value="">-- Select Station --</option>
              {sortedStations.map((station: Station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Gauge Selection (only shown if station is selected) */}
        {selectedStationId && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Gauge
            </label>
            {isPreSelected ? (
              <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                {selectedGaugeName}
              </div>
            ) : (
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
            )}
          </div>
        )}
        
        {/* Dynamic fields based on selected gauge type */}
        {selectedGaugeId && selectedGauge && selectedGauge.gaugeType && (
          <div className="mb-4 space-y-4">
            {/* Show numeric input for gauges with unit/min/max values */}
            {(selectedGauge.gaugeType.hasUnit || selectedGauge.gaugeType.hasMinValue || selectedGauge.gaugeType.hasMaxValue) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reading Value {selectedGauge.unit && `(${selectedGauge.unit})`}
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={readingValue}
                    onChange={handleReadingChange}
                    step={selectedGauge.step || 1}
                    required
                  />
                  {selectedGauge.unit && <span className="ml-2 text-gray-500">{selectedGauge.unit}</span>}
                </div>
                {selectedGauge.gaugeType.hasMinValue && selectedGauge.gaugeType.hasMaxValue && (
                  <div className="text-xs text-gray-500 mt-1">
                    Expected range: {selectedGauge.minValue || 0} - {selectedGauge.maxValue || 100} {selectedGauge.unit}
                    {readingValue && (parseFloat(readingValue.toString()) < (selectedGauge.minValue || 0) || parseFloat(readingValue.toString()) > (selectedGauge.maxValue || 100)) ? (
                      <span className="text-red-600 ml-2 font-bold">
                        (ALERT: Current value is outside expected range)
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            
            {/* Show condition dropdown for gauges with condition field */}
            {selectedGauge.gaugeType.hasCondition && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  required
                >
                  <option value="">Select condition...</option>
                  <option value="Good">Good</option>
                  <option value="Bad">Bad</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            )}
            
            {/* Show instruction display for gauges with instruction field */}
            {selectedGauge.gaugeType.hasInstruction && selectedGauge.instruction && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                  {selectedGauge.instruction}
                </div>
              </div>
            )}
            

          </div>
        )}
        

        
        {/* Comment Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comments (Optional)
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md resize-none"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any additional comments about this reading..."
          />
        </div>
        
        {/* Image Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gauge Image <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png"
            onChange={handleFileChange}
          />
          
          {previewUrl ? (
            <div className="relative border rounded-md p-2 bg-gray-50">
              <img 
                src={previewUrl} 
                alt="Gauge preview" 
                className="w-full max-h-48 object-contain mx-auto"
              />
              <button 
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:bg-red-600"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={triggerFileUpload}
              className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Upload className="h-5 w-5 mr-2 text-gray-500" />
              <span>Upload Gauge Picture</span>
            </button>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Attach a photo of the gauge reading (JPEG or PNG, max 5MB)
          </p>
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