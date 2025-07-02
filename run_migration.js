const { Pool } = require('pg');
const fs = require('fs');

// Read your database URL from environment or set it directly
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/factory_monitor';

const pool = new Pool({
  connectionString: DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration...');
    
    // Read the SQL file
    const sql = fs.readFileSync('migrate_local_database_staff_removal.sql', 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('Migration completed successfully!');
    
    // Verify the changes
    const result = await client.query('SELECT COUNT(*) as total_readings FROM readings');
    console.log(`Total readings: ${result.rows[0].total_readings}`);
    
    const userResult = await client.query('SELECT COUNT(*) as readings_with_user_id FROM readings WHERE user_id IS NOT NULL');
    console.log(`Readings with user_id: ${userResult.rows[0].readings_with_user_id}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();