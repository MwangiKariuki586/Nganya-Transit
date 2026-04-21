import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { getBrowserSupabaseEnv } from '@/shared/supabase/env'

const { url, anonKey } = getBrowserSupabaseEnv()

export const supabase = createClient<Database>(url, anonKey)
