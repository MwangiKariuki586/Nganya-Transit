import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Ensure we have the environment variables properly set in the React/Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
