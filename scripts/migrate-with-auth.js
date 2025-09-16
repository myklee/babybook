#!/usr/bin/env node

/**
 * Authenticated Supabase to Cloudflare Migration
 * 
 * This script will authenticate with your Supabase account
 * and export all your personal data for migration to Cloudflare
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Your Supabase credentials
const SUPABASE_URL = 'https://cnkrdfrtjpupycshlwlm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNua3JkZnJ0anB1cHljc2hsd2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjIxOTEsImV4cCI6MjA2NTg5ODE5MX0.UrPX9s41kpq6E1DI9-aWlXGbyHvu4I2e77iwgRaB_5A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

console.log('🚀 Authenticated Supabase to Cloudflare Migration\n');

async function authenticateUser() {
  console.log('To export your data, we need to authenticate with your Supabase account.\n');
  
  const email = await question('Enter your email: ');
  const password = await question('Enter your password: ');
  
  console.log('\n🔐 Authenticating...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });
  
  if (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Authentication successful!');
  console.log(`   User: ${data.user.email}`);
  console.log(`   ID: ${data.user.id}\n`);
  
  return data.user;
}

async function exportUserData(user) {
  const tables = [
    'babies', 
    'feedings',
    'diaper_changes',
    'sleep_sessions',
    'solid_foods',
    'pumping_sessions',
    'baby_settings',
    'user_preferences'
  ];

  const allData = {};
  let totalRecords = 0;

  console.log('📦 Exporting your data from Supabase...\n');

  for (const table of tables) {
    console.log(`   Exporting ${table}...`);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`   ⚠️  Warning: Could not export ${table}:`, error.message);
        allData[table] = [];
      } else {
        allData[table] = data || [];
        totalRecords += data?.length || 0;
        console.log(`   ✅ Exported ${data?.length || 0} records from ${table}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Warning: Could not export ${table}:`, err.message);
      allData[table] = [];
    }
  }

  console.log(`\n📊 Total records exported: ${totalRecords}\n`);

  // Add user data
  allData.users = [{
    id: user.id,
    email: user.email,
    created_at: user.created_at
  }];

  return allData;
}

async function generateCloudflareImportSQL(data, user) {
  console.log('📝 Generating Cloudflare D1 import SQL...');
  
  let sql = `-- Supabase to Cloudflare D1 Migration SQL
-- User: ${user.email}
-- Generated: ${new Date().toISOString()}
-- 
-- Instructions:
-- 1. cd cloudflare-workers
-- 2. wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-user-data.sql
--

BEGIN TRANSACTION;

-- Clear existing data for this user (if any)
DELETE FROM user_preferences WHERE user_id = '${user.id}';
DELETE FROM baby_settings WHERE baby_id IN (SELECT id FROM babies WHERE user_id = '${user.id}');
DELETE FROM pumping_sessions WHERE user_id = '${user.id}';
DELETE FROM solid_foods WHERE user_id = '${user.id}';
DELETE FROM sleep_sessions WHERE user_id = '${user.id}';
DELETE FROM diaper_changes WHERE user_id = '${user.id}';
DELETE FROM feedings WHERE user_id = '${user.id}';
DELETE FROM babies WHERE user_id = '${user.id}';
DELETE FROM users WHERE id = '${user.id}';

`;

  // Import in dependency order
  const importOrder = [
    'users',
    'babies',
    'baby_settings', 
    'feedings',
    'diaper_changes',
    'sleep_sessions',
    'solid_foods',
    'pumping_sessions',
    'user_preferences'
  ];

  for (const table of importOrder) {
    const records = data[table] || [];
    if (records.length === 0) continue;

    sql += `-- Import ${table} (${records.length} records)\n`;
    
    for (const record of records) {
      const columns = Object.keys(record);
      const values = columns.map(col => {
        const val = record[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? '1' : '0';
        if (val instanceof Date) return `'${val.toISOString()}'`;
        return val;
      });

      sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    sql += '\n';
  }

  sql += 'COMMIT;\n\n-- Migration complete!\n';

  return sql;
}

function generateMigrationReport(data, user) {
  let report = `# Personal Data Migration Report

**User**: ${user.email}  
**Generated**: ${new Date().toISOString()}

## Your Data Summary

| Table | Records | Status |
|-------|---------|--------|
`;

  let totalRecords = 0;
  for (const [table, records] of Object.entries(data)) {
    const count = records.length;
    totalRecords += count;
    const status = count > 0 ? '✅ Has Data' : '⚪ Empty';
    report += `| ${table} | ${count} | ${status} |\n`;
  }

  report += `
**Total Records**: ${totalRecords}

## Migration Instructions

### 1. Import Your Data to Cloudflare
\`\`\`bash
cd cloudflare-workers
wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-user-data.sql
\`\`\`

### 2. Verify Import
\`\`\`bash
wrangler d1 execute baby-tracker-db --remote --command="SELECT COUNT(*) as babies FROM babies WHERE user_id = '${user.id}';"
wrangler d1 execute baby-tracker-db --remote --command="SELECT COUNT(*) as feedings FROM feedings WHERE user_id = '${user.id}';"
\`\`\`

### 3. Test Your Cloudflare App
1. Go back to cloudflare-clean branch: \`git checkout cloudflare-clean\`
2. Open: http://localhost:8080/test-clean-app.html
3. Login with: ${user.email}
4. Verify all your data is there!

### 4. Celebrate! 🎉
You've migrated to Cloudflare and will save $35/month ($420/year)!

## What Was Migrated

`;

  // Add details about what was migrated
  for (const [table, records] of Object.entries(data)) {
    if (records.length > 0) {
      report += `### ${table} (${records.length} records)\n`;
      if (table === 'babies') {
        records.forEach(baby => {
          report += `- **${baby.name}** (born ${baby.birthdate})\n`;
        });
      } else if (table === 'feedings') {
        const types = [...new Set(records.map(f => f.type))];
        report += `- Types: ${types.join(', ')}\n`;
        report += `- Date range: ${records[records.length-1]?.timestamp?.split('T')[0]} to ${records[0]?.timestamp?.split('T')[0]}\n`;
      }
      report += '\n';
    }
  }

  report += `## Next Steps

1. **Import the data** using the command above
2. **Test your Cloudflare app** to make sure everything works
3. **Switch to Cloudflare permanently** when ready
4. **Cancel Supabase** to save $35/month

Your Supabase data remains unchanged as a backup!
`;

  return report;
}

async function main() {
  try {
    // Authenticate user
    const user = await authenticateUser();
    
    // Export their data
    const data = await exportUserData(user);
    
    // Create migration directory
    const dataDir = 'migration-data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Save raw data
    fs.writeFileSync(
      path.join(dataDir, 'user-data-export.json'), 
      JSON.stringify(data, null, 2)
    );
    console.log('💾 Your data saved to migration-data/user-data-export.json');

    // Generate SQL import
    const sql = await generateCloudflareImportSQL(data, user);
    fs.writeFileSync(path.join(dataDir, 'import-user-data.sql'), sql);
    console.log('✅ Import SQL saved to migration-data/import-user-data.sql');

    // Generate report
    const report = generateMigrationReport(data, user);
    fs.writeFileSync(path.join(dataDir, 'user-migration-report.md'), report);
    console.log('✅ Migration report saved to migration-data/user-migration-report.md');
    
    console.log('\n🎉 Your data export is complete!\n');
    console.log('📁 Files created:');
    console.log('   - migration-data/user-data-export.json (your raw data)');
    console.log('   - migration-data/import-user-data.sql (Cloudflare import script)');
    console.log('   - migration-data/user-migration-report.md (detailed instructions)');
    
    console.log('\n🚀 Next step:');
    console.log('   cd cloudflare-workers && wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-user-data.sql');
    
    console.log('\n💰 After migration: Save $35/month ($420/year)!');
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    rl.close();
  }
}

main();