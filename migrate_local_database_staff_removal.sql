-- Migration script to safely remove staff table and update readings table
-- Run this on your local PostgreSQL database before running npm run db:push

BEGIN;

-- Step 1: Add user_id column to readings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'readings' AND column_name = 'user_id') THEN
        ALTER TABLE readings ADD COLUMN user_id INTEGER;
    END IF;
END $$;

-- Step 2: Migrate data from staff_id to user_id if staff_id exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'readings' AND column_name = 'staff_id') THEN
        -- Update user_id based on staff_id mapping
        -- Since we're removing staff, we'll map to existing users
        -- You may need to adjust this mapping based on your actual data
        UPDATE readings 
        SET user_id = CASE 
            WHEN staff_id = 1 THEN (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
            WHEN staff_id = 2 THEN (SELECT id FROM users WHERE username = 'sakult' LIMIT 1)
            ELSE (SELECT id FROM users WHERE is_admin = true LIMIT 1)
        END
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Step 3: Drop foreign key constraint if it exists (try different possible names)
DO $$
BEGIN
    -- Try to drop the constraint with various possible names
    BEGIN
        ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_staff_id_staff_id_fk;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if constraint doesn't exist
    END;
    
    BEGIN
        ALTER TABLE readings DROP CONSTRAINT IF EXISTS readings_staff_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if constraint doesn't exist
    END;
    
    BEGIN
        ALTER TABLE readings DROP CONSTRAINT IF EXISTS fk_readings_staff;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if constraint doesn't exist
    END;
END $$;

-- Step 4: Drop staff_id column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'readings' AND column_name = 'staff_id') THEN
        ALTER TABLE readings DROP COLUMN staff_id;
    END IF;
END $$;

-- Step 5: Drop staff table if it exists
DROP TABLE IF EXISTS staff CASCADE;

-- Step 6: Make user_id NOT NULL if it has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'readings' AND column_name = 'user_id') THEN
        -- Only make NOT NULL if all rows have user_id
        IF NOT EXISTS (SELECT 1 FROM readings WHERE user_id IS NULL) THEN
            ALTER TABLE readings ALTER COLUMN user_id SET NOT NULL;
        END IF;
    END IF;
END $$;

COMMIT;

-- Verify the changes
SELECT 'Migration completed successfully' as status;
SELECT COUNT(*) as total_readings FROM readings;
SELECT COUNT(*) as readings_with_user_id FROM readings WHERE user_id IS NOT NULL;