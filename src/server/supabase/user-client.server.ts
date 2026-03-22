import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function getSupabaseUserEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  if (!url || !anonKey) {
    throw new Error('Missing Supabase client environment for user-scoped server operations.')
  }

  return { url, anonKey }
}

export function getUserScopedSupabaseClient(accessToken: string) {
  const { url, anonKey } = getSupabaseUserEnv()

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
