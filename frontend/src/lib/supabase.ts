import { createClient } from '@supabase/supabase-js'
import { authStorage } from './authStorage'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

const storageNamespace = new URL(supabaseUrl).hostname.split('.')[0] || 'placeholder'
export const supabaseStorageKey = `sb-${storageNamespace}-auth-token`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
    storageKey: supabaseStorageKey,
  },
})
