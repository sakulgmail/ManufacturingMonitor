import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

export async function ensureUploadsDirectory() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export async function saveBase64Image(base64Data: string, filename?: string): Promise<string> {
  await ensureUploadsDirectory();
  
  // Extract image format and data from base64 string
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }
  
  const imageType = matches[1]; // e.g., 'png', 'jpeg'
  const imageBuffer = Buffer.from(matches[2], 'base64');
  
  // Generate unique filename if not provided
  const imageFilename = filename || `${Date.now()}-${Math.random().toString(36).substring(7)}.${imageType}`;
  const filePath = path.join(UPLOADS_DIR, imageFilename);
  
  // Save the file
  await fs.writeFile(filePath, imageBuffer);
  
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
