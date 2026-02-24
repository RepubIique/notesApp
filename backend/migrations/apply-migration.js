import { supabase } from '../config/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration(migrationFile) {
  try {
    console.log(`Applying migration: ${migrationFile}`);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, migrationFile);
    const sql = await fs.readFile(sqlPath, 'utf-8');
    
    // Execute the SQL using Supabase's RPC or direct query
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // This script is a helper - actual migration should be run via Supabase SQL Editor
    
    console.log('\nSQL to execute:');
    console.log('================');
    console.log(sql);
    console.log('================\n');
    
    console.log('⚠️  Please run this SQL in your Supabase SQL Editor:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the SQL above');
    console.log('5. Click "Run"');
    
  } catch (error) {
    console.error('Error reading migration file:', error);
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node apply-migration.js <migration-file.sql>');
  console.error('Example: node apply-migration.js 009_create_translations_table.sql');
  process.exit(1);
}

applyMigration(migrationFile);
