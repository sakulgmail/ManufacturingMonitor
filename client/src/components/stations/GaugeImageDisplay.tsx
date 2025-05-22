import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gauge } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface GaugeImageDisplayProps {
  gauge: Gauge;
  stationId: number;
}

export default function GaugeImageDisplay({ gauge, stationId }: GaugeImageDisplayProps) {
  const [latestImage, setLatestImage] = useState<{url: string, timestamp: string, value: number} | null>(null);
  
  // Fetch all readings to find images for this specific gauge
  const { data: readings = [] } = useQuery({
    queryKey: ['/api/readings'],
  });
  
  // Find the latest image for this gauge when readings data changes
  useEffect(() => {
    if (!readings || !Array.isArray(readings) || readings.length === 0) return;
    
    // Find readings for this specific gauge
    const gaugeReadings = readings.filter(r => r.gaugeId === gauge.id);
    
    // Sort by timestamp (newest first)
    const sortedReadings = [...gaugeReadings].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Find the first reading with an image
    const readingWithImage = sortedReadings.find(r => r.imageUrl && r.imageUrl.trim().length > 10);
    
    if (readingWithImage && readingWithImage.imageUrl) {
      setLatestImage({
        url: readingWithImage.imageUrl,
        timestamp: readingWithImage.timestamp,
        value: readingWithImage.value
      });
      console.log("Found image for gauge:", gauge.id, readingWithImage.imageUrl.substring(0, 30) + "...");
    }
  }, [readings, gauge.id]);
  
  if (!latestImage) {
    return null;
  }
  
  return (
    <div className="mt-4 mb-4">
      <h5 className="text-sm font-medium text-gray-600 mb-1">Latest Photo ({formatDateTime(latestImage.timestamp)})</h5>
      <div className="border rounded-md p-1 bg-gray-50 relative">
        <img 
          src={latestImage.url}
          alt={`${gauge.name} reading on ${formatDateTime(latestImage.timestamp)}`}
          className="w-full h-auto max-h-48 object-contain rounded"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {latestImage.value} {gauge.unit}
        </div>
      </div>
    </div>
  );
}