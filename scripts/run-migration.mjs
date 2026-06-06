#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const migration = `
-- Add admin termination tracking to live_sessions
ALTER TABLE live_sessions
ADD COLUMN IF NOT EXISTS admin_terminated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_termination_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN live_sessions.admin_terminated IS 'Flag indicating if session was terminated by admin';
COMMENT ON COLUMN live_sessions.admin_termination_reason IS 'Reason provided by admin for termination';

-- Create index for admin audit queries
CREATE INDEX IF NOT EXISTS idx_live_sessions_admin_terminated 
ON live_sessions(admin_terminated, ended_at DESC) 
WHERE admin_terminated = TRUE;
`

console.log('🚀 Running migration...\n')
console.log(migration)
console.log('\n')

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql: migration })
  
  if (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
  
  console.log('✅ Migration completed successfully!')
  console.log('\nColumns added:')
  console.log('  - admin_terminated (BOOLEAN)')
  console.log('  - admin_termination_reason (TEXT)')
  console.log('  - idx_live_sessions_admin_terminated (INDEX)')
  
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
}
