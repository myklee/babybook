#!/usr/bin/env node

/**
 * Switch to Supabase Configuration
 * 
 * This script switches the app back to use Supabase
 */

import fs from 'fs';

console.log('🔄 Switching to Supabase configuration...\n');

// Check if backup exists
if (!fs.existsSync('.env.supabase.backup')) {
  console.log('❌ .env.supabase.backup file not found');
  console.log('   Cannot restore Supabase configuration');
  process.exit(1);
}

// Restore Supabase config
fs.copyFileSync('.env.supabase.backup', '.env');
console.log('✅ Restored Supabase configuration');

console.log('\n🎯 Next steps:');
console.log('1. Test the app: npm run dev');
console.log('2. If everything works: npm run build');
console.log('3. To switch back: npm run switch-to-cloudflare');

console.log('\n📊 You are now using Supabase (original configuration)');