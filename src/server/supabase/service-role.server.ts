import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getServerSupabaseServiceRoleEnv } from '@/shared/supabase/env'

export function getServiceRoleSupabaseClient() {
  const { url, serviceRoleKey } = getServerSupabaseServiceRoleEnv()

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
