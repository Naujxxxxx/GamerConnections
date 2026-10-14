import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'gc_auth_session'
  },
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'gamerconnections@2.0.0'
    }
  }
})

export const from = <T extends keyof Database['public']['Tables']>(
  table: T
) => supabase.from(table)

export function createRealtimeChannel(name: string) {
  return supabase.channel(name, {
    config: {
      broadcast: { ack: true },
      presence: { key: '' }
    }
  })
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}