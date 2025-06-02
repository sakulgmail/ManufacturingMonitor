-- Initialize database schema and sample data for Manufacturing Monitor

-- Create gauge_types table first (referenced by gauges)
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

-- Create machines table
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    machine_no TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'STOP', 'During Maintenance', 'Out of Order'))
);

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT
);

-- Create gauges table
CREATE TABLE IF NOT EXISTS gauges (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    gauge_type_id INTEGER NOT NULL REFERENCES gauge_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    min_value REAL,
    max_value REAL,
    current_reading REAL NOT NULL DEFAULT 0,
    last_checked TEXT NOT NULL DEFAULT '',
    step REAL,
    condition TEXT,
    instruction TEXT,
    comment TEXT
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- Create readings table
CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    gauge_id INTEGER NOT NULL REFERENCES gauges(id) ON DELETE CASCADE,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL,
    staff_id INTEGER REFERENCES staff(id),
    image_url TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default gauge types
INSERT INTO gauge_types (name, has_unit, has_min_value, has_max_value, has_step, has_condition, has_instruction, has_comment, default_unit, default_min_value, default_max_value, default_step, instruction) VALUES
('Pressure', true, true, true, false, false, false, false, 'PSI', 0, 200, null, null),
('Temperature', true, true, true, false, false, false, false, '°C', -20, 150, null, null),
('Runtime', true, true, true, false, false, false, false, 'hours', 0, 1000, null, null),
('Electrical Power', true, true, true, false, false, false, false, 'kW', 0, 500, null, null),
('Electrical Current', true, true, true, false, false, false, false, 'A', 0, 100, null, null),
('Condition Check', false, false, false, false, true, true, true, null, null, null, null, 'Inspect the component condition and report any issues');

-- Insert sample machines
INSERT INTO machines (name, machine_no, status) VALUES
('Desma1301', 'Machine 1', 'RUNNING'),
('Desma1302', 'Machine 2', 'During Maintenance'),
('Desma1303', 'Machine 3', 'STOP'),
('Desma1304', 'Machine 4', 'Out of Order');

-- Insert sample stations
INSERT INTO stations (machine_id, name, description) VALUES
(1, '1: Assembly Line', 'Main assembly line for product A'),
(1, '2: Quality Control', 'Quality inspection station'),
(2, '1: Injection Molding', 'Primary molding station'),
(2, '2: Cooling Station', 'Product cooling area'),
(3, '1: Packaging Line', 'Final packaging station'),
(4, '1: Maintenance Bay', 'Equipment maintenance area');

-- Insert sample staff
INSERT INTO staff (name) VALUES
('John Smith'),
('Sarah Johnson'),
('Mike Wilson'),
('Lisa Brown');

-- Insert sample gauges
INSERT INTO gauges (station_id, gauge_type_id, name, unit, min_value, max_value, current_reading, last_checked, step, condition, instruction, comment) VALUES
(1, 1, 'Main Line Pressure', 'PSI', 50, 100, 75, '2025-05-31T03:29:31.083Z', 1, null, null, null),
(1, 2, 'Operating Temperature', '°C', 20, 80, 45, '2025-05-31T03:29:31.083Z', 1, null, null, null),
(2, 1, 'QC Pressure', 'PSI', 40, 90, 65, '2025-05-31T03:29:31.083Z', 1, null, null, null),
(3, 2, 'Molding Temperature', '°C', 180, 220, 200, '2025-05-31T03:29:31.083Z', 1, null, null, null),
(4, 2, 'Cooling Temperature', '°C', 15, 25, 20, '2025-05-31T03:29:31.083Z', 1, null, null, null),
(5, 6, 'Package Integrity', '', 0, 100, 0, '', 1, 'Good condition', 'Check for damaged packages', 'All packages appear intact'),
(6, 6, 'Equipment Status', '', 0, 100, 0, '', 1, 'Problem', 'Inspect for wear and damage', 'Needs maintenance attention');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, is_admin) VALUES
('admin', '$2b$10$K7L/K3NQW.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9.9', true);