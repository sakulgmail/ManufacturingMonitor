-- Migration to add machine_id column to stations table
-- Run this script on your database before starting the application

-- Add machine_id column to stations table
ALTER TABLE stations ADD COLUMN machine_id INTEGER;

-- Add foreign key constraint
ALTER TABLE stations ADD CONSTRAINT fk_stations_machine_id 
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE;

-- Update existing stations to reference the first machine (if any exists)
-- You may need to adjust this based on your specific data
UPDATE stations SET machine_id = (SELECT id FROM machines LIMIT 1) WHERE machine_id IS NULL;

-- Make machine_id NOT NULL after updating existing records
ALTER TABLE stations ALTER COLUMN machine_id SET NOT NULL;