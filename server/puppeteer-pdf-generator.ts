import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { pathToFileURL } from 'url';
import sharp from 'sharp';

const PDF_IMAGE_MAX_WIDTH = 800;
const PDF_IMAGE_MAX_HEIGHT = 800;
const PDF_IMAGE_JPEG_QUALITY = 70;

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

async function prepareImageForPdf(
  imageUrl: string,
  outDir: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  if (cache.has(imageUrl)) {
    return cache.get(imageUrl)!;
  }

  try {
    if (imageUrl.startsWith('data:')) {
      cache.set(imageUrl, imageUrl);
      return imageUrl;
    }

    if (!imageUrl.startsWith('/uploads/')) {
      cache.set(imageUrl, null);
      return null;
    }

    const sourcePath = path.join(process.cwd(), 'public', imageUrl);
    if (!fs.existsSync(sourcePath)) {
      cache.set(imageUrl, null);
      return null;
    }

    const outPath = path.join(outDir, `img-${cache.size}.jpg`);
    await sharp(sourcePath)
      .rotate()
      .resize(PDF_IMAGE_MAX_WIDTH, PDF_IMAGE_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: PDF_IMAGE_JPEG_QUALITY, mozjpeg: true })
      .toFile(outPath);

    const fileUrl = pathToFileURL(outPath).href;
    cache.set(imageUrl, fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Error preparing image for PDF:', imageUrl, error);
    cache.set(imageUrl, null);
    return null;
  }
}

function fontFileUrl(fontPath: string): string {
  return pathToFileURL(fontPath).href;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function generateHTML(options: PDFGenerationOptions, imageOutDir: string): Promise<string> {
  const { readings, machineMap, stationMap, includeImages, includeComments } = options;

  const thsarabunRegularUrl = fontFileUrl(path.join(process.cwd(), 'server', 'fonts', 'THSarabun.ttf'));
  const thsarabunBoldUrl = fontFileUrl(path.join(process.cwd(), 'server', 'fonts', 'THSarabunNew.ttf'));

  const imageCache = new Map<string, string | null>();

  const readingBlocks = await Promise.all(readings.map(async reading => {
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

    let imageHTML = '';
    if (includeImages && reading.imageUrl) {
      const fileUrl = await prepareImageForPdf(reading.imageUrl, imageOutDir, imageCache);
      imageHTML = fileUrl
        ? `<div class="image-column"><img src="${fileUrl}" alt="Reading image" /></div>`
        : '<div class="image-column"><p class="error">Image: [Error loading image]</p></div>';
    }

    const commentHTML = includeComments && reading.comment
      ? `<p><strong>Comment:</strong> ${escapeHtml(reading.comment)}</p>`
      : '';

    return `
      <div class="reading">
        <h2>Reading #${reading.id}</h2>
        <div class="reading-content">
          <div class="details-column">
            <p><strong>Timestamp:</strong> ${escapeHtml(new Date(reading.timestamp).toLocaleString())}</p>
            <p><strong>Machine:</strong> ${escapeHtml(machine?.name || 'Unknown')}</p>
            <p><strong>Station:</strong> ${escapeHtml(reading.stationName)}</p>
            <p><strong>Gauge:</strong> ${escapeHtml(reading.gaugeName)}</p>
            <p><strong>Value:</strong> ${escapeHtml(String(displayValue))} ${escapeHtml(reading.unit || '')}</p>
            <p><strong>Status:</strong> <span class="${isAlert ? 'alert' : 'normal'}">${isAlert ? 'Alert' : 'Normal'}</span></p>
            <p><strong>User:</strong> ${escapeHtml(reading.username)}</p>
            ${commentHTML}
          </div>
          ${imageHTML}
        </div>
      </div>
    `;
  }));

  const readingsHTML = readingBlocks.join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @font-face {
          font-family: 'THSarabun';
          src: url('${thsarabunRegularUrl}') format('truetype');
          font-weight: 400;
          font-style: normal;
        }

        @font-face {
          font-family: 'THSarabun';
          src: url('${thsarabunBoldUrl}') format('truetype');
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
          font-size: 17.5px;
          line-height: 1.2;
          color: #333;
          padding: 40px;
        }

        h1 {
          font-size: 30px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 10px;
          color: #1a1a1a;
        }

        .generated-date {
          text-align: center;
          font-size: 15px;
          color: #666;
          margin-bottom: 30px;
        }

        .reading {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }

        .reading h2 {
          font-size: 22.5px;
          font-weight: 700;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }

        .reading-content {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .details-column {
          flex: 1;
          min-width: 0;
        }

        .details-column p {
          margin-bottom: 6px;
          font-size: 16.25px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .details-column strong {
          font-weight: 700;
          color: #1a1a1a;
        }

        .image-column {
          flex-shrink: 0;
          width: 280px;
          text-align: center;
        }

        .image-column img {
          max-width: 100%;
          height: auto;
          max-height: 300px;
          object-fit: contain;
        }

        .alert {
          color: #dc3545;
          font-weight: 700;
        }

        .normal {
          color: #28a745;
          font-weight: 700;
        }

        .error {
          color: #dc3545;
          font-style: italic;
          font-size: 15px;
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
      <h1>Manufacturing Report</h1>
      <p class="generated-date">Generated on: ${escapeHtml(new Date().toLocaleString())}</p>
      ${readingsHTML}
    </body>
    </html>
  `;
}

export async function generatePDFReport(options: PDFGenerationOptions): Promise<Buffer> {
  console.log('Puppeteer: Starting PDF generation...');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-pdf-'));
  const imageOutDir = path.join(tmpDir, 'images');
  fs.mkdirSync(imageOutDir);
  const tmpHtmlPath = path.join(tmpDir, 'report.html');
  const html = await generateHTML(options, imageOutDir);
  fs.writeFileSync(tmpHtmlPath, html, 'utf8');
  const tmpHtmlUrl = pathToFileURL(tmpHtmlPath).href;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--allow-file-access-from-files'
      ]
    });

    const page = await browser.newPage();

    await page.goto(tmpHtmlUrl, {
      waitUntil: 'load',
      timeout: 120000
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
      try {
        await browser.close();
      } catch (closeErr) {
        console.warn('Puppeteer: browser.close warning (non-fatal):', closeErr);
      }
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup; Windows sometimes holds the file briefly
    }
  }
}
