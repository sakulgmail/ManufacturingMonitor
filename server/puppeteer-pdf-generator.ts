import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

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

function convertImageToBase64(imageUrl: string): string | null {
  try {
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('/uploads/')) {
      const imagePath = path.join(process.cwd(), 'public', imageUrl);
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

function loadFontAsBase64(fontPath: string): string {
  try {
    const fontBuffer = fs.readFileSync(fontPath);
    return fontBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading font:', error);
    return '';
  }
}

function generateHTML(options: PDFGenerationOptions): string {
  const { readings, machineMap, stationMap, includeImages, includeComments } = options;
  
  const thsarabunRegularBase64 = loadFontAsBase64(path.join(process.cwd(), 'server', 'fonts', 'THSarabun.ttf'));
  const thsarabunBoldBase64 = loadFontAsBase64(path.join(process.cwd(), 'server', 'fonts', 'THSarabunNew.ttf'));
  
  const readingsHTML = readings.map(reading => {
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

    const displayValue = reading.gaugeType?.hasCondition 
      ? (reading.condition || 'N/A') 
      : reading.value;

    const imageHTML = includeImages && reading.imageUrl
      ? (() => {
          const base64Image = convertImageToBase64(reading.imageUrl);
          return base64Image 
            ? `<div class="image-container"><img src="${base64Image}" alt="Reading image" /></div>`
            : '<p class="error">Image: [Error loading image]</p>';
        })()
      : '';

    const commentHTML = includeComments && reading.comment
      ? `<p><strong>ความคิดเห็น:</strong> ${reading.comment}</p>`
      : '';

    return `
      <div class="reading">
        <h2>Reading #${reading.id}</h2>
        <div class="details">
          <p><strong>เวลา:</strong> ${new Date(reading.timestamp).toLocaleString('th-TH')}</p>
          <p><strong>เครื่องจักร:</strong> ${machine?.name || 'Unknown'}</p>
          <p><strong>สถานี:</strong> ${reading.stationName}</p>
          <p><strong>เกจ:</strong> ${reading.gaugeName}</p>
          <p><strong>ค่า:</strong> ${displayValue} ${reading.unit || ''}</p>
          <p><strong>สถานะ:</strong> <span class="${isAlert ? 'alert' : 'normal'}">${isAlert ? 'แจ้งเตือน' : 'ปกติ'}</span></p>
          <p><strong>ผู้บันทึก:</strong> ${reading.username}</p>
          ${commentHTML}
        </div>
        ${imageHTML}
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @font-face {
          font-family: 'THSarabun';
          src: url(data:font/ttf;base64,${thsarabunRegularBase64}) format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        
        @font-face {
          font-family: 'THSarabun';
          src: url(data:font/ttf;base64,${thsarabunBoldBase64}) format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'THSarabun', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          padding: 40px;
        }
        
        h1 {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 10px;
          color: #1a1a1a;
        }
        
        .generated-date {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-bottom: 30px;
        }
        
        .reading {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        
        .reading h2 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        
        .details p {
          margin-bottom: 8px;
          font-size: 13px;
        }
        
        .details strong {
          font-weight: 700;
          color: #1a1a1a;
        }
        
        .alert {
          color: #dc3545;
          font-weight: 700;
        }
        
        .normal {
          color: #28a745;
          font-weight: 700;
        }
        
        .image-container {
          margin-top: 15px;
          text-align: center;
        }
        
        .image-container img {
          max-width: 400px;
          max-height: 300px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .error {
          color: #dc3545;
          font-style: italic;
          font-size: 12px;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          .reading {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <h1>รายงานการตรวจสอบเกจ</h1>
      <p class="generated-date">สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
      ${readingsHTML}
    </body>
    </html>
  `;
}

export async function generatePDFReport(options: PDFGenerationOptions): Promise<Buffer> {
  console.log('Puppeteer: Starting PDF generation...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    const html = generateHTML(options);
    
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    console.log('Puppeteer: PDF generated successfully');
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Puppeteer: Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
