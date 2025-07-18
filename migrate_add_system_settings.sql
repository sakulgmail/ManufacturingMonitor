-- Migration to add system_settings table for machine status reset functionality
-- Run this on your local PostgreSQL database

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default machine reset time setting (disabled by default)
INSERT INTO system_settings (key, value, enabled) 
VALUES ('machine_reset_time', '07:00', false)
ON CONFLICT (key) DO NOTHING;

-- Verify the table was created
SELECT * FROM system_settings;