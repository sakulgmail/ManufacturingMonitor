// Test script to verify node-cron functionality locally
const cron = require('node-cron');

console.log('Testing node-cron functionality...');

// Test 1: Basic cron task creation
console.log('1. Creating a test cron task...');
const testTask = cron.schedule('*/5 * * * * *', () => {
    console.log('✓ Test cron task executed successfully at:', new Date().toLocaleString());
}, {
    scheduled: false
});

console.log('✓ Test cron task created successfully');

// Test 2: Start the task
console.log('2. Starting the test task (will run every 5 seconds)...');
testTask.start();

console.log('✓ Test task started. Watch for execution messages...');
console.log('   This test will run for 30 seconds, then stop automatically.');

// Test 3: Stop after 30 seconds
setTimeout(() => {
    console.log('3. Stopping test task...');
    testTask.stop();
    console.log('✓ Test completed successfully!');
    console.log('');
    console.log('If you saw execution messages above, node-cron is working correctly.');
    process.exit(0);
}, 30000);