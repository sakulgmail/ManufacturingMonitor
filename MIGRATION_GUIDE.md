# Image Storage Migration Guide

## Overview

This guide helps you migrate your existing Base64-encoded images to file-based storage. This will dramatically improve performance by reducing database size and speeding up queries.

## Why Migrate?

**Current Problem:**
- 500 readings with Base64 images = 1.2 GB database
- Slow history page loading (4-5 minutes)
- Slow report generation
- High memory usage

**After Migration:**
- Database size reduced to just a few MB
- History loads in seconds
- Reports generate much faster
- Significantly lower memory usage

## Migration Steps for Your Local Windows PC

### Prerequisites

Make sure you have:
1. Node.js installed
2. Your database connection configured (DATABASE_URL environment variable)
3. A backup of your database (recommended)

### Step 1: Backup Your Database (Recommended)

Before running the migration, create a backup of your database:

```bash
# Using pg_dump (if you have PostgreSQL tools installed)
pg_dump your_database_url > backup_before_migration.sql
```

### Step 2: Run the Migration Script

Open PowerShell or Command Prompt in your project directory and run:

```bash
npx tsx scripts/migrate-images-to-files.ts
```

Or if you're using npm scripts:

```bash
npm run migrate:images
```

### Step 3: What the Script Does

The migration script will:

1. ✓ Create an `uploads` directory if it doesn't exist
2. ✓ Find all readings with Base64-encoded images
3. ✓ Convert each Base64 image to a file and save it to `public/uploads/`
4. ✓ Update the database to reference the file path instead of Base64
5. ✓ Show progress for each migrated image

### Step 4: Verify the Migration

After the script completes:

1. **Check the uploads folder**: `public/uploads/` should now contain all your images
2. **Check database size**: Your database should be much smaller
3. **Test the app**: 
   - Load the History page - it should be much faster
   - Generate a report - it should complete quickly
   - View images - they should display correctly

### Example Output

```
=== Image Migration Script ===

This script will convert Base64-encoded images to file-based storage.

✓ Created uploads directory
Found 500 total readings
Found 500 readings with Base64 images to migrate

✓ Migrated reading 1: /uploads/reading-1-1704567890123.png
✓ Migrated reading 2: /uploads/reading-2-1704567890234.jpeg
...
✓ Migrated reading 500: /uploads/reading-500-1704567899999.png

=== Migration Complete ===
Successfully migrated: 500 images
Errors: 0 images

Database size should be significantly reduced.
Your application will now load much faster!

✓ Migration script completed successfully
```

## Troubleshooting

### Problem: "Cannot find module"

**Solution:** Make sure you have all dependencies installed:
```bash
npm install
```

### Problem: "Database connection failed"

**Solution:** Check your DATABASE_URL environment variable:
```bash
# Windows PowerShell
$env:DATABASE_URL
```

### Problem: Migration fails partway through

**Solution:** The script is safe to run multiple times. It will only migrate images that are still in Base64 format. Simply run it again.

### Problem: Images don't display after migration

**Solution:** 
1. Check that the `public/uploads` folder exists and contains images
2. Make sure your server is serving static files from the `public` folder
3. Check browser console for 404 errors

## Performance Improvements

After migration, you should see:

| Metric | Before | After |
|--------|--------|-------|
| Database Size | 1.2 GB | ~5-10 MB |
| History Page Load | 4-5 minutes | 2-5 seconds |
| Report Generation | Very slow | Fast |
| Memory Usage | High | Normal |

## Reverting (If Needed)

If you need to revert the migration:

1. Restore your database backup:
   ```bash
   psql your_database_url < backup_before_migration.sql
   ```

2. Delete the uploads folder:
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force public/uploads
   ```

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your database connection
3. Ensure you have write permissions to the `public` folder
4. Make sure the server is stopped during migration

## Important Notes

- **The migration is one-way**: Base64 images are converted to files and the database is updated
- **New images**: After migration, all new images will automatically be saved as files
- **Backward compatibility**: The system can handle both Base64 (legacy) and file-based images
- **Reports**: Both Excel and PDF reports work with both image formats
