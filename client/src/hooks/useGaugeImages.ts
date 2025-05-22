import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gauge } from '@/lib/types';

/**
 * Custom hook to get the latest image for a specific gauge
 */
export function useGaugeImage(gaugeId: number) {
  const [imageData, setImageData] = useState<{ url: string; timestamp: string; value: number } | null>(null);
  
  // Fetch all readings
  const { data: readings = [] } = useQuery({
    queryKey: ['/api/readings'],
  });
  
  useEffect(() => {
    if (!readings || !Array.isArray(readings)) return;
    
    // Filter readings for this gauge and find those with images
    const gaugeReadings = readings.filter(reading => 
      reading.gaugeId === gaugeId && 
      reading.imageUrl && 
      reading.imageUrl.length > 0
    );
    
    if (gaugeReadings.length === 0) return;
    
    // Sort by timestamp (newest first)
    const sortedReadings = [...gaugeReadings].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Get the most recent reading with an image
    const latestReading = sortedReadings[0];
    
    if (latestReading && latestReading.imageUrl) {
      setImageData({
        url: latestReading.imageUrl,
        timestamp: latestReading.timestamp,
        value: latestReading.value
      });
      
      console.log(`Found image for gauge ${gaugeId}`);
    }
  }, [readings, gaugeId]);
  
  return imageData;
}