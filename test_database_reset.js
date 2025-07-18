// Test script to verify database reset functionality locally
// Make sure to update the DATABASE_URL to point to your local PostgreSQL

const { Pool } = require('pg');

async function testDatabaseReset() {
    console.log('Testing database reset functionality...');
    
    // Update this connection string to match your local PostgreSQL
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/your_database'
    });
    
    try {
        // Test 1: Check if system_settings table exists
        console.log('1. Checking system_settings table...');
        const settingsResult = await pool.query('SELECT * FROM system_settings WHERE key = $1', ['machine_reset_time']);
        console.log('✓ System settings table accessible');
        
        // Test 2: Check if machines table exists
        console.log('2. Checking machines table...');
        const machinesResult = await pool.query('SELECT id, name, status FROM machines LIMIT 5');
        console.log('✓ Machines table accessible');
        console.log(`  Found ${machinesResult.rows.length} machines`);
        
        // Test 3: Test reset operation
        console.log('3. Testing machine status reset...');
        const resetResult = await pool.query('UPDATE machines SET status = $1', ['To Check']);
        console.log(`✓ Reset operation successful, affected ${resetResult.rowCount} machines`);
        
        console.log('');
        console.log('✓ All database tests passed!');
        console.log('Your local database is ready for the cron job.');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.log('');
        console.log('Make sure to:');
        console.log('1. Update DATABASE_URL in your .env file');
        console.log('2. Run "npm run db:push" to sync schema');
        console.log('3. Ensure PostgreSQL is running locally');
    } finally {
        await pool.end();
    }
}

testDatabaseReset();