// Script to fix TypeScript types for local development
// Run this after pulling the latest code and running the database migration

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TypeScript types for local development...');

// 1. Clear TypeScript cache
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
const tsBuildInfo = path.join(__dirname, '.tsbuildinfo');

if (fs.existsSync(tsBuildInfo)) {
  fs.unlinkSync(tsBuildInfo);
  console.log('✅ Cleared TypeScript build cache');
}

// 2. Force regenerate Drizzle types
const drizzlePath = path.join(__dirname, 'drizzle');
if (fs.existsSync(drizzlePath)) {
  fs.rmSync(drizzlePath, { recursive: true, force: true });
  console.log('✅ Cleared Drizzle cache');
}

// 3. Clear node_modules/.cache if it exists
const cacheDir = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Cleared node_modules cache');
}

console.log('🎉 Type fixes applied! Please restart your development server.');
console.log('Run: npm run dev');