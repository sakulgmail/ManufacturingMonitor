// Debug script to check what's happening with History page data on local server
// Run this with: node debug_local_history.js

const { Pool } = require('pg');

// You'll need to update this with your local DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/your_database';

async function debugHistoryData() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔍 Debugging History page data...\n');
    
    // Check readings table structure
    console.log('1. Checking readings table columns:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'readings' 
      ORDER BY ordinal_position;
    `);
    console.table(columns.rows);
    
    // Check sample readings data
    console.log('\n2. Sample readings with condition data:');
    const readings = await pool.query(`
      SELECT id, value, condition, timestamp,
             CASE WHEN value > 0 THEN true ELSE false END as calculated_alert
      FROM readings 
      WHERE condition IS NOT NULL 
      ORDER BY timestamp DESC 
      LIMIT 5;
    `);
    console.table(readings.rows);
    
    // Check readings with their gauge types
    console.log('\n3. Readings with gauge type info:');
    const readingsWithTypes = await pool.query(`
      SELECT r.id, r.value, r.condition, gt.name as gauge_type_name, gt.has_condition
      FROM readings r
      JOIN gauges g ON r.gauge_id = g.id
      JOIN gauge_types gt ON g.gauge_type_id = gt.id
      WHERE r.condition IS NOT NULL
      ORDER BY r.timestamp DESC
      LIMIT 5;
    `);
    console.table(readingsWithTypes.rows);
    
    // Check for any readings with problematic data
    console.log('\n4. Checking for data inconsistencies:');
    const inconsistent = await pool.query(`
      SELECT 
        COUNT(*) as total_readings,
        COUNT(CASE WHEN condition IS NULL THEN 1 END) as null_conditions,
        COUNT(CASE WHEN condition = 'Bad' AND value = 0 THEN 1 END) as bad_with_zero_value,
        COUNT(CASE WHEN condition = 'Good' AND value > 0 THEN 1 END) as good_with_nonzero_value
      FROM readings;
    `);
    console.table(inconsistent.rows);
    
    console.log('\n✅ Debug complete. Check the data above for any inconsistencies.');
    
  } catch (error) {
    console.error('❌ Error debugging:', error.message);
  } finally {
    await pool.end();
  }
}

debugHistoryData();