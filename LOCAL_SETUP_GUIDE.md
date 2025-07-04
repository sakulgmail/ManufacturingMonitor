# Local Server Setup Guide

## Issue: History page shows incorrect status on local server

### Problem
The History page shows "Normal" status for "Bad" condition readings on local server, while working correctly on Replit.

### Root Cause
Type definitions and schema synchronization issue between local environment and database changes.

### Solution Steps

1. **Ensure Database Schema is Updated**
   ```bash
   # Run the migration script you already executed
   psql -U your_username -d your_database_name -f migrate_add_condition_column.sql
   ```

2. **Clear Node.js Cache**
   ```bash
   # Delete node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

3. **Clear TypeScript Cache**
   ```bash
   # Clear TypeScript build cache
   rm -rf .tsbuildinfo
   rm -rf dist/
   npx tsc --build --clean
   ```

4. **Restart Development Server**
   ```bash
   # Stop your current server and restart
   npm run dev
   ```

5. **Verify Database Connection**
   ```bash
   # Test your DATABASE_URL connection
   psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'readings';"
   ```

6. **Check Environment Variables**
   Ensure your local `.env` file has the correct DATABASE_URL pointing to your local PostgreSQL instance.

### Additional Troubleshooting

If the issue persists:

1. **Check TypeScript Compilation**
   ```bash
   npx tsc --noEmit
   ```

2. **Verify Schema Changes**
   ```sql
   -- Run this in your local PostgreSQL
   \d readings
   ```

3. **Force Schema Push**
   ```bash
   npm run db:push
   ```

### Expected Behavior After Fix

- Bad condition readings should show "Bad" in Value column and "Alert" in Status column
- Good condition readings should show "Good" in Value column and "Normal" in Status column
- Historical readings should maintain their original status regardless of new entries

### Files Modified in This Fix

- `shared/schema.ts` - Added condition column to readings table
- `client/src/pages/History.tsx` - Updated display logic for condition vs. numerical values
- `client/src/components/stations/DataInputForm.tsx` - Added condition field to reading creation
- `migrate_add_condition_column.sql` - Database migration script