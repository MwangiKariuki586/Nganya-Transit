import type { Database } from '@/lib/database.types'

export type NganyaRegistrationRequestStatus =
  Database['public']['Tables']['nganya_registration_requests']['Row']['status']
