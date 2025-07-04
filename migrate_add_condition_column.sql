-- Migration script to add condition column to readings table
-- Run this on your local PostgreSQL database before git pull

-- Add condition column to readings table
ALTER TABLE readings ADD COLUMN condition TEXT;

-- Optional: Update existing readings to have default condition values
-- This is safe to run even if some readings already have condition values
UPDATE readings 
SET condition = CASE 
    WHEN value > 0 THEN 'Problem'
    ELSE 'Good'
END
WHERE condition IS NULL;

-- Verify the change
SELECT COUNT(*) as total_readings, COUNT(condition) as readings_with_condition 
FROM readings;