import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface Reading {
  id: number;
  timestamp: string;
  stationId: number;
  stationName: string;
  gaugeName: string;
  value: number;
  unit?: string | null;
  condition?: string | null;
  username: string;
  imageUrl?: string | null;
  comment?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  gaugeType?: {
    hasCondition: boolean;
    hasMinValue: boolean;
    hasMaxValue: boolean;
  };
}

interface Machine {
  id: number;
  name: string;
}

interface Station {
  id: number;
  machineId: number;
}

export interface PDFGenerationOptions {
  readings: Reading[];
  machineMap: Map<number, Machine>;
  stationMap: Map<number, Station>;
  includeImages: boolean;
  includeComments: boolean;
}

export async function generatePDFReport(options: PDFGenerationOptions): Promise<Buffer> {
  const { readings, machineMap, stationMap, includeImages, includeComments } = options;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', (error) => {
        reject(error);
      });

      // Add title
      doc.fontSize(20).text('Manufacturing Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Process each reading
      for (const reading of readings) {
        const station = stationMap.get(reading.stationId);
        const machine = station ? machineMap.get(station.machineId) : null;

        let isAlert = false;
        if (reading.gaugeType?.hasCondition) {
          isAlert = reading.value > 0;
        }
        if (reading.gaugeType?.hasMinValue || reading.gaugeType?.hasMaxValue) {
          let isOutOfRange = false;
          if (reading.gaugeType?.hasMinValue && reading.minValue != null) {
            isOutOfRange = isOutOfRange || reading.value < reading.minValue;
          }
          if (reading.gaugeType?.hasMaxValue && reading.maxValue != null) {
            isOutOfRange = isOutOfRange || reading.value > reading.maxValue;
          }
          isAlert = isOutOfRange;
        }

        // Add reading information
        doc.fontSize(14).fillColor('black').text(`Reading #${reading.id}`, { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(10);
        doc.text(`Timestamp: ${new Date(reading.timestamp).toLocaleString()}`);
        doc.text(`Machine: ${machine?.name || 'Unknown'}`);
        doc.text(`Station: ${reading.stationName}`);
        doc.text(`Gauge: ${reading.gaugeName}`);
        doc.text(`Value: ${reading.gaugeType?.hasCondition ? (reading.condition || 'N/A') : reading.value}`);
        doc.text(`Unit: ${reading.unit || ''}`);
        doc.text(`Status: ${isAlert ? 'Alert' : 'Normal'}`);
        doc.text(`User: ${reading.username}`);

        if (includeComments && reading.comment) {
          doc.text(`Comment: ${reading.comment}`);
        }

        // Add image if available
        if (includeImages && reading.imageUrl) {
          try {
            let imageBuffer: Buffer;

            if (reading.imageUrl.startsWith('data:')) {
              // Handle base64 data URI (legacy data)
              const base64Data = reading.imageUrl.split(',')[1];
              imageBuffer = Buffer.from(base64Data, 'base64');
            } else if (reading.imageUrl.startsWith('/uploads/')) {
              // Handle file-based image (new approach)
              const imagePath = path.join(process.cwd(), 'public', reading.imageUrl);

              if (fs.existsSync(imagePath)) {
                imageBuffer = fs.readFileSync(imagePath);
              } else {
                doc.text('Image: [File not found]');
                continue;
              }
            } else {
              doc.text('Image: [Unsupported format]');
              continue;
            }

            doc.moveDown(0.5);
            doc.text('Image:');
            doc.image(imageBuffer, { width: 200, height: 150 });
          } catch (error) {
            console.error('PDF: Error adding image:', error);
            doc.text('Image: [Error loading image]');
          }
        }

        doc.moveDown(1);

        // Add page break if needed (except for last reading)
        if (readings.indexOf(reading) < readings.length - 1) {
          if (doc.y > 600) {
            doc.addPage();
          }
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
