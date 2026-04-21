import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getServerSupabaseUserEnv } from '@/shared/supabase/env'

function getSupabaseUserEnv() {
  return getServerSupabaseUserEnv()
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
