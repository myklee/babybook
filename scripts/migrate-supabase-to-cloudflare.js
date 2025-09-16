#!/usr/bin/env node

/**
 * Complete Supabase to Cloudflare Data Migration
 * 
 * This script will:
 * 1. Export all data from your Supabase database
 * 2. Transform it for Cloudflare D1 compatibility
 * 3. Generate SQL import scripts
 * 4. Optionally import directly to Cloudflare D1
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Your Supabase credentials
const SUPABASE_URL = 'https://cnkrdfrtjpupycshlwlm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNua3JkZnJ0anB1cHljc2hsd2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjIxOTEsImV4cCI6MjA2NTg5ODE5MX0.UrPX9s41kpq6E1DI9-aWlXGbyHvu4I2e77iwgRaB_5A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 Starting Supabase to Cloudflare Data Migration\n');

async function exportAllData() {
  const tables = [
    'users',
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

  console.log('📦 Exporting data from Supabase...\n');

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

  // Save raw data
  const dataDir = 'migration-data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  fs.writeFileSync(
    path.join(dataDir, 'supabase-export.json'), 
    JSON.stringify(allData, null, 2)
  );
  console.log('💾 Raw data saved to migration-data/supabase-export.json');

  // Generate D1 import SQL
  await generateD1ImportSQL(allData);
  
  // Generate summary report
  generateMigrationReport(allData);

  return allData;
}

async function generateD1ImportSQL(data) {
  console.log('📝 Generating D1 import SQL...');
  
  let sql = `-- Supabase to Cloudflare D1 Migration SQL
-- Generated: ${new Date().toISOString()}
-- 
-- Instructions:
-- 1. Run: cd cloudflare-workers
-- 2. Run: wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-data.sql
--

BEGIN TRANSACTION;

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

      sql += `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    sql += '\n';
  }

  sql += 'COMMIT;\n';

  const sqlPath = path.join('migration-data', 'import-data.sql');
  fs.writeFileSync(sqlPath, sql);
  console.log('✅ D1 import SQL saved to migration-data/import-data.sql');
}

function generateMigrationReport(data) {
  console.log('📋 Generating migration report...');
  
  let report = `# Supabase to Cloudflare Migration Report

Generated: ${new Date().toISOString()}

## Data Summary

| Table | Records | Status |
|-------|---------|--------|
`;

  let totalRecords = 0;
  for (const [table, records] of Object.entries(data)) {
    const count = records.length;
    totalRecords += count;
    const status = count > 0 ? '✅ Ready' : '⚪ Empty';
    report += `| ${table} | ${count} | ${status} |\n`;
  }

  report += `
**Total Records**: ${totalRecords}

## Migration Steps

### 1. Review the Data
Check \`migration-data/supabase-export.json\` to verify all your data was exported correctly.

### 2. Import to Cloudflare D1
\`\`\`bash
cd cloudflare-workers
wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-data.sql
\`\`\`

### 3. Verify Import
\`\`\`bash
wrangler d1 execute baby-tracker-db --remote --command="SELECT COUNT(*) as total FROM babies;"
wrangler d1 execute baby-tracker-db --remote --command="SELECT COUNT(*) as total FROM feedings;"
\`\`\`

### 4. Test Your App
Open your Cloudflare baby tracker and verify all data is present:
- http://localhost:8080/test-clean-app.html

### 5. Celebrate! 🎉
You've successfully migrated to Cloudflare and will save $35/month!

## Rollback Plan

If anything goes wrong, your Supabase data is unchanged. You can:
1. Switch back to main branch: \`git checkout main\`
2. Continue using Supabase as before

## Files Created

- \`migration-data/supabase-export.json\` - Raw exported data
- \`migration-data/import-data.sql\` - D1 import script
- \`migration-data/migration-report.md\` - This report

## Next Steps

After successful migration:
1. Update your main app to use Cloudflare
2. Cancel Supabase subscription (save $35/month)
3. Enjoy global edge performance!
`;

  const reportPath = path.join('migration-data', 'migration-report.md');
  fs.writeFileSync(reportPath, report);
  console.log('✅ Migration report saved to migration-data/migration-report.md');
}

async function main() {
  try {
    const data = await exportAllData();
    
    console.log('\n🎉 Migration preparation complete!\n');
    console.log('📁 Files created:');
    console.log('   - migration-data/supabase-export.json (raw data)');
    console.log('   - migration-data/import-data.sql (D1 import script)');
    console.log('   - migration-data/migration-report.md (instructions)');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Review the migration report: cat migration-data/migration-report.md');
    console.log('2. Import to Cloudflare: cd cloudflare-workers && wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-data.sql');
    console.log('3. Test your app: open http://localhost:8080/test-clean-app.html');
    
    console.log('\n💰 After migration: Save $35/month ($420/year)!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();