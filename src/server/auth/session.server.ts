export interface ServerSessionSnapshot {
  userId: string | null
  role: string | null
}

export async function getServerSessionSnapshot(): Promise<ServerSessionSnapshot> {
  // Incremental scaffold. Wire to SSR cookies + server Supabase client in a follow-up PR.
  return {
    userId: null,
    role: null,
  }
}
