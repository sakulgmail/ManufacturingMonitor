import { db } from "../server/db";
import { readings } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

async function ensureUploadsDirectory() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    console.log('✓ Created uploads directory');
  }
}

async function saveBase64Image(base64Data: string, readingId: number): Promise<string> {
  // Extract image format and data from base64 string
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }
  
  const imageType = matches[1]; // e.g., 'png', 'jpeg'
  const imageBuffer = Buffer.from(matches[2], 'base64');
  
  // Generate filename using reading ID for uniqueness
  const imageFilename = `reading-${readingId}-${Date.now()}.${imageType}`;
  const filePath = path.join(UPLOADS_DIR, imageFilename);
  
  // Save the file
  await fs.writeFile(filePath, imageBuffer);
  
  // Return the relative URL path
  return `/uploads/${imageFilename}`;
}

async function migrateImages() {
  console.log('=== Image Migration Script ===\n');
  console.log('This script will convert Base64-encoded images to file-based storage.\n');
  
  try {
    // Ensure uploads directory exists
    await ensureUploadsDirectory();
    
    // Get all readings with Base64 images
    const allReadings = await db.select().from(readings);
    const base64Readings = allReadings.filter(r => 
      r.imageUrl && r.imageUrl.startsWith('data:image/')
    );
    
    console.log(`Found ${allReadings.length} total readings`);
    console.log(`Found ${base64Readings.length} readings with Base64 images to migrate\n`);
    
    if (base64Readings.length === 0) {
      console.log('✓ No Base64 images to migrate. All done!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const reading of base64Readings) {
      try {
        // Save Base64 as file
        const newImageUrl = await saveBase64Image(reading.imageUrl!, reading.id);
        
        // Update database record
        await db
          .update(readings)
          .set({ imageUrl: newImageUrl })
          .where(eq(readings.id, reading.id));
        
        successCount++;
        console.log(`✓ Migrated reading ${reading.id}: ${newImageUrl}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating reading ${reading.id}:`, error);
      }
    }
    
    console.log(`\n=== Migration Complete ===`);
    console.log(`Successfully migrated: ${successCount} images`);
    console.log(`Errors: ${errorCount} images`);
    console.log(`\nDatabase size should be significantly reduced.`);
    console.log(`Your application will now load much faster!`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateImages()
  .then(() => {
    console.log('\n✓ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration script failed:', error);
    process.exit(1);
  });
