import { useMemo, useState } from "react";
import { Reading } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface ReadingHistoryTableProps {
  readings: Reading[];
}

export default function ReadingHistoryTable({ readings }: ReadingHistoryTableProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Sort readings by timestamp (newest first)
  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => {
      // Safely handle potentially invalid dates
      try {
        const bDate = new Date(b.timestamp);
        const aDate = new Date(a.timestamp);
        return bDate.getTime() - aDate.getTime();
      } catch (e) {
        return 0;
      }
    });
  }, [readings]);

  if (sortedReadings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No readings have been recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gauge</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reading</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedReadings.slice(0, 10).map((reading) => {
            const isOutOfRange = reading.value < reading.minValue || reading.value > reading.maxValue;
            
            return (
              <tr key={reading.id}>
                <td className="px-6 py-3">{formatDateTime(reading.timestamp)}</td>
                <td className="px-6 py-3">{reading.gaugeName}</td>
                <td className="px-6 py-3">{reading.value} {reading.unit}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 ${isOutOfRange ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} rounded-full text-xs`}>
                    {isOutOfRange ? 'Alert' : 'Normal'}
                  </span>
                </td>
                <td className="px-6 py-3">{reading.staffName}</td>
                <td className="px-6 py-3">
                  {reading.imageUrl ? (
                    <button 
                      onClick={() => setSelectedImage(reading.imageUrl || null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Image
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">No image</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="bg-white p-4 rounded-lg max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Gauge Image</h3>
              <button 
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <img 
              src={selectedImage} 
              alt="Gauge reading" 
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
