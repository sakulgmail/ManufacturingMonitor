import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

// Image compression configuration
const COMPRESSION_CONFIG = {
  quality: 85,
  maxWidth: 1600,
  maxHeight: 1600,
  format: 'jpeg' as const,
};

export async function ensureUploadsDirectory() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

async function compressImage(buffer: Buffer): Promise<{ buffer: Buffer; format: string }> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Resize if image is larger than max dimensions
    let resized = image;
    if (metadata.width && metadata.height) {
      if (metadata.width > COMPRESSION_CONFIG.maxWidth || metadata.height > COMPRESSION_CONFIG.maxHeight) {
        resized = image.resize(COMPRESSION_CONFIG.maxWidth, COMPRESSION_CONFIG.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }
    
    // Convert to JPEG with compression
    const compressedBuffer = await resized
      .jpeg({ quality: COMPRESSION_CONFIG.quality })
      .toBuffer();
    
    console.log(`Image compressed: ${buffer.length} bytes -> ${compressedBuffer.length} bytes (${Math.round((1 - compressedBuffer.length / buffer.length) * 100)}% reduction)`);
    
    return {
      buffer: compressedBuffer,
      format: 'jpeg'
    };
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    // Fallback to original if compression fails
    return {
      buffer,
      format: 'original'
    };
  }
}

export async function saveBase64Image(base64Data: string, filename?: string): Promise<string> {
  await ensureUploadsDirectory();
  
  // Extract image format and data from base64 string
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }
  
  const originalImageType = matches[1]; // e.g., 'png', 'jpeg'
  const imageBuffer = Buffer.from(matches[2], 'base64');
  
  // Compress the image
  const { buffer: compressedBuffer, format: compressedFormat } = await compressImage(imageBuffer);
  
  // Use compressed format for filename, or original if compression failed
  const imageType = compressedFormat === 'original' ? originalImageType : compressedFormat;
  
  // Generate unique filename if not provided
  const imageFilename = filename || `${Date.now()}-${Math.random().toString(36).substring(7)}.${imageType}`;
  const filePath = path.join(UPLOADS_DIR, imageFilename);
  
  // Save the compressed file
  await fs.writeFile(filePath, compressedBuffer);
  
  // Return the relative URL path
  return `/uploads/${imageFilename}`;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    return; // Not a file-based image or invalid URL
  }
  
  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOADS_DIR, filename);
  
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
}

export async function imageExists(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    return false;
  }
  
  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOADS_DIR, filename);
  
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
