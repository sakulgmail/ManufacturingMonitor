import { useState, useRef } from "react";
import { Station, Gauge, StaffMember, InsertReading } from "@/lib/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Image, Upload } from "lucide-react";

interface DataInputFormProps {
  onClose: () => void;
}

export default function DataInputForm({ onClose }: DataInputFormProps) {
  const { toast } = useToast();
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [readingValue, setReadingValue] = useState<number | string>("");
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gaugeImage, setGaugeImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      staffId: selectedStaffId,
      imageUrl: previewUrl
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
                    Expected range: {selectedGauge.minValue} - {selectedGauge.maxValue} {selectedGauge.unit}
                    {readingValue && (parseFloat(readingValue.toString()) < selectedGauge.minValue || parseFloat(readingValue.toString()) > selectedGauge.maxValue) ? (
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
                  value={selectedGauge.condition || ""}
                  onChange={(e) => {
                    // Update the gauge condition in the UI
                    const updatedGauge = { ...selectedGauge, condition: e.target.value };
                    // You might want to update this in state or handle it differently
                  }}
                  required
                >
                  <option value="">Select condition...</option>
                  <option value="Good condition">Good condition</option>
                  <option value="Problem">Problem</option>
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
            
            {/* Show comment field for gauges with comment field */}
            {selectedGauge.gaugeType.hasComment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Add any additional comments..."
                  defaultValue={selectedGauge.comment || ""}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Staff Selection */}
        <div className="mb-4">
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
        
        {/* Image Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gauge Image (Optional)
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