# Windows 11 Local Server Setup Guide

## Issue: History page shows incorrect status on local server

### Problem
The History page shows "Normal" status for "Bad" condition readings on local server, while working correctly on Replit.

### Solution Steps for Windows 11

1. **Ensure Database Schema is Updated**
   ```cmd
   REM Using psql command line (if PostgreSQL is in PATH)
   psql -U your_username -d your_database_name -f migrate_add_condition_column.sql
   
   REM Or using pgAdmin GUI:
   REM 1. Open pgAdmin
   REM 2. Connect to your database
   REM 3. Open Query Tool
   REM 4. Copy and paste the SQL from migrate_add_condition_column.sql
   REM 5. Execute the query
   ```

2. **Clear Node.js Cache**
   ```cmd
   REM Open Command Prompt or PowerShell in your project folder
   
   REM Delete node_modules folder
   rmdir /s node_modules
   
   REM Reinstall dependencies
   npm install
   ```

3. **Clear TypeScript Cache**
   ```cmd
   REM Delete TypeScript build files
   del .tsbuildinfo
   rmdir /s dist
   
   REM Run the fix script
   node fix_local_types.js
   ```

4. **Restart Development Server**
   ```cmd
   REM Stop your current server (Ctrl+C if running)
   REM Then restart
   npm run dev
   ```

5. **Verify Database Connection (Optional)**
   ```cmd
   REM Test your DATABASE_URL connection
   psql "%DATABASE_URL%" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'readings';"
   ```

### Using PowerShell (Recommended)

Open PowerShell as Administrator and run:

```powershell
# Navigate to your project directory
cd "C:\path\to\your\project"

# Clear caches
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item .tsbuildinfo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install

# Run the fix script
node fix_local_types.js

# Restart development server
npm run dev
```

### Using Command Prompt

```cmd
cd C:\path\to\your\project
rmdir /s /q node_modules
del .tsbuildinfo
rmdir /s /q dist
npm install
node fix_local_types.js
npm run dev
```

### Database Migration Using pgAdmin (GUI Method)

1. Open pgAdmin 4
2. Connect to your local PostgreSQL server
3. Navigate to your database
4. Right-click and select "Query Tool"
5. Copy this SQL and paste it:
   ```sql
   -- Add condition column to readings table
   ALTER TABLE readings ADD COLUMN condition TEXT;
   
   -- Update existing readings with default values
   UPDATE readings 
   SET condition = CASE 
       WHEN value > 0 THEN 'Problem'
       ELSE 'Good'
   END
   WHERE condition IS NULL;
   ```
6. Click Execute (F5)

### Environment Variables Check

Make sure your `.env` file (or environment variables) contains:
```
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
```

### Troubleshooting

If you get permission errors:
- Run Command Prompt or PowerShell as Administrator
- Make sure no other processes are using the files

If PostgreSQL commands don't work:
- Add PostgreSQL bin directory to your PATH
- Or use the full path: `"C:\Program Files\PostgreSQL\15\bin\psql.exe"`

### Expected Result

After completing these steps, your local server should match the Replit behavior:
- Bad condition readings show "Bad" in Value column and "Alert" in Status column
- Good condition readings show "Good" in Value column and "Normal" in Status column