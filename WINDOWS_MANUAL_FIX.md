# Windows 11 Manual Fix Guide

## Issue: PowerShell execution policy + missing fix script

### Simple Manual Solution

Since PowerShell is restricted and the fix script isn't on your local machine, follow these manual steps:

## Step 1: Fix Database (using pgAdmin)

1. Open **pgAdmin 4**
2. Connect to your local PostgreSQL database
3. Right-click your database → **Query Tool**
4. Copy and paste this SQL:
   ```sql
   ALTER TABLE readings ADD COLUMN condition TEXT;
   
   UPDATE readings 
   SET condition = CASE 
       WHEN value > 0 THEN 'Problem'
       ELSE 'Good'
   END
   WHERE condition IS NULL;
   ```
5. Click **Execute** (F5)

## Step 2: Fix Node.js Types

**Option A: Using File Explorer**
1. Navigate to your project folder: `D:\ManufacturingMonitor`
2. Delete the `node_modules` folder (if it exists)
3. Delete `.tsbuildinfo` file (if it exists)
4. Delete `dist` folder (if it exists)

**Option B: Using Command Prompt (not PowerShell)**
1. Press `Win + R`, type `cmd`, press Enter
2. Navigate to your project:
   ```cmd
   cd D:\ManufacturingMonitor
   ```
3. Clear files:
   ```cmd
   rmdir /s /q node_modules
   del .tsbuildinfo
   rmdir /s /q dist
   ```

## Step 3: Reinstall Dependencies

In Command Prompt (not PowerShell):
```cmd
cd D:\ManufacturingMonitor
npm install
```

## Step 4: Start Development Server

```cmd
npm run dev
```

## Step 5: Test the Fix

1. Open your local web application
2. Login with your credentials
3. Go to Dashboard → Enter a "Bad" condition reading
4. Check History page - it should now show "Bad" in Value column and "Alert" in Status

## Alternative: Enable PowerShell Scripts (Advanced)

If you want to use PowerShell in future, run this as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Expected Result

After these steps, your local server should work exactly like the Replit version:
- Bad condition readings: "Bad" in Value column, "Alert" in Status column
- Good condition readings: "Good" in Value column, "Normal" in Status column