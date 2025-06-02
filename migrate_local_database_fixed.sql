-- Migration script for local database to add gauge types functionality

-- Create gauge_types table
CREATE TABLE IF NOT EXISTS gauge_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    has_unit BOOLEAN NOT NULL DEFAULT true,
    has_min_value BOOLEAN NOT NULL DEFAULT true,
    has_max_value BOOLEAN NOT NULL DEFAULT true,
    has_step BOOLEAN NOT NULL DEFAULT false,
    has_condition BOOLEAN NOT NULL DEFAULT false,
    has_instruction BOOLEAN NOT NULL DEFAULT false,
    has_comment BOOLEAN NOT NULL DEFAULT false,
    default_unit TEXT,
    default_min_value REAL,
    default_max_value REAL,
    default_step REAL,
    instruction TEXT
);

-- Add gauge_type_id column to gauges table
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS gauge_type_id INTEGER;

-- Add new columns to gauges table
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS instruction TEXT;
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS comment TEXT;

-- Drop the old type column if it exists
ALTER TABLE gauges DROP COLUMN IF EXISTS type;

-- Insert default gauge types
INSERT INTO gauge_types (name, has_unit, has_min_value, has_max_value, has_step, has_condition, has_instruction, has_comment, default_unit, default_min_value, default_max_value, default_step, instruction) VALUES
('Pressure', true, true, true, false, false, false, false, 'PSI', 0, 200, null, null),
('Temperature', true, true, true, false, false, false, false, '°C', -20, 150, null, null),
('Runtime', true, true, true, false, false, false, false, 'hours', 0, 1000, null, null),
('Electrical Power', true, true, true, false, false, false, false, 'kW', 0, 500, null, null),
('Electrical Current', true, true, true, false, false, false, false, 'A', 0, 100, null, null),
('Condition Check', false, false, false, false, true, true, true, null, null, null, null, 'Inspect the component condition and report any issues')
ON CONFLICT (id) DO NOTHING;

-- Update existing gauges to use gauge_type_id (set default to Pressure type)
UPDATE gauges SET gauge_type_id = 1 WHERE gauge_type_id IS NULL;

-- Add foreign key constraint
ALTER TABLE gauges ADD CONSTRAINT fk_gauges_gauge_type_id 
    FOREIGN KEY (gauge_type_id) REFERENCES gauge_types(id);

-- Add missing columns to existing users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Insert default admin user only if it doesn't exist
INSERT INTO users (username, password_hash, is_admin) 
SELECT 'admin', '$2b$10$vI8aWBnW3fID.ZQ4/zo1O.sVOHYDFydLMyzyUYhhkpknpjNElYEWG', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');