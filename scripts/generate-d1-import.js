#!/usr/bin/env node

/**
 * Generate D1-compatible import SQL from exported Supabase data
 */

import fs from 'fs';
import path from 'path';

// Read the exported data
const dataPath = 'migration-data/user-data-export.json';
if (!fs.existsSync(dataPath)) {
  console.error('❌ No exported data found. Run migrate-with-auth.js first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Tables that exist in D1 (based on our check)
const d1Tables = [
  'users',
  'babies',
  'feedings', 
  'diaper_changes',
  'sleep_sessions',
  'solid_foods'
];

console.log('📝 Generating D1-compatible import SQL...\n');

let sql = `-- D1-Compatible Data Import
-- Generated: ${new Date().toISOString()}
-- Only importing tables that exist in D1

`;

const userId = data.users[0].id;

// Clear existing data
sql += `-- Clear existing data for user ${userId}\n`;
for (const table of d1Tables.reverse()) { // Reverse order for deletions
  if (table === 'users') continue; // Delete users last
  sql += `DELETE FROM ${table} WHERE user_id = '${userId}';\n`;
}
sql += `DELETE FROM users WHERE id = '${userId}';\n\n`;

// Import data in correct order
const importOrder = ['users', 'babies', 'feedings', 'diaper_changes', 'sleep_sessions', 'solid_foods'];

for (const table of importOrder) {
  const records = data[table] || [];
  if (records.length === 0) continue;

  console.log(`   Processing ${table}: ${records.length} records`);
  sql += `-- Import ${table} (${records.length} records)\n`;
  
  for (const record of records) {
    let columns = Object.keys(record);
    let values = columns.map(col => {
      const val = record[col];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'boolean') return val ? '1' : '0';
      if (val instanceof Date) return `'${val.toISOString()}'`;
      return val;
    });

    // Special handling for users table - add required password_hash
    if (table === 'users') {
      columns.push('password_hash');
      values.push("'migrated_user'");
    }

    sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
  }
  
  sql += '\n';
}

sql += '-- Import complete!\n';

// Save the SQL
const sqlPath = 'migration-data/import-d1-compatible.sql';
fs.writeFileSync(sqlPath, sql);

console.log(`✅ D1-compatible SQL saved to ${sqlPath}`);
console.log('\n🚀 To import:');
console.log('   cd cloudflare-workers');
console.log('   wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-d1-compatible.sql');

// Generate summary
let summary = `# D1 Migration Summary

## Data to Import

| Table | Records | Status |
|-------|---------|--------|
`;

let totalRecords = 0;
for (const table of importOrder) {
  const records = data[table] || [];
  const count = records.length;
  totalRecords += count;
  const status = count > 0 ? '✅ Ready' : '⚪ Empty';
  summary += `| ${table} | ${count} | ${status} |\n`;
}

summary += `
**Total Records**: ${totalRecords}

## Skipped Tables (Not in D1)
- baby_settings
- pumping_sessions  
- user_preferences

These tables don't exist in your D1 database schema, so they'll be skipped.
You can add them later if needed.

## Import Command
\`\`\`bash
cd cloudflare-workers
wrangler d1 execute baby-tracker-db --remote --file=../migration-data/import-d1-compatible.sql
\`\`\`
`;

fs.writeFileSync('migration-data/d1-migration-summary.md', summary);
console.log('✅ Summary saved to migration-data/d1-migration-summary.md');