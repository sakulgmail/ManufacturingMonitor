import { useGaugeImage } from '@/hooks/useGaugeImages';
import { Gauge } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface GaugeImagePreviewProps {
  gauge: Gauge;
}

export default function GaugeImagePreview({ gauge }: GaugeImagePreviewProps) {
  // Use our custom hook to get the latest image for this gauge
  const imageData = useGaugeImage(gauge.id);
  
  if (!imageData) {
    return null;
  }
  
  return (
    <div className="mt-4 mb-4 border rounded p-2 bg-gray-50">
      <h5 className="text-sm font-medium text-gray-700 mb-2">
        Latest Photo ({formatDateTime(imageData.timestamp)})
      </h5>
      <div className="relative">
        <img 
          src={imageData.url}
          alt={`${gauge.name} reading`}
          className="w-full h-auto max-h-48 object-contain rounded"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {imageData.value} {gauge.unit}
        </div>
      </div>
    </div>
  );
}