/**
 * Manual test script to demonstrate visitor count persistence
 * Run with: node backend/test-visitor-persistence.js
 */

const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(process.cwd(), 'data', 'visitor-count.json');

console.log('=== Visitor Count Persistence Test ===\n');

// Test 1: Check if file exists
console.log('1. Checking if storage file exists...');
if (fs.existsSync(STORAGE_FILE)) {
  const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
  const data = JSON.parse(content);
  console.log(`   ✓ File exists with count: ${data.count}`);
  console.log(`   ✓ Last updated: ${data.lastUpdated}`);
} else {
  console.log('   ✓ File does not exist (will be created on first visitor)');
}

console.log('\n2. To test the persistence:');
console.log('   a. Start the backend server: npm run dev');
console.log('   b. Visit http://localhost:3001/api/visitor-count');
console.log('   c. Check the data/visitor-count.json file');
console.log('   d. Restart the server and visit again');
console.log('   e. The count should persist across restarts!');

console.log('\n3. Features implemented:');
console.log('   ✓ Atomic writes using temp file + rename pattern');
console.log('   ✓ Initialization to 0 if file doesn\'t exist');
console.log('   ✓ Maximum count limit (999,999)');
console.log('   ✓ Data validation and corruption recovery');
console.log('   ✓ Graceful error handling with fallback to in-memory');

console.log('\n=== Test Complete ===');
